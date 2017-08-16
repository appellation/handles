import EventEmitter = require('events');
import BaseError from '../errors/BaseError';
import Validator from '../middleware/Validator';
import CommandMessage from '../structures/CommandMessage';
import Response from '../structures/Response';

import CommandHandler from './CommandHandler';
import CommandRegistry from './CommandRegistry';

import { ICommand } from '../interfaces/ICommand';
import { IConfig } from '../interfaces/IConfig';
import { IMiddleware } from '../interfaces/IMiddleware';

import { Client, Message } from 'discord.js';

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
  public readonly registry: CommandRegistry;
  public readonly handler: CommandHandler;

  public Response: typeof Response;
  public argsSuffix?: string;
  public readonly prefixes: Set<string>;

  constructor(client: Client, config: IConfig = {}) {
    super();

    this.Response = Response;
    this.argsSuffix = config.argsSuffix;
    this.prefixes = config.prefixes || new Set();

    this.registry = new CommandRegistry(this, config);
    this.handler = new CommandHandler(this, config);

    client.once('ready', () => this.prefixes.add(`<@${client.user.id}>`).add(`<@!${client.user.id}>`));

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
      this.emit('commandUnknown', msg);
      return null;
    }

    return this.handler.exec(cmd);
  }

  public on(
    event: 'commandStarted' | 'commandUnknown',
    listener: (cmd: CommandMessage) => void): this;

  public on(event: 'commandError', listener:
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
