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
 * @param {Config} config
 * @extends EventEmitter
 * @constructor
 */
class Handles extends EventEmitter {

    constructor(config) {
        super();

        this.loader = new CommandLoader(config);
        remit(this.loader, this, [ 'commandsLoaded' ]);
    }

    /**
     * Handle a message.
     *
     * @param {Message} msg
     * @param {String} [body]
     * @return {Promise.<CommandMessage>}
     *
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