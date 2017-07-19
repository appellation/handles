import Validator from '../Validator';
import BaseError from './BaseError';

export default class ValidationError extends BaseError {
  public validator: Validator;

  constructor(validator: Validator) {
    super(validator.reason || 'Validation failed.');
    this.validator = validator;
  }
}
