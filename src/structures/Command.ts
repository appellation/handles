import HandlesClient from '../core/Client';

import { IConfig } from '../interfaces/Config';
import Response, { TextBasedChannel } from './Response';

import { Client, Guild, GuildMember, Message, User } from 'discord.js';

export type Trigger = string | RegExp;

export interface ICommandOptions {
  trigger: Trigger;
  message: Message;
  body: string;
}

/**
 * A command.
 * ```js
 * const { Command } = require('discord-handles');
 * module.exports = class extends Command {
 *   static get triggers() {
 *     return ['ping', 'pung', 'poing', 'pong'];
 *   }
 *
 *   exec() {
 *     return this.response.success(`${this.trigger} ${Date.now() - this.message.createdTimestamp}ms`);
 *   }
 * };
 */
export default class Command {
  public static triggers?: Trigger | Trigger[];

  /**
   * The handles client.
   */
  public readonly handles: HandlesClient;

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

  constructor(client: HandlesClient, { trigger, message, body }: ICommandOptions) {
    this.handles = client;
    this.trigger = trigger;
    this.message = message;
    this.body = body;
    this.args = null;
    this.response = new this.handles.Response(this.message);
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
   * The author of this command.
   */
  get author(): User {
    return this.message.author;
  }

  get member(): GuildMember {
    return this.message.member;
  }

  /**
   * Ensure unique commands for an author in a channel.
   * Format: "authorID:channelID"
   */
  get session() {
    return `${this.message.author.id}:${this.message.channel.id}`;
  }

  /**
   * Executed prior to {@link Command#exec}. Should be used for middleware/validation.
   * ```js
   * async pre() {
   *   await new handles.Argument(this, 'someArgument')
   *     .setResolver(c => c === 'dank memes' ? 'top kek' : null);
   * }
   */
  public pre() {
    // implemented by command
  }

  /**
   * The command execution method
   */
  public exec() {
    // implemented by command
  }

  /**
   * Executed after {@link Command#exec}. Can be used for responses.
   */
  public post() {
    // implemented by command
  }

  /**
   * Executed when any of the command execution methods error. Any errors here will be discarded.
   */
  public error() {
    // implemented by command
  }
}
