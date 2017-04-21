/**
 * @param {CommandMessage} msg The command message to execute.
 */
module.exports = (msg) => {
    msg.resolveArgs().then(() => {
        msg.emit('commandStarted', msg);
        return Promise.resolve(msg.command.exec(msg));
    }, e => {
        msg.emit('argumentsError', { message: msg, error: e });
    }).then(result => {
        msg.emit('commandFinished', { message: msg, result });
    }, e => {
        msg.emit('commandFailed', { message: msg, error: e });
    });
};
