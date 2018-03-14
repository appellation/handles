import { Client, Message, Snowflake } from 'discord.js';
import EventEmitter = require('events');

import { HookExec } from '../middleware/Hook';

import Command, { Status } from '../structures/Command';
import HandlesError from '../util/Error';
import Registry from './Registry';

export interface IConfig {
  /**
   * Command prefixes (used as a fallback after [[HandlesClient#resolvers]]).
   */
  prefixes?: Iterable<string>;

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
 * The starting point for using handles.
 *
 * ```js
 * const discord = require('discord.js');
 * const handles = require('discord-handles');
 *
 * const client = new discord.Client();
 * const handler = new handles.Client(client);
 *
 * client.on('message', handler.resolve);
 * client.login('token');
 * ```
 */
export default class HandlesClient extends EventEmitter {
  public readonly registry: Registry;

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
  public pre: HookExec[] = [];

  /**
   * Methods to run after each command. Executed in sequence after the command's `post` method.
   */
  public post: HookExec[] = [];

  /**
   * Recently executed commands. Mapped by message ID.
   */
  public executed: Map<Snowflake, Command> = new Map();

  /**
   * How long commands should be cached (in ms). Defaults to the client message cache lifetime.
   */
  public commandLifetime: number;

  constructor(client: Client, config: IConfig = {}) {
    super();

    this.commandLifetime = client.options.messageCacheLifetime as number;
    this.registry = new Registry(this, config);
    if (config.prefixes) this.prefixes = new Set(config.prefixes);

    this.exec = this.exec.bind(this);

    client.once('ready', () => this.prefixes.add(new RegExp(`<@!?${client.user.id}>`)));
    if (!('listen' in config) || config.listen) {
      client.on('message', this.exec);
      client.on('messageUpdate', (o, n) => this.exec(n));
    }

    this.on('start', (cmd) => this._ignore(cmd.id));
    this.on('finish', (cmd) => this._unignore(cmd.id));
  }

  /**
   * Execute a message.
   */
  public async exec(message: Message, text?: string): Promise<Command | null> {
    if (
      message.webhookID ||
      message.system ||
      message.author.bot ||
      this.ignore.includes(Command.makeID(message)) ||
      (!message.client.user.bot && message.author.id !== message.client.user.id)
    ) return null;

    const executed = this.executed.get(message.id);
    if (executed) {
      if (![Status.COMPLETED, Status.RUNNING].includes(executed.status)) return null;
      return executed;
    }

    let body = text;

    if (!body && this.resolvers.length) {
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

    if (!body && this.prefixes.size) {
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

    for (const Command of this.registry) {
      const triggers = Array.isArray(Command.triggers) ? Command.triggers : [Command.triggers];
      for (const trigger of triggers) {
        if (typeof trigger === 'string') {
          if (body.startsWith(trigger)) return await new Command(this, message, body.replace(trigger, '').trim());
        } else if (trigger instanceof RegExp) {
          if (trigger.test(body)) return await new Command(this, message, body.replace(trigger, '').trim());
        } else if (typeof trigger === 'function') {
          const content = trigger(message);
          if (content) return await new Command(this, message, content);
        }
      }
    }

    return null;
  }

  public on(event: 'loaded', listener:
    ({ commands, failed, time }: { commands: Registry, failed: string[], time: number }) => void): this;
  public on(event: 'error', listener: (error: any, command: Command) => void): this;
  public on(event: 'cancel', listener: (error: HandlesError, command: Command) => void): this;
  public on(event: 'start' | 'complete' | 'finish', listener: (command: Command) => void): this;

  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public once(event: 'loaded', listener:
  ({ commands, failed, time }: { commands: Registry, failed: string[], time: number }) => void): this;
  public once(event: 'error', listener: (error: any, command: Command) => void): this;
  public once(event: 'start' | 'complete' | 'finish', listener: (command: Command) => void): this;

  public once(event: string, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  /**
   * Ignore something (designed for [[Command#id]]).
   * @param session The data to ignore.
   */
  private _ignore(session: string) {
    this.ignore.push(session);
  }

  /**
   * Stop ignoring something (designed for [[Command#id]]).
   * @param session The data to unignore.
   */
  private _unignore(session: string) {
    const index = this.ignore.indexOf(session);
    if (index > -1) this.ignore.splice(index, 1);
  }
}
