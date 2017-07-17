import { EventEmitter } from 'events';
import CommandHandler from './CommandHandler';
import CommandLoader from './CommandLoader';
import CommandMessage from './CommandMessage';
import Response from './Response';
import Validator from './Validator';

import { IConfig } from './interfaces/IConfig';

import { Message } from 'discord.js';

/**
 * @typedef {Function} Command - Structure of exported commands.
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
 * @property {string} [directory='./commands'] - Where your command files are located, relative to the
 * current working directory.
 * @property {MessageValidator} [validator] - Valid command forms.
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
export default class HandlesClient extends EventEmitter {

  public config: IConfig;
  public readonly loader: CommandLoader = new CommandLoader(this);
  public readonly handler: CommandHandler = new CommandHandler(this);
  public readonly ignore: string[] = [];

  /**
   * @param {Config} config - Configuration options for this handler.
   * @return {function} - Command handler.
   * @fires HandlesClient#commandsLoaded
   */
  constructor(config: IConfig) {
    super();

    this.config = Object.assign({
      Response,
      Validator,
      directory: './commands',
      prefixes: new Set(),
    }, config);

    if (this.config.userID) this.config.prefixes.add(`<@${this.config.userID}>`).add(`<@!${this.config.userID}>`);

    this.on('middlewareStarted', (cmd: CommandMessage) => {
      this.ignore.push(cmd.session);
    });

    this.on('middlewareFinished', (cmd: CommandMessage) => {
      if (!this.ignore.includes(cmd.session)) return;
      this.ignore.splice(this.ignore.indexOf(cmd.session), 1);
    });

    this.on('middlewareFailed', ({ command: cmd }: { command: CommandMessage }) => {
      if (!this.ignore.includes(cmd.session)) return;
      this.ignore.splice(this.ignore.indexOf(cmd.session), 1);
    });

    this.handle = this.handle.bind(this);
  }

  /**
   * Handle a message as a command.
   * @param {Message} msg - The message to handle as a command.
   * @param {string} [body] - An optional, separate command body.
   * @return {?Promise}
   *
   * @fires HandlesClient#commandUnknown
   * @fires HandlesClient#middlewareStarted
   * @fires HandlesClient#middlewareFinished
   * @fires HandlesClient#commandStarted
   * @fires HandlesClient#commandFinished
   * @fires HandlesClient#commandFailed
   * @fires HandlesClient#commandError
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
  public handle(msg: Message) {
    if (
      msg.webhookID ||
      msg.system ||
      msg.author.bot ||
      (!msg.client.user.bot && msg.author.id !== msg.client.user.id)
    ) return null;

    const cmd = this.handler.resolve(msg);
    if (!cmd) {
      /**
       * Fired when the command could not be resolved.
       * @event HandlesClient#commandUnknown
       * @type {Message}
       */
      this.emit('commandUnknown', msg);
      return null;
    }

    if (this.ignore.includes(cmd.session)) return null;

    return this.handler.exec(cmd);
  }
}
