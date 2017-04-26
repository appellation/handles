/**
 * Executes a command given a command message.
 * @param {CommandMessage} msg - The command message to execute.
 * @throws {Error} - If the command executor is not found.
 */
module.exports = (msg) => {
    msg.validate().then(validator => {
        if(!validator.valid) {
            if(validator.respond) msg.response.error(validator.reason);

            /**
             * @event CommandMessage#commandInvalid
             * @type {Object}
             * @property {CommandMessage} message
             * @property {Validator} validator
             */
            msg.emit('commandInvalid', { message: msg, validator });
        } else {
            msg.resolveArgs().then(() => {

                /**
                 * @event CommandMessage#commandStarted
                 * @type {CommandMessage}
                 */
                msg.emit('commandStarted', msg);
                if(typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');
                return Promise.resolve(msg.command.exec(msg)).then(result => {

                    /**
                     * @event CommandMessage#commandFinished
                     * @type {Object}
                     * @property {CommandMessage} message
                     * @property {*} result
                     */
                    msg.emit('commandFinished', { message: msg, result });
                }, e => {
                    /**
                     * @event CommandMessage#commandFailed
                     * @type {Object}
                     * @property {CommandMessage} message
                     * @property {*} error
                     */
                    msg.emit('commandFailed', { message: msg, error: e });
                });
            }, e => {

                /**
                 * @event CommandMessage#argumentsError
                 * @type {Object}
                 * @property {CommandMessage} message
                 * @property {*} error
                 */
                msg.emit('argumentsError', { message: msg, error: e });
            });
        }
    });
};
