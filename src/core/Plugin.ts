import Context from '../structures/Context';
import HandlesError, { Code } from '../util/Error';
import Runnable from '../util/Runnable';

export enum Status {
  INSTANTIATED,
  RUNNING,
  COMPLETED,
  CANCELLED,
  FAILED,
}

export interface InstantiablePlugin {
  new(context: Context): Plugin;
}

export default abstract class Plugin extends Runnable<Plugin> {
  public abstract id: string;
  protected _status: Status = Status.INSTANTIATED;

  constructor(public readonly context: Context) {
    super();
  }

  public get status(): Status {
    return this._status;
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

  /**
   * Immediately cancel this command.
   * @param err The error that cancelled the command
   */
  public cancel(err?: Error | Code | string | HandlesError): never {
    this._status = Status.CANCELLED;

    if (typeof err === 'number') err = new HandlesError(err);
    else if (typeof err === 'string' || typeof err === 'undefined') err = new HandlesError(Code.COMMAND_CANCELLED, err);
    else if (err instanceof Error) err = new HandlesError(Code.COMMAND_CANCELLED, err.message);

    throw err;
  }
}
