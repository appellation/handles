
const CommandLoader = require('./util/CommandLoader');
const CommandMessage = require('./util/CommandMessage');

module.exports = config => {
    const loader = new CommandLoader(config);
    return (msg, body) => {
        if(msg) {
            const commandMessage = new CommandMessage(loader, msg, body);
            return {
                commandMessage,
                result: commandMessage.handle()
            };
        }   else {
            return loader;
        }
    };
};