
/**
 * Used whenever a potential command has been determined as not a command.
 */
class NotACommand extends Error {
    constructor(message)   {
        super();
        this.message = message;
    }
}

module.exports = NotACommand;