const BaseError = require('./BaseError');

class ValidationError extends BaseError {
  constructor(validator) {
    super(validator.reason);
    this.validator = validator;
  }
}

module.exports = ValidationError;
