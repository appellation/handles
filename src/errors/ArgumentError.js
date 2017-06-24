const BaseError = require('./BaseError');

class ArgumentError extends BaseError {
  constructor(arg, reason) {
    super(reason);
    this.argument = arg;
  }
}

module.exports = ArgumentError;
