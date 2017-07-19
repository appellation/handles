import Argument from '../Argument';
import BaseError from './BaseError';

export default class ArgumentError extends BaseError {
  public argument: Argument;

  constructor(arg: Argument, reason: string) {
    super(reason);
    this.argument = arg;
  }
}
