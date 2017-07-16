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
  static exec(msg) {
    if (typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');

    return new Promise((resolve, reject) => {
      if (typeof msg.command.middleware === 'function') {

        /**
         * Fired when middleware is started.
         * @event CommandMessage#middlewareStarted
         * @type {CommandMessage}
         */
        msg.emit('middlewareStarted', msg);

        (function iterate(generator, value) {
          const next = generator.next(value);
          if (next.done) {

            /**
             * Fired when middleware is done.
             * @event CommandMessage#middlewareFinished
             * @type {CommandMessage}
             */
            msg.emit('middlewareFinished', msg);
            resolve();
          } else {
            Promise.resolve(next.value.run(msg))
              .then(val => iterate(generator, val))
              .catch(reject);
          }
        })(msg.command.middleware(msg));
      } else {
        resolve();
      }
    }).then(() => {

      /**
       * @event CommandMessage#commandStarted
       * @type {CommandMessage}
       */
      msg.emit('commandStarted', msg);
      return Promise.resolve(msg.command.exec(msg));
    }).then(result => {

      /**
       * @event CommandMessage#commandFinished
       * @type {Object}
       * @property {CommandMessage} command
       * @property {*} result The returned result of the command, resolved as a promise.
       */
      msg.emit('commandFinished', { command: msg, result });
    }).catch(e => {
      /**
       * @event CommandMessage#commandFailed
       * @type {Object}
       * @property {CommandMessage} command
       * @property {BaseError} error
       */
      if (e instanceof BaseError) msg.emit('commandFailed', { command: msg, error: e });

      /**
       * @event CommandMessage#commandError
       * @type {Object}
       * @property {CommandMessage} command
       * @property {Error|*} error
       */
      else msg.emit('commandError', { command: msg, error: e });
    });
  }
}

module.exports = CommandHandler;
