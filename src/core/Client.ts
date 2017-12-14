import EventEmitter = require('events');
import BaseError from '../errors/BaseError';
import Validator from '../middleware/Validator';

import Command from '../structures/Command';

import CommandHandler, { CommandResolver } from './CommandHandler';
import CommandRegistry from './CommandRegistry';

import { Client, Message } from 'discord.js';

export interface IConfig {
  /**
   * Command prefixes (will not be used if a [[validator]] is provided).
   */
  prefixes?: Iterable<string>;

  /**
   * A global setting for configuring the argument suffix.
   */
  argsSuffix?: string;

  /**
   * Directory to load commands from. Default to `./commands` relative to the cwd.
   */
  directory?: string;

  /**
   * This will get run on every message. Use to manually determine whether a message is a command.
   */
  validator?: CommandResolver;

  /**
   * By default, Handles will automatically add any event listeners it needs in order to process commands. Set this to
   * false if you want to add listeners yourself.
   */
  listen?: boolean;
}

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
    this.handler = new CommandHandler(this);
    if (config.prefixes) for (const pref of config.prefixes) this.handler.prefixes.add(pref);

    this.handle = this.handle.bind(this);
    client.once('ready', () => this.handler.prefixes.add(new RegExp(`<@!?${client.user.id}>`)));
    if (!('listen' in config) || config.listen) {
      client.on('message', this.handle);
      client.on('messageUpdate', (o, n) => this.handle(n));
    }
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
