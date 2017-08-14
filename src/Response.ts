import queue = require('queue');

import { Message, MessageOptions } from 'discord.js';
import { TextBasedChannel } from './types/modules/TextBasedChannel';

export type SentResponse = Message | Message[];
export interface IResponseOptions {
  /**
   * Whether to catch all rejections when sending.  The promise will always resolve when this option
   * is enabled; if there is an error, the resolution will be undefined.
   */
  catchall?: boolean;

  /**
   * Whether to send a new message regardless of any prior responses.
   */
  force?: boolean;

  /**
   * The type of response.
   */
  type?: 'success' | 'error';
}

export type Send = (
    data: string,
    options?: IResponseOptions,
    messageOptions?: MessageOptions,
  ) => Promise<SentResponse>;

/**
 * Send responses to a message.
 */
export default class Response {

  /**
   * The message to respond to.
   */
  public message: Message;

  /**
   * Whether to edit previous responses.
   */
  public edit: boolean = true;

  /**
   * The channel to send responses in.
   */
  public channel: TextBasedChannel;

  /**
   * The message to edit, if enabled.
   */
  public responseMessage?: Message | null;

  /**
   * The queue of response jobs.
   */
  private readonly _q: any[];

  /**
   * @param message The message to respond to.
   * @param edit Whether to edit previous responses.
   */
  constructor(message: Message, edit: boolean = true) {

    this.message = message;
    this.channel = message.channel;
    this.edit = edit;
    this.responseMessage = null;
    this._q = queue({
      autostart: true,
      concurrency: 1,
    });
  }

  /**
   * Send a message using the Discord.js `Message.send` method.  If a prior
   * response has been sent, it will edit that unless the `force` parameter
   * is set.  Automatically attempts to fallback to DM responses.  You can
   * send responses without waiting for prior responses to succeed.
   * @param data The data to send
   * @param options Message options.
   * @param messageOptions Discord.js message options.
   */
  public send: Send = (data, options = { catchall: true, force: false }, messageOptions) => {
    const { type, force, catchall } = options;

    if (type === 'success') data = `\`✅\` | ${data}`;
    else if (type === 'error') data = `\`❌\` | ${data}`;

    return new Promise((resolve, reject) => {
      this._q.push((cb: (e: Error | null, m?: SentResponse) => void) => {
        function success(m?: SentResponse): void {
          cb(null, m);
          resolve(m);
        }

        function error(e: Error): void {
          if (catchall) return success();
          cb(e);
          reject(e);
        }

        if (this.responseMessage && this.edit && !force) {
          this.responseMessage.edit(data).then(success, error);
        } else {
          this.channel.send(data, messageOptions).then((m) => {
            if (Array.isArray(m)) this.responseMessage = m[0];
            else this.responseMessage = m;
            success(m);
          }, () => {
            if (this.channel.type === 'text') this.message.author.send(data, messageOptions).then(success, error);
          });
        }
      });
    });
  }

  public error: Send = (data, options = { type: 'error' }, messageOptions) => {
    return this.send(data, options, messageOptions);
  }

  public success: Send = (data, options = { type: 'success' }, messageOptions) => {
    return this.send(data, options, messageOptions);
  }

  public dm: Send = async (data, options, messageOptions) => {
    this.channel = this.message.author.dmChannel || await this.message.author.createDM();
    return this.send(data, options, messageOptions);
  }
}
