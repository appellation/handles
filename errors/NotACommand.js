/**
 * Created by Will on 12/15/2016.
 */

/**
 * Used whenever a potential command has been determined as not a command.
 */
class NotACommand extends Error {
    constructor(message)   {
        super();
        this.msg = message;
        this.message = 'Not a command.';
    }
}

module.exports = NotACommand;