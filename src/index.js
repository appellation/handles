const remit = require('re-emitter');
const { EventEmitter } = require('events');
const CommandLoader = require('./CommandLoader');
const CommandMessage = require('./CommandMessage');
const CommandHandler = require('./CommandHandler');
const Prompter = require('./Prompter');
const Response = require('./Response');
const Validator = require('./Validator');
const Argument = require('./Argument');

/**
 * @typedef {Function} Command - Structure of exported commands.  Can also be a single function.
 * @property {Iterable<Trigger>|Trigger} [triggers] - Defaults to the file name.
 * @property {boolean} [disabled=false] - Whether the command is globally disabled
 * @property {CommandExecutor} exec - The command function to execute.
 * @property {function} [middleware] - A generator function that yields middleware.  Middleware
 * is an object with a property `run` which is a function accepting the `CommandMessage` as its
 * only parameter.
 *
 * @example
 * class SomeCommand {
 *   exec(command) {
 *     return command.response.send('dank memes');
 *   }
 *   * middleware(command) {
 *     yield new Argument('meme') // this arg will be accessible as `command.args.meme`
 *        .setPrompt('Please provide a thing.')
 *        .setRePrompt('The thing you provided was invalid.')
 *        .setResolver(content => content === 'thing' ? { stuff: 'is what I want to be in the args property' } : null);
 *   }
 * }
 *
 * module.exports = SomeCommand;
 */

/**
 * @typedef {string|RegExp} Trigger - A command trigger.
 */

/**
 * @typedef {object} Config - Structure of command handler options.
 * @property {Set<string>} [prefixes] - Prefixes to use, if any.  Unneeded when providing a `MessageValidator`.
 * @property {string} [argsSuffix] - A global suffix to use for argument prompting. Can be overwritten individually.
 * @property {string} [userID] - If provided, will add mentions into the prefixes.
 * @property {string} [directory='./commands'] - Where your command files are located, relative to the current working directory.
 * @property {MessageValidator} [validator] - Valid command forms.
 * @property {Object} [commandParams] - Extra parameters to pass to the command constructor.
 * @property {Response} [Response] - A custom response class (should extend the built-in class).
 */

/**
 * @typedef {function} MessageValidator - Function to determine if a message contains a command.
 * @param {Message} message
 * @returns {ResolvedContent}
 *
 * @example
 * const handler = new handles.Client({
 *   validator: (msg) => {
 *     // this will validate any message in a DM and/or starting with `memes` as a command.
 *     const prefix = /^memes/;
 *     if(prefix.test(msg.content) || msg.channel.type === 'dm') return msg.content.replace(prefix, '');
 *   }
 * });
 */

/**
 * @typedef {function} CommandExecutor - Structure of any command execution functions.
 * @param {CommandMessage} message
 * @returns {*} - The result of the command.
 */

/**
 * @extends EventEmitter
 * @example
 * const discord = require('discord.js');
 * const handles = require('discord-handles');
 *
 * const client = new discord.Client();
 * const handler = new handles.Client();
 *
 * client.on('message', handler.handle);
 * client.login('token');
 */
class HandlesClient extends EventEmitter {

  /**
   * @param {Config} config - Configuration options for this handler.
   * @return {function} - Command handler.
   * @fires CommandLoader#commandsLoaded
   */
  constructor(config) {
    super();

    this.config = Object.assign({
      prefixes: new Set(),
      directory: './commands',
      Response,
      Validator
    }, config);

    if (this.config.userID) this.config.prefixes.add(`<@${this.config.userID}>`).add(`<@!${this.config.userID}>`);

    /**
     * @type {CommandLoader}
     */
    this.loader = new CommandLoader(this.config);
    remit(this.loader, this, [ 'commandsLoaded' ]);

    /**
     * @type {CommandHandler}
     */
    this.handler = new CommandHandler(this);

    this.handle = this.handle.bind(this);
  }

  /**
   * Handle a message as a command.
   * @param {Message} msg - The message to handle as a command.
   * @param {string} [body] - An optional, separate command body.
   * @return {Promise}
   *
   * @fires HandlesClient#commandUnknown
   * @fires CommandMessage#middlewareStarted
   * @fires CommandMessage#middlewareFinished
   * @fires CommandMessage#commandStarted
   * @fires CommandMessage#commandFinished
   * @fires CommandMessage#commandFailed
   * @fires CommandMessage#commandError
   *
   * @example
   * const client = new discord.Client();
   * const handler = new handles.Client();
   *
   * client.on('message', handler.handle);
   *
   * @example
   * const client = new discord.Client();
   * const handler = new handles.Client();
   *
   * client.on('message', message => {
   *   // do other stuff
   *   handler.handle(message);
   * });
   */
  handle(msg) {
    if (msg.webhookID || msg.system || msg.author.bot || (!msg.client.user.bot && msg.author.id !== msg.client.user.id)) return;

    const cmd = this.handler.resolve(msg);
    if (!cmd) {
      /**
       * Fired when the command could not be resolved.
       * @event HandlesClient#commandUnknown
       * @type {Message}
       */
      this.emit('commandUnknown', msg);
      return;
    }

    remit(cmd, this, [
      'argumentsLoaded',
      'argumentsError',
      'commandInvalid',
      'commandStarted',
      'commandFinished',
      'commandFailed'
    ]);

    return CommandHandler.exec(cmd);
  }
}

module.exports = {
  CommandLoader,
  CommandMessage,
  Validator,
  CommandHandler,
  Prompter,
  Response,
  Argument,
  Client: HandlesClient
};
