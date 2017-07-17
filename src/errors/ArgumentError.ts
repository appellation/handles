import BaseError from './BaseError';
import Argument from '../Argument';

export default class ArgumentError extends BaseError {
  public argument: Argument;

  constructor(arg: Argument, reason: string) {
    super(reason);
    this.argument = arg;
  }
}
