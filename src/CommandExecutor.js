module.exports = (commandMessage) => {
    const msg = commandMessage;
    msg.resolveArgs().then(() => {
        msg.emit('commandStarted', msg);
        return msg.command.exec(msg);
    }, e => {
        msg.emit('argumentError', e);
    }).then(result => {
        msg.emit('commandFinished', { message: msg, result });
    }).catch(e => {
        msg.emit('commandFailed', { message: msg, error: e });
    });
};
