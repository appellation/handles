import EventEmitter = require('events');
import BaseError from '../errors/BaseError';
import Validator from '../middleware/Validator';

import Command from '../structures/Command';
import Response from '../structures/Response';

import CommandHandler from './CommandHandler';
import CommandRegistry from './CommandRegistry';

import { IConfig } from '../interfaces/Config';

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

    this.handle = this.handle.bind(this);

    client.once('ready', () => this.prefixes.add(`<@${client.user.id}>`).add(`<@!${client.user.id}>`));
    if (!('autoListen' in config) || !config.autoListen) client.on('message', this.handle);
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
  public async handle(msg: Message) {
    if (
      msg.webhookID ||
      msg.system ||
      msg.author.bot ||
      (!msg.client.user.bot && msg.author.id !== msg.client.user.id)
    ) return null;

    const cmd = await this.handler.resolve(msg);
    if (!cmd) {
      this.emit('commandUnknown', msg);
      return null;
    }

    return this.handler.exec(cmd);
  }

  public on(event: 'commandStarted' | 'commandUnknown', listener: (cmd: Command) => void): this;

  public on(event: 'commandError', listener:
    ({ command, error }: { command: Command, error: Error | BaseError }) => void): this;

  public on(event: 'commandFinished', listener:
    ({ command, result }: { command: Command, result: any }) => void): this;

  public on(event: 'commandFailed', listener:
    ({ command, error }: { command: Command, error: BaseError }) => void): this;

  public on(event: 'commandsLoaded', listener:
    ({ commands, failed, time }: { commands: Map<string, Command>, failed: string[], time: number }) => void): this;

  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}
