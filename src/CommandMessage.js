const EventEmitter = require('events');
const Prompter = require('./Prompter');
const Argument = require('./Argument');
const ArgumentError = require('./errors/ArgumentError');

/**
 * A message to be processed as a command.
 * @extends EventEmitter
 */
class CommandMessage extends EventEmitter {

  /**
   * @param {Object} data
   * @param {Command} data.command
   * @param {Trigger} data.trigger
   * @param {Message} data.message
   * @param {string} data.body
   */
  constructor(client, { command, trigger, message, body } = {}) {
    super();

    /**
     * The handles client.
     * @type {HandlesClient}
     */
    this.handles = client;

    /**
     * The command loader to use for commands.
     * @type {Command}
     */
    this.command = command;

    /**
     * The trigger that triggered this command.
     * @type {Trigger}
     */
    this.trigger = trigger;

    /**
     * The message that triggered this command.
     * @type {Message}
     */
    this.message = message;

    /**
     * The body of the command (without prefix or command), as provided in the original message.
     * @type {string}
     */
    this.body = body;

    /**
     * The config.
     * @type {Config}
     */
    this.config = client.config;

    /**
     * The command arguments as set by arguments in executor.
     * @see ArgumentResolver
     * @type {?Object}
     */
    this.args = null;

    /**
     * The response object for this command.
     * @type {Response}
     */
    this.response = new (this.config.Response)(this.message);
  }

  /**
   * The Discord.js client.
   * @type {Client}
   * @readonly
   */
  get client() {
    return this.message.client;
  }

  /**
   * The guild this command is in.
   * @type {?Guild}
   * @readonly
   */
  get guild() {
    return this.message.guild;
  }

  /**
   * The channel this command is in.
   * @type {TextChannel}
   * @readonly
   */
  get channel() {
    return this.message.channel;
  }
}

module.exports = CommandMessage;
