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
 * Class for resolving a command from a message.
 */
export default class CommandHandler {

  public client: HandlesClient;

  private _validator: MessageValidator;
  private _regex: RegExp;

  /**
   * @param {HandlesClient}
   */
  constructor(handles: HandlesClient) {
    /**
     * @type {HandlesClient}
     */
    this.client = handles;

    if (typeof this.client.config.validator !== 'function' &&
      (!this.client.config.prefixes || !this.client.config.prefixes.size)) {
      throw new Error('Unable to validate commands: no validator or prefixes were provided.');
    }

    /**
     * The validator function to determine if a command is valid.
     * @type {function}
     * @private
     */
    this._validator = this.client.config.validator || ((message) => {
      for (const p of this.client.config.prefixes) {
        if (message.content.startsWith(p)) {
          return message.content.substring(p.length).trim();
        }
      }

      return null;
    });

    /**
     * The base regex for parsing command parts.
     * @type {RegExp}
     * @private
     */
    this._regex = /^([^\s]+)(.*)/;
  }

  /**
   * @param {Message} message - The message that could be a command.
   */
  public resolve(message: Message): CommandMessage {
    const content = this._validator(message);
    if (typeof content !== 'string' || !content) return null;

    const [, cmd, commandContent] = content.match(this._regex);
    const mod: ICommand = this.client.loader.commands.get(cmd);
    if (mod) {
      return new CommandMessage(this.client, {
        body: commandContent.trim(),
        command: mod,
        message,
        trigger: cmd,
      });
    }

    for (const [trigger, command] of this.client.loader.commands) {
      let body = null;
      if (trigger instanceof RegExp) {
        if (trigger.test(content)) body = content.match(trigger)[0].trim();
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
   * @param {CommandMessage} msg
   * @returns {Promise}
   */
  public exec(msg: CommandMessage): Promise<any> {
    if (typeof msg.command.exec !== 'function') throw new Error('Command executor must be a function.');

    return new Promise((resolve, reject) => {
      if (typeof msg.command.middleware === 'function') {

        /**
         * Fired when middleware is started.
         * @event HandlesClient#middlewareStarted
         * @type {CommandMessage}
         */
        this.client.emit('middlewareStarted', msg);

        const iterate = (generator: Iterator<IMiddleware>, value?: any): void => {
          const next = generator.next(value);
          if (next.done) {

            /**
             * Fired when middleware is done and has not errored.
             * @event HandlesClient#middlewareFinished
             * @type {CommandMessage}
             */
            this.client.emit('middlewareFinished', msg);
            resolve();
          } else {
            Promise.resolve(next.value.run(msg))
              .then((val) => iterate(generator, val))
              .catch((err) => {

                /**
                 * Fired when middleware has failed.  Emitted before {@link HandlesClient#commandFailed}.
                 * @event HandlesClient#middlewareFailed
                 * @type {Object}
                 * @property {CommandMessage} command
                 * @property {BaseError|Error|*} error
                 */
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

      /**
       * @event HandlesClient#commandStarted
       * @type {CommandMessage}
       */
      this.client.emit('commandStarted', msg);
      return Promise.resolve(msg.command.exec(msg));
    }).then((result) => {

      /**
       * @event HandlesClient#commandFinished
       * @type {Object}
       * @property {CommandMessage} command
       * @property {*} result The returned result of the command, resolved as a promise.
       */
      this.client.emit('commandFinished', { command: msg, result });
    }).catch((e) => {
      /**
       * Emitted any time a command fails to execute due to middleware.  These are planned and are
       * the result of user interaction: eg. cancelled argument prompt or failed validation.
       * @event HandlesClient#commandFailed
       * @type {Object}
       * @property {CommandMessage} command
       * @property {BaseError} error
       */
      if (e instanceof BaseError) this.client.emit('commandFailed', { command: msg, error: e });

      /**
       * Emitted any time a command throws an error.  These are unplanned and represent an error
       * in your code.
       * @event HandlesClient#commandError
       * @type {Object}
       * @property {CommandMessage} command
       * @property {Error|*} error
       */
      else this.client.emit('commandError', { command: msg, error: e });
    });
  }
}
