const remit = require('re-emitter');
const {EventEmitter} = require('events');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');
const CommandResolver = require('./CommandResolver');
const CommandExecutor = require('./CommandExecutor');
const ValidationProcessor = require('./ValidationProcessor');

/**
 * @fires CommandMessage#notACommand
 * @fires CommandMessage#invalidCommand
 * @fires CommandMessage#commandStarted
 * @fires CommandMessage#commandFinished
 * @fires CommandMessage#commandFailed
 * @fires CommandMessage#error
 * @fires CommandLoader#commandsLoaded
 *
 * @param {Config} config - Configuration options for this handler.
 * @extends EventEmitter
 * @return {Function} - Command handler.
 *
 * @example
 * const Discord = require('discord.js');
 * const Handles = require('discord-handles');
 *
 * const client = new Discord.Client();
 * const handler = new Handles();
 *
 * client.on('message', handler.handle);
 * client.login('token');
 *
 * @constructor
 */
class Handles extends EventEmitter {

    constructor(config) {
        super();

        this.config = Object.assign({}, {
            prefixes: [],
            directory: './commands',
        }, config);

        if(this.config.userID) this.config.prefixes.push(`<@${this.config.userID}>`, `<@!${this.config.userID}>`);

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
        return CommandExecutor(cmd);
    }
}

Object.assign(Handles, {
    CommandLoader,
    CommandMessage,
    ValidationProcessor
});

module.exports = Handles;
