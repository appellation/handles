import Argument from '../middleware/Argument';
import BaseError from './BaseError';

/**
 * Used to represent a user error with collecting arguments.
 */
export default class ArgumentError<T> extends BaseError {
  /**
   * The argument that has errored.
   */
  public argument: Argument<T>;

  constructor(arg: Argument<T>, reason: string) {
    super(reason);
    this.argument = arg;
  }
}
