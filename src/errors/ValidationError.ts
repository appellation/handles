import Validator from '../middleware/Validator';
import BaseError from './BaseError';

/**
 * Used to represent a user error with validation (e.g. the command was invalid).
 */
export default class ValidationError extends BaseError {
  /**
   * The validator that errored.
   */
  public validator: Validator;

  constructor(validator: Validator) {
    super(validator.reason || 'Validation failed.');
    this.validator = validator;
  }
}
