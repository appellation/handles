const ArgumentError = require('./errors/ArgumentError');
const CommandError = require('./errors/CommandError');

/**
 * Executes a command given a command command.
 * @param {CommandMessage} msg - The command command to execute.
 * @throws {Error} - If the command executor is not found.
 */
module.exports = (msg) => {
    msg.validate().then(validator => {
        if(!validator.valid) {
            if(validator.respond) msg.response.error(validator.reason);

            /**
             * @event CommandMessage#commandInvalid
             * @type {Object}
             * @property {CommandMessage} command
             * @property {Validator} validator
             */
            msg.emit('commandInvalid', { command: msg, validator });
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
                     * @property {CommandMessage} command
                     * @property {*} result
                     */
                    msg.emit('commandFinished', { command: msg, result });
                }, e => {
                    /**
                     * @event CommandMessage#commandFailed
                     * @type {Object}
                     * @property {CommandMessage} command
                     * @property {*} error
                     */
                    msg.emit('commandFailed', new CommandError(msg, e));
                    throw e;
                });
            }, e => {

                /**
                 * @event CommandMessage#argumentsError
                 * @type {Object}
                 * @property {CommandMessage} command
                 * @property {*} error
                 */
                if (e instanceof ArgumentError) msg.emit('argumentsError', { command: msg, error: e });
                else throw e;
            });
        }
    });
};
