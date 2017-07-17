import BaseError from './BaseError';
import Validator from '../Validator';

class ValidationError extends BaseError {
  public validator: Validator;

  constructor(validator: Validator) {
    super(validator.reason);
    this.validator = validator;
  }
}

module.exports = ValidationError;
