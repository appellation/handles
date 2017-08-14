import EventEmitter = require('events');
import CommandHandler from './CommandHandler';
import CommandLoader from './CommandLoader';
import CommandMessage from './CommandMessage';
import BaseError from './errors/BaseError';
import Validator from './middleware/Validator';
import Response from './Response';

import { ICommand } from './interfaces/ICommand';
import { IConfig } from './interfaces/IConfig';

import { Message } from 'discord.js';

/**
 * The starting point for using handles.
 *
 * ```js
 * const discord = require('discord.js');
 * const handles = require('discord-handles');
 *
 * const client = new discord.Client();
 * const handler = new handles.Client();
 *
 * client.on('message', handler.handle);
 * client.login('token');
 * ```
 */
export default class HandlesClient extends EventEmitter {

  public config: IConfig;
  public readonly loader: CommandLoader;
  public readonly handler: CommandHandler;
  public readonly ignore: string[] = [];

  constructor(config: IConfig) {
    super();

    this.config = Object.assign({
      Response,
      directory: './commands',
      prefixes: new Set(),
      silent: true,
    }, config);

    this.loader = new CommandLoader(this);
    this.handler = new CommandHandler(this);

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
   *
   * ```js
   * const client = new discord.Client();
   * const handler = new handles.Client();
   *
   * client.on('message', handler.handle);
   *
   * // or
   *
   * const client = new discord.Client();
   * const handler = new handles.Client();
   *
   * client.on('message', message => {
   *   // do other stuff
   *   handler.handle(message);
   * });
   * ```
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

  public on(
    event: 'commandStarted' | 'middlewareStarted' | 'middlewareFinished',
    listener: (cmd: CommandMessage) => void): this;

  public on(event: 'middlewareFailed' | 'commandError', listener:
    ({ command, error }: { command: CommandMessage, error: Error | BaseError }) => void): this;

  public on(event: 'commandFinished', listener:
    ({ command, result }: { command: CommandMessage, result: any }) => void): this;

  public on(event: 'commandFailed', listener:
    ({ command, error }: { command: CommandMessage, error: BaseError }) => void): this;

  public on(event: 'commandsLoaded', listener:
    ({ commands, failed }: { commands: Map<string, ICommand>, failed: string[] }) => void): this;

  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}
