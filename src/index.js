const remit = require('re-emitter');
const { EventEmitter } = require('events');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');
const CommandResolver = require('./CommandResolver');
const CommandExecutor = require('./CommandExecutor');
const Response = require('./Response');
const Validator = require('./Validator');

/**
 * @typedef {Object} Command - Structure of exported commands.  Can also be a single function.
 * @property {Iterable<Trigger>|Trigger} [triggers] - Defaults to the file name.
 * @property {boolean} [disabled=false] - Whether the command is globally disabled
 * @property {CommandExecutor} exec - The command function to execute.
 * @property {CommandValidator} [validate] - Function to call to determine whether the command is valid.
 *
 * @example
 * exports.func = r => r.send('lmao');
 * exports.triggers = /^ay+$/i;
 *
 * @example
 * exports.func = r => {};
 * exports.disabled = true;
 *
 * @example
 * class SomeCommand {
 *   exec(command) {
 *     return command.response.send('dank memes');
 *   }
 * }
 *
 * module.exports = new SomeCommand();
 */

/**
 * @typedef {String|RegExp} Trigger - A command trigger.
 */

/**
 * @typedef {Object} Config - Structure of command handler options.
 * @property {Set<String>} [prefixes] - Prefixes to use, if any (automatically includes mentions).
 * @property {String} [directory='./commands'] - Where your command files are located, relative to the current working directory.
 * @property {MessageValidator} [validator] - Valid command forms (defaults to prefixed).
 * @property {Validator} [Validator] - A reference to a validation processor that extends the internal one (uninstantiated).
 */

/**
 * @typedef {Function} MessageValidator - Function to determine if a message contains a command.
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
 * @typedef {Function} CommandValidator - Validates whether a command is valid to be executed.
 * @param {Validator} validator
 * @param {CommandMessage} command
 * @returns {*} - Evaluated for truthiness when determining validity.
 *
 * @example
 * exports.validator = (val, msg) => {
 *   return val.applyValid(msg.args.length, 'Arguments are required to use this command.');
 * }
 */

/**
 * @typedef {Function} CommandExecutor - Structure of any command execution functions.
 * @param {Response} response
 * @param {Message} message
 * @param {Array<String>} args
 * @param {CommandMessage} command
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
     * @return {Function} - Command handler.
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
     * @param {String} [body] - An optional, separate command body.
     * @return {Promise.<CommandMessage>}
     *
     * @fires CommandMessage#notACommand
     * @fires CommandMessage#invalidCommand
     * @fires CommandMessage#commandStarted
     * @fires CommandMessage#commandFinished
     * @fires CommandMessage#commandFailed
     * @fires CommandMessage#error
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
        if(!cmd) return;

        remit(cmd, this, [
            'argumentsLoaded',
            'argumentsError',
            'commandStarted',
            'commandFinished',
            'commandFailed'
        ]);

        return CommandExecutor(cmd);
    }
}

Object.assign(Handles, {
    CommandLoader,
    CommandMessage,
    Validator
});

module.exports = Handles;
