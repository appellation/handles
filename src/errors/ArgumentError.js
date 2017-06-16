class ArgumentError {
  constructor(arg, reason) {
    this.argument = arg;
    this.reason = reason;
  }
}

module.exports = ArgumentError;
