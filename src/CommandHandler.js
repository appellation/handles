const CommandMessage = require('./CommandMessage');
const BaseError = require('./errors/BaseError');

/**
 * Class for resolving a command from a message.
 */
class CommandHandler {

  /**
   * @param {HandlesClient}
   */
  constructor(handles) {
    /**
     * @type {HandlesClient}
     */
    this.client = handles;

    /**
     * @type {Config}
     */
    this.config = this.client.config;

    /**
     * @type {CommandLoader}
     */
    this.loader = this.client.loader;

    if (typeof this.config.validator !== 'function' && (!this.config.prefixes || !this.config.prefixes.size))
      throw new Error('Unable to validate commands: no validator or prefixes were provided.');

    /**
     * The validator function to determine if a command is valid.
     * @type {function}
     * @private
     */
    this._validator = this.config.validator || ((message) => {
      for (const p of this.config.prefixes)
        if (message.content.startsWith(p))
          return message.content.substring(p.length).trim();
      return null;
    });

    /**
     * The base regex for parsing command parts.
     * @type {RegExp}
     * @private
     */
    this._regex = /^([^\s]+)(.*)/;
  }

  /**
   * @param {Message} message - The message that could be a command.
   */
  resolve(message) {
    const content = this._validator(message);
    if (typeof content !== 'string' || !content) return null;

    const [, command, commandContent] = content.match(this._regex);
    const cmd = this.loader.commands.get(command);
    if (cmd) {
      return new CommandMessage(this.client, {
        command: cmd,
        message,
        body: commandContent.trim(),
        trigger: command
      });
    }

    for (const [trigger, command] of this.loader.commands) {
      let body = null;
      if (trigger instanceof RegExp) {
        if (trigger.test(content)) body = content.match(trigger)[0].trim();
      } else if (typeof trigger === 'string') {
        // if the trigger is lowercase, make the command case-insensitive
        if ((trigger.toLowerCase() === trigger ? content.toLowerCase() : content).startsWith(trigger)) {
          body = content.substring(trigger.length).trim();
        }
      }

      if (body !== null) {
        return new CommandMessage(this.client, {
          command,
          message,
          body,
          trigger
        });
      }
    }

    return null;
  }

  /**
   * Execute a command message.
   * @param {CommandMessage} msg
   * @returns {Promise}
   */
  exec(msg) {
    if (typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');

    return new Promise((resolve, reject) => {
      if (typeof msg.command.middleware === 'function') {

        /**
         * Fired when middleware is started.
         * @event HandlesClient#middlewareStarted
         * @type {CommandMessage}
         */
        this.client.emit('middlewareStarted', msg);

        const iterate = ((generator, value) => {
          const next = generator.next(value);
          if (next.done) {

            /**
             * Fired when middleware is done and has not errored.
             * @event HandlesClient#middlewareFinished
             * @type {CommandMessage}
             */
            this.client.emit('middlewareFinished', msg);
            resolve();
          } else {
            Promise.resolve(next.value.run(msg))
              .then(val => iterate(generator, val))
              .catch(err => {

                /**
                 * Fired when middleware has failed.  Emitted before {@link HandlesClient#commandFailed}.
                 * @event HandlesClient#middlewareFailed
                 * @type {Object}
                 * @property {CommandMessage} command
                 * @property {BaseError|Error|*} error
                 */
                this.client.emit('middlewareFailed', { command: msg, error: err });
                reject(err);
              });
          }
        })(msg.command.middleware(msg));
      } else {
        resolve();
      }
    }).then(() => {

      /**
       * @event HandlesClient#commandStarted
       * @type {CommandMessage}
       */
      this.client.emit('commandStarted', msg);
      return Promise.resolve(msg.command.exec(msg));
    }).then(result => {

      /**
       * @event HandlesClient#commandFinished
       * @type {Object}
       * @property {CommandMessage} command
       * @property {*} result The returned result of the command, resolved as a promise.
       */
      this.client.emit('commandFinished', { command: msg, result });
    }).catch(e => {
      /**
       * Emitted any time a command fails to execute due to middleware.  These are planned and are
       * the result of user interaction: eg. cancelled argument prompt or failed validation.
       * @event HandlesClient#commandFailed
       * @type {Object}
       * @property {CommandMessage} command
       * @property {BaseError} error
       */
      if (e instanceof BaseError) this.client.emit('commandFailed', { command: msg, error: e });

      /**
       * Emitted any time a command throws an error.  These are unplanned and represent an error
       * in your code.
       * @event HandlesClient#commandError
       * @type {Object}
       * @property {CommandMessage} command
       * @property {Error|*} error
       */
      else this.client.emit('commandError', { command: msg, error: e });
    });
  }
}

module.exports = CommandHandler;
