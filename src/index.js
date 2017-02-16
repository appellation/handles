const remit = require('re-emitter');
const {EventEmitter} = require('events');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');
const ValidationProcessor = require('./ValidationProcessor');

class Handles extends EventEmitter {

    constructor(config) {
        super();

        this.loader = new CommandLoader(config);
        remit(this.loader, this, [ 'commandsLoaded' ]);
    }

    /**
     * @param {Message} msg
     * @param {String} [body]
     * @return {Promise.<CommandMessage>}
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

/**
 * @param {Config} config
 */
module.exports = Handles;