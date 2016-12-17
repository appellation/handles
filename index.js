/**
 * Created by Will on 12/15/2016.
 */
const CommandHandler = require('./command');

module.exports = config => {
    const handler = new CommandHandler(config);
    return (msg, body) => (msg) ? handler.handle(msg, body) : handler;
};