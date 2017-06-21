const CommandMessage = require('./CommandMessage');
const CommandError = require('./errors/CommandError');
const ArgumentError = require('./errors/ArgumentError');

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
        if (message.content.startswith(p))
          return message.content.substring(p.length).trim();
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
   * @param {string} [body] - Command text if not the message content.
   */
  resolve(message, body) {
    const content = this._resolveContent(message, body);
    if (typeof content !== 'string' || !content) return null;

    const [, command, commandContent] = content.match(this._regex);
    if (this.loader.commands.has(command))
      return new CommandMessage(this.client, {
        command: this.loader.commands.get(command),
        message,
        body: commandContent.trim(),
        config: this.config
      });

    for (const [trigger, command] of this.loader.commands) {
      let body;
      if (trigger instanceof RegExp) {
        if (trigger.test(content)) body = content.match(trigger)[0].trim();
      } else if (typeof trigger === 'string') {
        if ((/[A-Z]/.test(trigger) ? content : content.toLowerCase()).startsWith(trigger)) {
          body = content.substring(0, trigger.length).trim();
        }
      }

      if (body) {
        return new CommandMessage(this.client, {
          command,
          message,
          body: content.substring(0, trigger.length).trim(),
          config: this.config
        });
      }
    }

    return null;
  }

  /**
   * Resolve the content of the command.
   * @param {Message} message
   * @param {string} [body=message.content]
   * @private
   */
  _resolveContent(message, body) {
    const content = body || message.content;
    if (this.config.validator && typeof this.config.validator === 'function')
      return this.config.validator(message);

    for (const pref of this.config.prefixes) if (content.startsWith(pref)) return content.substring(pref.length).trim();
    return null;
  }

  /**
   * Execute a command message.
   * @param {CommandMessage} msg
   */
  static exec(msg) {
    if (typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');

    msg.validate().then(validator => {
      if (!validator.valid) {
        if (validator.respond) msg.response.error(validator.reason);

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
  }
}

module.exports = CommandHandler;
