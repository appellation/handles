class CommandError {
  constructor(command, error) {
    this.command = command;
    this.error = error;
  }
}

module.exports = CommandError;
