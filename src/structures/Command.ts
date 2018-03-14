import HandlesClient from '../core/Client';
import Hook from '../middleware/Hook';
import HandlesError, { Code } from '../util/Error';
import Mixin from '../util/Mixin';
import Runnable, { IRunnable } from '../util/Runnable';
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
@Mixin([Runnable])
export default abstract class Command extends EventEmitter implements ICommand, IRunnable<void> {
  /**
   * Triggers for this command.
   */
  public static triggers?: Trigger | Trigger[];

  public static makeID(message: Message) {
    return `${message.author.id}:${message.channel.id}`;
  }

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
  public args: { [key: string]: any } = {};

  /**
   * The response object for this command.
   */
  public response: Response;

  private _status: Status = Status.INSTANTIATED;

  constructor(client: HandlesClient, message: Message, body: string = message.content) {
    super();
    this.handles = client;
    this.message = message;
    this.body = body;
    this.response = new Response(this.message);
  }

  /**
   * The Discord.js client.
   */
  public get client(): Client {
    return this.message.client;
  }

  /**
   * Ensure unique commands for an author in a channel.
   * Format: "authorID:channelID"
   */
  public get id() {
    return Command.makeID(this.message);
  }

  /**
   * The status of this command.
   */
  public get status() {
    return this._status;
  }

  /**
   * The guild this command is in.
   */
  public get guild(): Guild {
    return this.message.guild;
  }

  /**
   * The channel this command is in.
   */
  public get channel(): TextBasedChannel {
    return this.message.channel;
  }

  /**
   * The author of this command.
   */
  public get author(): User {
    return this.message.author;
  }

  /**
   * The guild member of this command.
   */
  public get member(): GuildMember {
    return this.message.member;
  }

  /**
   * Whether this command has finished running.
   */
  public get ended() {
    return this._status >= Status.COMPLETED;
  }

  /**
   * Whether this command was terminated before completion.
   */
  public get terminated() {
    return this._status >= Status.CANCELLED;
  }

  /**
   * Assert that a condition is true before continuing execution.
   * @param test A check whether this command should cancel
   * @param message The message to cancel this command with, if it should be
   */
  public assert(test: boolean, message: string) {
    if (!test) this.cancel(message);
    return this;
  }

  public async run() {
    this._status = Status.RUNNING;
    this._emit('start');

    try {
      for (const fn of this.handles.pre) await new Hook(fn);
      await this.pre();
      await this.exec();
      await this.post();
      for (const fn of this.handles.post) await new Hook(fn);

      this._status = Status.COMPLETED;
      this._emit('complete');
    } catch (e) {
      if (!this.terminated) this._status = Status.FAILED;

      if (this.status === Status.CANCELLED) {
        if (this._willHandle('cancel')) {
          this._emit('cancel', e);
        } else {
          if (e.code === Code.COMMAND_CANCELLED) this.response.send('Command cancelled.');
          else if (e.code === Code.ARGUMENT_MISSING) this.response.send(`Argument \`${e.details}\` was not provided.`);
        }
      } else {
        if (!this._willHandle('error')) this.response.send(`Command failed: \`${e}\``);
        this._emit('error', e);
      }
    } finally {
      this._emit('finish');
    }
  }

  /**
   * Immediately cancel this command.
   * @param err The error that cancelled the command
   * @param args Any other args to emit with the error
   */
  public cancel(err?: Error | number | string | HandlesError, ...args: any[]): never {
    this._status = Status.CANCELLED;

    if (typeof err === 'number') err = new HandlesError(err);
    else if (typeof err === 'string' || typeof err === 'undefined') err = new HandlesError(Code.COMMAND_CANCELLED, err);
    else if (err instanceof Error) err = new HandlesError(Code.COMMAND_CANCELLED, err.message);

    throw err;
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

  protected _emit(event: string, ...data: any[]) {
    this.handles.emit(event, ...data, this);
    if (event !== 'error' || this.listenerCount('error')) this.emit(event, ...data);
  }

  /**
   * Check whether there are any event listeners for the given event
   * @param event The event that might be emitted
   */
  protected _willHandle(event: string) {
    return Boolean(this.listenerCount(event) || this.handles.listenerCount(event));
  }
}
