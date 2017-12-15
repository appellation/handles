import EventEmitter = require('events');
import Validator from '../middleware/Validator';

import Command, { Status } from '../structures/Command';
import CommandRegistry from './CommandRegistry';

import { Client, Message, Snowflake } from 'discord.js';

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
   * By default, Handles will automatically add any event listeners it needs in order to process commands. Set this to
   * false if you want to add listeners yourself.
   */
  listen?: boolean;
}

/**
 * Represents a custom command resolver. Return types:
 * - string: content of the message, excluding anything like prefixes. Use for custom guild prefixes, etc.
 * - Command: a specific command to run. Can be used for ratelimiters, etc. (e.g. run the ban command if these
 * conditions are met).
 * - null: ignore this resolver.
 */
export type CommandResolver = (m: Message) => Promise<string | Command | null>;

/**
 * Represents global command lifecycle hook methods. Note that these require `this` context, which means arrow functions
 * will not work.
 */
export type GlobalHook = (this: Command) => void | Command | Promise<void | Command>;

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

  /**
   * Sessions to ignore.
   */
  public readonly ignore: string[] = [];

  /**
   * Custom command resolvers to run. Use when you want more types of command than the `prefix + command` pattern.
   */
  public resolvers: CommandResolver[] = [];

  /**
   * Global command prefixes. Automatically includes mentions as prefixes.
   */
  public prefixes: Set<string | RegExp> = new Set();

  /**
   * Methods to run before each command. Executed in sequence before the command's `pre` method.
   */
  public pre: GlobalHook[] = [];

  /**
   * Methods to run after each command. Executed in sequence after the command's `post` method.
   */
  public post: GlobalHook[] = [];

  /**
   * Methods to run after a command errors.
   */
  public error: Array<(this: Command, error: any) => void | Promise<void>> = [];

  /**
   * Recently executed commands. Mapped by message ID.
   */
  public executed: Map<Snowflake, Command> = new Map();

  /**
   * How long commands should be cached (in ms). Defaults to the client message cache lifetime.
   */
  public commandLifetime: number;

  /**
   * Global arguments suffix.
   */
  public argsSuffix?: string;

  constructor(client: Client, config: IConfig = {}) {
    super();

    this.argsSuffix = config.argsSuffix;
    this.commandLifetime = client.options.messageCacheLifetime as number;

    this.registry = new CommandRegistry(this, config);
    if (config.prefixes) for (const pref of config.prefixes) this.prefixes.add(pref);

    this.handle = this.handle.bind(this);

    client.once('ready', () => this.prefixes.add(new RegExp(`<@!?${client.user.id}>`)));
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

    const cmd = await this.resolve(msg);
    if (!cmd) {
      this.emit('unknown', msg);
      return null;
    }

    return this.exec(cmd);
  }

  /**
   * Resolve commands from a message.
   */
  public async resolve(message: Message, text?: string): Promise<Command | null> {
    const executed = this.executed.get(message.id);
    if (executed) {
      if (executed.status === Status.COMPLETED) return null;
      return executed;
    }

    let body = text;

    if (!body) {
      for (const resolver of this.resolvers) {
        const resolved = await resolver(message);
        if (resolved instanceof Command) return resolved;
        if (typeof resolved === 'string') {
          body = resolved;
          break;
        }
        if (!resolved) return null;
      }
    }

    if (!body) {
      for (const prefix of this.prefixes) {
        if (
          (prefix instanceof RegExp ? prefix.test(message.content) : message.content.startsWith(prefix)) ||
          message.channel.type === 'dm'
        ) {
          body = message.content.replace(prefix, '').trim();
          break;
        }
      }
    }

    if (!body) return null;

    for (const Command of this.registry) { // tslint:disable-line variable-name
      const triggers = Array.isArray(Command.triggers) ? Command.triggers : [Command.triggers];
      for (const trigger of triggers) {
        if (typeof trigger === 'string') {
          if (body.startsWith(trigger)) return new Command(this, message, body.replace(trigger, '').trim());
        } else if (trigger instanceof RegExp) {
          if (trigger.test(body)) return new Command(this, message, body.replace(trigger, '').trim());
        } else if (typeof trigger === 'function') {
          const content = trigger(message);
          if (content) return new Command(this, message, content);
        }
      }
    }

    return null;
  }

  /**
   * Execute a command message.
   */
  public async exec(cmd: Command): Promise<void> {
    this._ignore(cmd.id);
    this.emit('start', cmd);

    try {
      for (const fn of this.pre) await this._handleGlobal(fn, cmd);
      await cmd.run();
      for (const fn of this.post) await this._handleGlobal(fn, cmd);
      this.emit('complete', cmd);
    } catch (e) {
      try {
        for (const fn of this.error) await fn.call(cmd, e);
      } catch (e) {
        // do nothing
      }

      // if the error hasn't already been handled
      if (!this.error.length) this.emit('error', e, cmd);
    } finally {
      // store command
      this.executed.set(cmd.message.id, cmd);
      setTimeout(() => this.executed.delete(cmd.message.id), this.commandLifetime);

      this._unignore(cmd.id);
    }
  }

  public on(event: 'loaded', listener:
    ({ commands, failed, time }: { commands: CommandRegistry, failed: string[], time: number }) => void): this;
  public on(event: 'unknown', listener: (msg: Message) => void): this;
  public on(event: 'error', listener: (error: any, command: Command) => void): this;
  public on(event: 'start' | 'complete', listener: (command: Command) => void): this;

  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public once(event: 'loaded', listener:
  ({ commands, failed, time }: { commands: CommandRegistry, failed: string[], time: number }) => void): this;
  public once(event: 'unknown', listener: (msg: Message) => void): this;
  public once(event: 'error', listener: (error: any, command: Command) => void): this;
  public once(event: 'start' | 'complete', listener: (command: Command) => void): this;

  public once(event: string, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  private async _handleGlobal(fn: GlobalHook, cmd: Command): Promise<void> {
    const result: Command | void = await fn.call(cmd);
    if (result) await this.exec(result);
  }

  /**
   * Ignore something (designed for [[CommandMessage#session]]).
   * @param session The data to ignore.
   */
  private _ignore(session: string) {
    this.ignore.push(session);
  }

  /**
   * Stop ignoring something (designed for [[CommandMessage#session]]).
   * @param session The data to unignore.
   */
  private _unignore(session: string) {
    const index = this.ignore.indexOf(session);
    if (index > -1) this.ignore.splice(index, 1);
  }
}
