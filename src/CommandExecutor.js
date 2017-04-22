/**
 * @param {CommandMessage} msg The command message to execute.
 */
module.exports = (msg) => {
    msg.validate().then(validator => {
        if(!validator.valid) {
            msg.emit('commandInvalid', { message: msg, validator });
        } else {
            msg.resolveArgs().catch(e => {
                msg.emit('argumentsError', { message: msg, error: e });
            }).then(() => {
                msg.emit('commandStarted', msg);
                if(typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');
                return Promise.resolve(msg.command.exec(msg));
            }).then(result => {
                msg.emit('commandFinished', { message: msg, result });
            }, e => {
                msg.emit('commandFailed', { message: msg, error: e });
            });
        }
    });
};
