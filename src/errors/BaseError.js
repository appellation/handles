class BaseError {
  constructor(message) {
    this.message = message;
  }

  toString() {
    return this.message;
  }
}

module.exports = BaseError;
