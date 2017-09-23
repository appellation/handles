import EventEmitter = require('events');
import BaseError from '../errors/BaseError';
import Validator from '../middleware/Validator';

import Command from '../structures/Command';

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

  public argsSuffix?: string;

  constructor(client: Client, config: IConfig = {}) {
    super();

    this.argsSuffix = config.argsSuffix;

    this.registry = new CommandRegistry(this, config);
    this.handler = new CommandHandler(this, config);

    this.handle = this.handle.bind(this);

    client.once('ready', () => this.handler.prefixes.add(`<@${client.user.id}>`).add(`<@!${client.user.id}>`));
    client.on('message', this.handle);
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

  public on(event: 'commandsLoaded', listener:
    ({ commands, failed, time }: { commands: Map<string, Command>, failed: string[], time: number }) => void): this;

  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}
