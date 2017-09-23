import HandlesClient from '../core/Client';
import { ICommand } from '../interfaces/Command';
import { IConfig } from '../interfaces/Config';
import Runnable from '../util/Runnable';
import Response, { TextBasedChannel } from './Response';

import { Client, Guild, GuildMember, Message, User } from 'discord.js';

export type Trigger = string | RegExp;

/**
 * A command.
 *
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
 * ```
 */
export default class Command extends Runnable<void> implements ICommand {
  /**
   * Triggers for this command.
   */
  public static triggers?: Trigger | Trigger[];

  /**
   * The handles client.
   */
  public readonly handles: HandlesClient;

  /**
   * The message that triggered this command.
   */
  public readonly message: Message;

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

  constructor(client: HandlesClient, message: Message) {
    super();
    this.handles = client;
    this.message = message;
    this.args = null;
    this.response = new Response(this.message);
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

  public async run() {
    try {
      await this.pre();
      await this.exec();
      await this.post();
    } catch (e) {
      await this.error(e);
      throw e;
    }
  }

  /**
   * Executed prior to {@link Command#exec}. Should be used for middleware/validation.
   * ```js
   * async pre() {
   *   await new handles.Argument(this, 'someArgument')
   *     .setResolver(c => c === 'dank memes' ? 'top kek' : null);
   * }
   */
  public async pre() {
    await this.validators();
    await this.arguments();
    // implemented by command
  }

  public arguments() {
    // implemented by command
  }

  public validators() {
    // implemented by command
  }

  /**
   * The command execution method
   */
  public async exec() {
    // implemented by command
  }

  /**
   * Executed after {@link Command#exec}. Can be used for responses.
   */
  public async post() {
    // implemented by command
  }

  /**
   * Executed when any of the command execution methods error. Any errors thrown here will be discarded.
   */
  public error(e: Error) {
    // implemented by command
  }
}
