import Plugin from '../core/Plugin';
import Context from './Context';

export type Trigger = string | RegExp | ((ctx: Context) => string);

export interface InstantiableCommand {
  triggers?: Trigger | Trigger[];
  new (message: Context, body?: string): Command;
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
export default abstract class Command extends Plugin implements ICommand {
  /**
   * Triggers for this command.
   */
  public static triggers?: Trigger | Trigger[];

  public static makeID(context: Context) {
    return `${context.authorID}:${context.channel.id}`;
  }

  /**
   * Ensure unique commands for an author in a channel.
   * Format: "authorID:channelID"
   */
  public get id() {
    return Command.makeID(this.context);
  }

  /**
   * The status of this command.
   */
  public get status() {
    return this._status;
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

  protected async _run() {
    this._status = Status.RUNNING;

    try {
      await this.pre();
      await this.exec();
      await this.post();

      this._status = Status.COMPLETED;
    } catch (e) {
      if (!this.terminated) this._status = Status.FAILED;
    }

    return this;
  }
}
