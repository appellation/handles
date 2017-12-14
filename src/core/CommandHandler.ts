import BaseError from '../errors/BaseError';

import Command, { Trigger } from '../structures/Command';

import HandlesClient from './Client';
import CommandRegistry from './CommandRegistry';

import { Message, Snowflake } from 'discord.js';
import { EventEmitter } from 'events';
import ValidationError from '../errors/ValidationError';

/**
 * Represents a custom command resolver. Should return the content of the message, excluding anything like prefixes, or
 * a command class.
 */
export type CommandResolver = (m: Message) => Promise<string | Command | null>;

/**
 * Represents global command lifecycle hook methods.
 */
export type GlobalHook = (this: Command) => void | Command;

/**
 * Class for handling a command.
 */
export default class CommandHandler extends EventEmitter {

  /**
   * The client.
   */
  public readonly handles: HandlesClient;

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
  public error: GlobalHook[] = [];

  /**
   * Recently executed commands. Mapped by message ID.
   */
  public executed: Map<Snowflake, Command> = new Map();

  /**
   * How long commands should be cached (in ms). Defaults to 1 hour.
   */
  public commandLifetime: number = 1000 * 60 * 60;

  constructor(handles: HandlesClient) {
    super();
    this.handles = handles;
  }

  /**
   * Resolve commands from a message.
   */
  public async resolve(message: Message, text?: string): Promise<Command | null> {
    const executed = this.executed.get(message.id);
    if (executed && executed.status !== 'completed') return executed;

    let body = text;

    if (!body) {
      for (const resolver of this.resolvers) {
        const resolved = await resolver(message);
        if (resolved instanceof Command) return resolved;
        if (typeof resolved === 'string') {
          body = resolved;
          break;
        }
      }
    }

    if (!body) {
      for (const prefix of this.prefixes) {
        if (prefix instanceof RegExp ? prefix.test(message.content) : message.content.startsWith(prefix)) {
          body = message.content.replace(prefix, '');
          break;
        }
      }
    }

    if (!body) return null;
    body = body.trim();

    for (const Command of this.handles.registry) { // tslint:disable-line variable-name
      const triggers = Array.isArray(Command.triggers) ? Command.triggers : [Command.triggers];
      for (const trigger of triggers) {
        if (typeof trigger === 'string') {
          if (body.startsWith(trigger)) return new Command(this.handles, message, message.content.replace(trigger, ''));
        } else if (trigger instanceof RegExp) {
          if (trigger.test(body)) return new Command(this.handles, message, message.content.replace(trigger, ''));
        } else if (typeof trigger === 'function') {
          const content = trigger(message);
          if (content) return new Command(this.handles, message, content);
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
      // if the error is not intended
      if (!(e instanceof BaseError)) {
        try {
          for (const fn of this.error) await fn.call(cmd);
        } catch (e) {
          // do nothing
        }

        if (!this.error.length) this.emit('error', e, cmd);
      }
    } finally {
      // store command
      this.executed.set(cmd.message.id, cmd);
      setTimeout(() => this.executed.delete(cmd.message.id), this.commandLifetime);

      this._unignore(cmd.id);
    }
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
