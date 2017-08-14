import Argument from '../middleware/Argument';
import BaseError from './BaseError';

/**
 * Used to represent a user error with collecting arguments.
 */
export default class ArgumentError extends BaseError {
  /**
   * The argument that has errored.
   */
  public argument: Argument;

  constructor(arg: Argument, reason: string) {
    super(reason);
    this.argument = arg;
  }
}
