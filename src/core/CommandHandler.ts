import BaseError from '../errors/BaseError';
import CommandMessage from '../structures/CommandMessage';

import HandlesClient from './Client';
import CommandRegistry from './CommandRegistry';

import { CommandMiddleware, ICommand } from '../interfaces/ICommand';
import { IConfig } from '../interfaces/IConfig';
import { IMiddleware } from '../interfaces/IMiddleware';

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
   * Global middleware.
   */
  public middleware: CommandMiddleware[] = [];

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
  public async resolve(message: Message): Promise<CommandMessage | null> {
    const content = await this.validator(message);
    if (typeof content !== 'string' || !content) return null;

    const match = content.match(/^([^\s]+)(.*)/);
    if (match) {
      const [, cmd, commandContent] = match;
      const mod: ICommand | undefined = this.handles.registry.get(cmd);

      if (mod) {
        return new CommandMessage(this.handles, {
          body: commandContent.trim(),
          command: mod,
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
        const cmd = new CommandMessage(this.handles, {
          body,
          command,
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
  public async exec(msg: CommandMessage): Promise<any> {
    this._ignore(msg.session);
    this.handles.emit('commandStarted', msg);

    try {
      const iterate = async (generator: Iterator<IMiddleware>, value?: any): Promise<void> => {
        const next = generator.next(value);

        if (next.done) return;
        else return iterate(generator, await next.value.run(msg));
      };

      for (const middleware of this.middleware) await iterate(middleware(msg));
      if (typeof msg.command.middleware === 'function') await iterate(msg.command.middleware(msg));

      const result = await msg.command.exec(msg);
      this.handles.emit('commandFinished', { command: msg, result });
      return this.silent ? result : void 0;

    } catch (e) {
      if (e instanceof BaseError) {
        this.handles.emit('commandFailed', { command: msg, error: e });
        if (!this.silent) return e;
      } else {
        this.handles.emit('commandError', { command: msg, error: e });
        if (!this.silent) throw e;
      }
    } finally {
      this._unignore(msg.session);
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
      if (!this.ignore.includes(session)) return;
      this.ignore.splice(this.ignore.indexOf(session), 1);
  }
}
