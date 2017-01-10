
const CommandLoader = require('./util/CommandLoader');
const CommandHandler = require('./util/CommandMessage');

module.exports = config => {
    const loader = new CommandLoader(config);
    return (msg, body) => {
        if(msg) {
            const handler = new CommandHandler(loader, msg, body);
            return handler.handle();
        }   else {
            return loader;
        }
    };
};