import HandlesClient from '../core/Client';
import HandlesError, { Code } from '../util/Error';
import Response, { TextBasedChannel } from './Response';

import { Client, Guild, GuildMember, Message, User } from 'discord.js';
import { EventEmitter } from 'events';

export type Trigger = string | RegExp | ((msg: Message) => string);

export interface InstantiableCommand {
  triggers?: Trigger | Trigger[];
  new (client: HandlesClient, message: Message, body?: string): Command;
}

export interface ICommand {
  triggers?: Trigger | Trigger[];
  pre?: () => Promise<any>;
  exec: () => Promise<any>;
  post?: () => Promise<any>;
  error?: (e: Error) => Promise<any>;
}

export enum Status {
  INSTANTIATED,
  RUNNING,
  COMPLETED,
  CANCELLED,
  FAILED,
}

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
export default abstract class Command extends EventEmitter implements ICommand {
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
   * The body of this command.
   */
  public body: string;

  /**
   * The command arguments as set by arguments in executor.
   */
  public args: any = {};

  /**
   * The response object for this command.
   */
  public response: Response;

  private _status: Status = Status.INSTANTIATED;

  constructor(client: HandlesClient, message: Message, body?: string) {
    super();
    this.handles = client;
    this.message = message;
    this.body = typeof body === 'undefined' ? message.content : body;
    this.response = new Response(this.message);
  }

  /**
   * The Discord.js client.
   */
  get client(): Client {
    return this.message.client;
  }

  /**
   * Ensure unique commands for an author in a channel.
   * Format: "authorID:channelID"
   */
  get id() {
    return `${this.message.author.id}:${this.message.channel.id}`;
  }

  /**
   * The status of this command.
   */
  get status() {
    return this._status;
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

  /**
   * The guild member of this command.
   */
  get member(): GuildMember {
    return this.message.member;
  }

  /**
   * Whether this command has finished running.
   */
  public get ended() {
    return this._status >= Status.COMPLETED;
  }

  public async run() {
    this._status = Status.RUNNING;

    try {
      await this.pre();
      await this.exec();
      await this.post();

      this._status = Status.COMPLETED;
    } catch (e) {
      if (this.status !== Status.CANCELLED) this._status = Status.FAILED;

      try {
        await this.error(e);
      } catch (e) {
        // do nothing
      }

      throw e;
    } finally {
      this.removeAllListeners();
    }
  }

  /**
   * Immediately cancel this command.
   * @param err The error that cancelled the command
   * @param args Any other args to emit with the error
   */
  public cancel(err?: any, ...args: any[]): never {
    this._status = Status.CANCELLED;

    if (typeof err === 'number' && err in Code) err = new HandlesError(err);
    else if (!err) err = new HandlesError(Code.COMMAND_CANCELLED);

    this.emit('cancel', err, ...args);

    if (err instanceof HandlesError || err instanceof Error) throw err;
    throw new Error(err || 'cancelled');
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
  }

  /**
   * A method for arguments. Called after {@link Command#validators} if the {@link Command#pre} method is not
   * overidden.
   */
  public arguments() {
    // implemented by command
  }

  /**
   * A method for validators. Called before {@link Command#arguments} if the {@link Command#pre} method is not
   * overidden.
   */
  public validators() {
    // implemented by command
  }

  /**
   * The command execution method
   */
  public abstract exec(): Promise<any>;

  /**
   * Executed after {@link Command#exec}. Can be used for responses.
   */
  public async post() {
    // implemented by command
  }

  /**
   * Executed when any of the command execution methods error. Any errors thrown here will be discarded.
   * Override this to provide custom responses on cancellation/failure.
   */
  public async error(e: any) {
    // implemented by command
  }
}
