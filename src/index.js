const remit = require('re-emitter');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');

module.exports = config => {
    const loader = new CommandLoader(config);
    let handler = (msg, body) => {
        if(msg) {
            const commandMessage = new CommandMessage(loader, msg, body);
            remit(commandMessage, loader, [
                'notACommand',
                'invalidCommand',
                'commandStarted',
                'commandFinished',
                'commandFailed',
                'error'
            ]);

            return commandMessage.handle();
        }   else {
            return loader;
        }
    };
    handler.loader = loader;
    return handler;
};