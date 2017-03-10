const remit = require('re-emitter');
const {EventEmitter} = require('events');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');
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

        /**
         * @type {CommandLoader}
         */
        this.loader = new CommandLoader(config);
        remit(this.loader, this, [ 'commandsLoaded' ]);

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
    handle(msg, body) {
        const commandMessage = new CommandMessage(this.loader, msg, body);
        remit(commandMessage, this, [
            'notACommand',
            'invalidCommand',
            'commandStarted',
            'commandFinished',
            'commandFailed',
            'error',
            'warn'
        ]);

        return commandMessage.handle();
    }
}

Object.assign(Handles, {
    CommandLoader,
    CommandMessage,
    ValidationProcessor
});

module.exports = Handles;