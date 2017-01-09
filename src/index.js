/**
 * Created by Will on 12/15/2016.
 */
const CommandHandler = require('./util/CommandLoader');

module.exports = config => {
    const handler = new CommandHandler(config);
    return (msg, body) => (msg) ? handler.handle(msg, body) : handler;
};