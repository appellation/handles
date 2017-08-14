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
 */
export default class CommandMessage {

  /**
   * The handles client. Named so in order to avoid confusion with the Discord.js client, which is exposed here.
   */
  public readonly handles: HandlesClient;

  /**
   * The command associated with this message.
   */
  public readonly command: ICommand;

  /**
   * The command trigger that caused the message to run this command.
   */
  public readonly trigger: Trigger;

  /**
   * The message that triggered this command.
   */
  public readonly message: Message;

  /**
   * The body of the command (without prefix or command), as provided in the original message.
   */
  public body: string;

  /**
   * Client config.
   */
  public config: IConfig;

  /**
   * The command arguments as set by arguments in executor.
   */
  public args?: any;

  /**
   * The response object for this command.
   */
  public response: Response;

  constructor(client: HandlesClient, { command, trigger, message, body }: ICommandMessageOptions) {
    this.handles = client;
    this.command = command;
    this.trigger = trigger;
    this.message = message;
    this.body = body;
    this.config = client.config;
    this.args = null;
    this.response = new (this.config.Response)(this.message);
  }

  /**
   * The Discord.js client.
   */
  get client(): Client {
    return this.message.client;
  }

  /**
   * The guild this command is in.
   */
  get guild(): Guild {
    return this.message.guild;
  }

  /**
   * The channel this command is in.
   */
  get channel(): TextBasedChannel {
    return this.message.channel;
  }

  /**
   * Ensure unique commands for an author in a channel.
   * Format: "authorID:channelID"
   */
  get session() {
    return `${this.message.author.id}:${this.message.channel.id}`;
  }
}
