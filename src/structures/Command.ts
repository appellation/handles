import path = require('path');
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
  public static triggers: Trigger | Trigger[] = path.basename(__filename, '.js');

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

  protected async _run(): Promise<this> {
    const ctor: typeof Command = this.constructor as typeof Command;
    if (!Array.isArray(ctor.triggers)) ctor.triggers = [ctor.triggers];

    let trigger: Trigger | undefined;
    let found: boolean = false;
    for (trigger of ctor.triggers) {
      if (trigger instanceof RegExp && trigger.test(this.context.body)) {
        found = true;
        break;
      } else if (typeof trigger === 'string' && this.context.body.startsWith(trigger)) {
        found = true;
        break;
      }
    }

    if (!trigger) return this;
    this._status = Status.RUNNING;

    if (found) {
      if (typeof trigger === 'function') trigger = trigger(this.context);
      this.context.body = this.context.body.replace(trigger, '');
    }

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
