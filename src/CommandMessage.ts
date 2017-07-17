import { EventEmitter } from 'events';
import HandlesClient from './Client';
import Response from './Response';

import { ICommand, Trigger } from './interfaces/ICommand';
import { IConfig } from './interfaces/IConfig';
import { TextBasedChannel } from './types/modules/TextBasedChannel';

import { Client, Guild, Message } from 'discord.js';

export interface ICommandMessageOptions {
  command: ICommand;
  trigger: Trigger;
  message: Message;
  body: string;
}

/**
 * A message to be processed as a command.
 * @extends EventEmitter
 */
export default class CommandMessage extends EventEmitter {

  public handles: HandlesClient;
  public command: ICommand;
  public trigger: Trigger;
  public message: Message;
  public body: string;
  public config: IConfig;
  public args?: any;
  public response: Response;

  /**
   * @param {Object} data
   * @param {Command} data.command
   * @param {Trigger} data.trigger
   * @param {Message} data.message
   * @param {string} data.body
   */
  constructor(client: HandlesClient, { command, trigger, message, body }: ICommandMessageOptions) {
    super();

    /**
     * The handles client.
     * @type {HandlesClient}
     */
    this.handles = client;

    /**
     * The command loader to use for commands.
     * @type {Command}
     */
    this.command = command;

    /**
     * The trigger that triggered this command.
     * @type {Trigger}
     */
    this.trigger = trigger;

    /**
     * The message that triggered this command.
     * @type {Message}
     */
    this.message = message;

    /**
     * The body of the command (without prefix or command), as provided in the original message.
     * @type {string}
     */
    this.body = body;

    /**
     * The config.
     * @type {Config}
     */
    this.config = client.config;

    /**
     * The command arguments as set by arguments in executor.
     * @see ArgumentResolver
     * @type {?Object}
     */
    this.args = null;

    /**
     * The response object for this command.
     * @type {Response}
     */
    this.response = new (this.config.Response)(this.message);
  }

  /**
   * The Discord.js client.
   * @type {Client}
   * @readonly
   */
  get client(): Client {
    return this.message.client;
  }

  /**
   * The guild this command is in.
   * @type {?Guild}
   * @readonly
   */
  get guild(): Guild {
    return this.message.guild;
  }

  /**
   * The channel this command is in.
   * @type {TextChannel}
   * @readonly
   */
  get channel(): TextBasedChannel {
    return this.message.channel;
  }

  /**
   * Format: "authorID:channelID"
   * @type {string}
   * @readonly
   */
  get session() {
    return `${this.message.author.id}:${this.message.channel.id}`;
  }
}
