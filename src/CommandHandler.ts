import HandlesClient from './Client';
import CommandLoader from './CommandLoader';
import CommandMessage from './CommandMessage';
import BaseError from './errors/BaseError';

import { ICommand } from './interfaces/ICommand';
import { IConfig } from './interfaces/IConfig';
import { IMiddleware } from './interfaces/IMiddleware';

import { MessageValidator } from './types/MessageValidator';

import { Message } from 'discord.js';

/**
 * Class for handling a command.
 */
export default class CommandHandler {

  /**
   * The client.
   */
  public readonly client: HandlesClient;

  /**
   * The message validator from config.
   */
  private _validator: MessageValidator;

  /**
   * An internal regex used to parse command bits.
   */
  private _regex: RegExp;

  constructor(handles: HandlesClient) {
    this.client = handles;

    if (typeof this.client.config.validator !== 'function' &&
      (!this.client.config.prefixes || !this.client.config.prefixes.size)) {
      throw new Error('Unable to validate commands: no validator or prefixes were provided.');
    }

    this._validator = this.client.config.validator || ((message) => {
      for (const p of this.client.config.prefixes) {
        if (message.content.startsWith(p)) {
          return message.content.substring(p.length).trim();
        }
      }

      return null;
    });

    this._regex = /^([^\s]+)(.*)/;
  }

  /**
   * Resolve a command from a message.
   */
  public resolve(message: Message): CommandMessage | null {
    const content = this._validator(message);
    if (typeof content !== 'string' || !content) return null;

    const match = content.match(this._regex);
    if (match) {
      const [, cmd, commandContent] = match;
      const mod: ICommand | undefined = this.client.loader.commands.get(cmd);

      if (mod) {
        return new CommandMessage(this.client, {
          body: commandContent.trim(),
          command: mod,
          message,
          trigger: cmd,
        });
      }
    }

    for (const [trigger, command] of this.client.loader.commands) {
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
        return new CommandMessage(this.client, {
          body,
          command,
          message,
          trigger,
        });
      }
    }

    return null;
  }

  /**
   * Execute a command message.
   */
  public exec(msg: CommandMessage): Promise<any> {
    if (typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');

    return new Promise((resolve, reject) => {
      if (typeof msg.command.middleware === 'function') {
        this.client.emit('middlewareStarted', msg);

        const iterate = (generator: Iterator<IMiddleware>, value?: any): void => {
          const next = generator.next(value);
          if (next.done) {
            this.client.emit('middlewareFinished', msg);
            resolve();
          } else {
            Promise.resolve(next.value.run(msg))
              .then((val) => iterate(generator, val))
              .catch((err) => {
                this.client.emit('middlewareFailed', { command: msg, error: err });
                reject(err);
              });
          }
        };

        iterate(msg.command.middleware(msg));
      } else {
        resolve();
      }
    }).then(() => {
      this.client.emit('commandStarted', msg);
      return Promise.resolve(msg.command.exec(msg));
    }).then((result) => {
      this.client.emit('commandFinished', { command: msg, result });
    }).catch((e): Promise<any> | void => {
      if (e instanceof BaseError) {
        this.client.emit('commandFailed', { command: msg, error: e });
        if (!this.client.config.silent) return Promise.resolve(e);
      } else {
        this.client.emit('commandError', { command: msg, error: e });
        if (!this.client.config.silent) return Promise.reject(e);
      }
    });
  }
}
