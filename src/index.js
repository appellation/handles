const remit = require('re-emitter');
const { EventEmitter } = require('events');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');
const CommandResolver = require('./CommandResolver');
const commandExecutor = require('./commandExecutor');
const Prompter = require('./Prompter');
const Response = require('./Response');
const Validator = require('./Validator');

/**
 * @typedef {Object} Command - Structure of exported commands.  Can also be a single function.
 * @property {Iterable<Trigger>|Trigger} [triggers] - Defaults to the file name.
 * @property {boolean} [disabled=false] - Whether the command is globally disabled
 * @property {CommandExecutor} exec - The command function to execute.
 * @property {CommandValidator} [validate] - Function to call to determine whether the command is valid.
 * @property {function} [arguments] - A generator function that yields command arguments (must be instances
 * of `Argument`).
 * @see {Argument}
 *
 * @example
 * exports.exec = r => r.send('lmao');
 * exports.triggers = /^ay+$/i;
 *
 * @example
 * exports.exec = r => {};
 * exports.disabled = true;
 *
 * @example
 * class SomeCommand {
 *   exec(command) {
 *     return command.response.send('dank memes');
 *   }
 *   * arguments(command) {
 *     yield new Argument('Please provide a thing.', 'The thing you provided was invalid.')
 *        .setResolver(content => content === 'thing' ? { this: 'is what I want to be in the args property' } : null);
 *   }
 * }
 *
 * module.exports = new SomeCommand();
 */

/**
 * @typedef {string|RegExp} Trigger - A command trigger.
 */

/**
 * @typedef {object} Config - Structure of command handler options.
 * @property {Set<string>} [prefixes] - Prefixes to use, if any.  Unneeded when providing a `MessageValidator`.
 * @property {string} [userID] - If provided, will add mentions into the prefixes.
 * @property {string} [directory='./commands'] - Where your command files are located, relative to the current working directory.
 * @property {MessageValidator} [validator] - Valid command forms (defaults to prefixed).
 * @property {Validator} [Validator] - A custom validator class (should extend the built-in class).
 * @property {Response} [Response] - A custom response class (should extend the built-in class).
 */

/**
 * @typedef {function} MessageValidator - Function to determine if a message contains a command.
 * @param {Message} message
 * @returns {ResolvedContent}
 *
 * @example
 * const handler = new Handles({
 *   validator: (msg) => {
 *     // this will validate any message in a DM and/or starting with `memes` as a command.
 *     const prefix = /^memes/;
 *     if(prefix.test(msg.content) || msg.channel.type === 'dm') return msg.content.replace(prefix, '');
 *   }
 * });
 */

/**
 * @typedef {function} CommandValidator - Validates whether a command is valid to be executed.
 * @param {Validator} validator
 * @param {CommandMessage} command
 * @returns {*} - Evaluated for truthiness when determining validity.
 *
 * @example
 * exports.validator = (val, cmd) => {
 *   return val.apply(cmd.message.author.id === 'my id', 'You gotta be a different person to run this command.');
 * }
 */

/**
 * @typedef {function} CommandExecutor - Structure of any command execution functions.
 * @param {CommandMessage} message
 * @returns {*} - The result of the command.
 */

/**
 * @extends EventEmitter
 * @example
 * const Discord = require('discord.js');
 * const Handles = require('discord-handles');
 *
 * const client = new Discord.Client();
 * const handler = new Handles();
 *
 * client.on('message', handler.handle);
 * client.login('token');
 */
class Handles extends EventEmitter {

    /**
     * @param {Config} config - Configuration options for this handler.
     * @return {function} - Command handler.
     * @fires CommandLoader#commandsLoaded
     */
    constructor(config) {
        super();

        this.config = Object.assign({
            prefixes: new Set(),
            directory: './commands',
            Response,
            Validator
        }, config);

        if(this.config.userID) this.config.prefixes.add(`<@${this.config.userID}>`).add(`<@!${this.config.userID}>`);

        /**
         * @type {CommandLoader}
         */
        this.loader = new CommandLoader(this.config);
        remit(this.loader, this, [ 'commandsLoaded' ]);

        this.resolver = new CommandResolver(this);

        this.handle = this.handle.bind(this);
    }

    /**
     * Handle a message as a command.
     * @param {Message} msg - The message to handle as a command.
     * @param {string} [body] - An optional, separate command body.
     * @return {Promise.<CommandMessage>}
     *
     * @fires Handles#commandUnknown
     * @fires CommandMessage#argumentsLoaded
     * @fires CommandMessage#argumentsError
     * @fires CommandMessage#commandInvalid
     * @fires CommandMessage#commandStarted
     * @fires CommandMessage#commandFinished
     * @fires CommandMessage#commandFailed
     *
     * @example
     * const client = new Discord.Client();
     * const handler = new Handles();
     *
     * client.on('message', handler.handle);
     *
     * @example
     * const client = new Discord.Client();
     * const handler = new Handles();
     *
     * client.on('message', message => {
     *   // do other stuff
     *   handler.handle(message);
     * });
     */
    handle(msg) {
        const cmd = this.resolver.resolve(msg);
        if(!cmd) {
            /**
             * Fired when the command could not be resolved.
             * @event Handles#commandUnknown
             * @type {Message}
             */
            this.emit('commandUnknown', msg);
            return;
        }

        remit(cmd, this, [
            'argumentsLoaded',
            'argumentsError',
            'commandInvalid',
            'commandStarted',
            'commandFinished',
            'commandFailed'
        ]);

        return commandExecutor(cmd);
    }
}

Object.assign(Handles, {
    CommandLoader,
    CommandMessage,
    Validator,
    commandExecutor,
    CommandResolver,
    Prompter,
    Response
});

module.exports = Handles;
