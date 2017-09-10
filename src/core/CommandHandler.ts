import BaseError from '../errors/BaseError';

import Command from '../structures/Command';

import HandlesClient from './Client';
import CommandRegistry from './CommandRegistry';

import { IConfig } from '../interfaces/Config';

import { Message } from 'discord.js';

export type MessageValidator = (m: Message) => string | null | Promise<string | null>;

/**
 * Class for handling a command.
 */
export default class CommandHandler {

  /**
   * The client.
   */
  public readonly handles: HandlesClient;

  /**
   * Sessions to ignore.
   */
  public readonly ignore: string[] = [];

  /**
   * Whether the [[handle]] method should always resolve with void (use when relying on events to catch errors).
   */
  public silent: boolean;

  /**
   * The message validator from config.
   */
  public validator: MessageValidator;

  /**
   * Methods to run before each command. Executed in sequence before the command's `pre` method.
   */
  public pre: Array<(cmd: Command) => any> = [];

  /**
   * Methods to run after each command.  Executed in sequence after the command's `post` method.
   */
  public post: Array<(cmd: Command) => any> = [];

  constructor(handles: HandlesClient, config: IConfig) {
    this.handles = handles;
    this.silent = typeof config.silent === 'undefined' ? true : config.silent;

    if (
      typeof config.validator !== 'function' &&
      (!this.handles.prefixes || !this.handles.prefixes.size)
    ) throw new Error('Unable to validate commands: no validator or prefixes were provided.');

    this.validator = config.validator || ((message) => {
      for (const p of this.handles.prefixes) {
        if (message.content.startsWith(p)) {
          return message.content.substring(p.length).trim();
        }
      }

      return null;
    });
  }

  /**
   * Resolve a command from a message.
   */
  public async resolve(message: Message): Promise<Command | null> {
    const content = await this.validator(message);
    if (typeof content !== 'string' || !content) return null;

    const match = content.match(/^([^\s]+)(.*)/);
    if (match) {
      const [, cmd, commandContent] = match;
      const mod = this.handles.registry.get(cmd);

      if (mod) {
        return new mod(this.handles, {
          body: commandContent.trim(),
          message,
          trigger: cmd,
        });
      }
    }

    for (const [trigger, command] of this.handles.registry) {
      let body = null;
      if (trigger instanceof RegExp) {
        const match = content.match(trigger);
        if (match) body = match[0].trim();
      } else if (typeof trigger === 'string') {
        // if the trigger is lowercase, make the command case-insensitive
        if ((trigger.toLowerCase() === trigger ? content.toLowerCase() : content).startsWith(trigger)) {
          body = content.substring(trigger.length).trim();
        }
      }

      if (body !== null) {
        const cmd = new command(this.handles, {
          body,
          message,
          trigger,
        });

        if (!this.ignore.includes(cmd.session)) return cmd;
      }
    }

    return null;
  }

  /**
   * Execute a command message.
   */
  public async exec(cmd: Command): Promise<any> {
    this._ignore(cmd.session);
    this.handles.emit('commandStarted', cmd);

    try {
      // TODO: Remove the param on global pre and post for v8
      for (const fn of this.pre) await fn.call(cmd, cmd);
      await cmd.pre.call(cmd);
      const result = await cmd.exec.call(cmd);
      await cmd.post.call(cmd);
      for (const fn of this.post) await fn.call(cmd, cmd);

      this.handles.emit('commandFinished', { command: cmd, result });
      return this.silent ? result : undefined;

    } catch (e) {
      try {
        await cmd.error();
      } catch (e) {
        // do nothing
      }

      if (e instanceof BaseError) {
        this.handles.emit('commandFailed', { command: cmd, error: e });
        if (!this.silent) return e;
      } else {
        this.handles.emit('commandError', { command: cmd, error: e });
        if (!this.silent) throw e;
      }
    } finally {
      this._unignore(cmd.session);
    }
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
