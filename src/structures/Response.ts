import Queue from '../util/Queue';

import { DMChannel, GroupDMChannel, Message, MessageOptions, TextBasedChannel, TextChannel } from 'discord.js';

export type TextBasedChannel = TextChannel | DMChannel | GroupDMChannel;

export type SentResponse = Message | Message[];
export interface IResponseOptions extends MessageOptions {
  /**
   * Whether to catch all rejections when sending.  The promise will always resolve when this option
   * is enabled; if there is an error, the resolution will be undefined.
   */
  catchall?: boolean;

  /**
   * Whether to send a new message regardless of any prior responses.
   */
  force?: boolean;
}

export type Send = (
    data: string | IResponseOptions,
    options?: IResponseOptions,
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
  private readonly _q: Queue;

  /**
   * @param message The message to respond to.
   * @param edit Whether to edit previous responses.
   */
  constructor(message: Message, edit: boolean = true) {
    this.message = message;
    this.channel = message.channel;
    this.edit = edit;
    this.responseMessage = null;
    this._q = new Queue();
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
  public send: Send = (data, options = {}, ...extra: IResponseOptions[]) => {
    options = Object.assign(options, ...extra);
    return new Promise((resolve, reject) => {
      this._q.push(async (): Promise<void> => {
        function success(m?: SentResponse): void {
          resolve(m);
        }

        function error(e: Error): void {
          if (options.catchall) return success();
          reject(e);
        }

        if (this.responseMessage && this.edit && !options.force) {
          await this.responseMessage.edit(data, options).then(success, error);
        } else {
          await this.channel.send(data, options).then((m) => {
            if (Array.isArray(m)) this.responseMessage = m[0];
            else this.responseMessage = m;
            return success(m);
          }, () => {
            if (this.channel.type === 'text') {
              return this.message.author.send(data, options).then(success, error);
            }
          });
        }
      });
    });
  }

  public error: Send = (data, ...options: IResponseOptions[]) => {
    return this.send(`\`❌\` | ${data}`, ...options);
  }

  public success: Send = (data, ...options: IResponseOptions[]) => {
    return this.send(`\`✅\` | ${data}`, ...options);
  }

  public dm: Send = async (data, ...options: IResponseOptions[]) => {
    this.channel = this.message.author.dmChannel || await this.message.author.createDM();
    return this.send(data, ...options);
  }
}
