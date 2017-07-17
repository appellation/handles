import BaseError from './BaseError';
import Validator from '../Validator';

export default class ValidationError extends BaseError {
  public validator: Validator;

  constructor(validator: Validator) {
    super(validator.reason);
    this.validator = validator;
  }
}
