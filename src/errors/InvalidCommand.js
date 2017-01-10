
class InvalidCommand extends Error   {
    /**
     * @constructor
     * @param {Message} message
     * @param {Command} command
     * @param {String} reason
     */
    constructor(message, command, reason)   {
        super();
        this.msg = message;
        this.command = command;
        this.message = reason;
    }
}

module.exports = InvalidCommand;