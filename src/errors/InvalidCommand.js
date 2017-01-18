
class InvalidCommand extends Error   {
    /**
     * @constructor
     * @param {CommandMessage} message
     * @param {String} reason
     */
    constructor(message, reason)   {
        super();
        this.message = message;
        this.message = reason;
    }
}

module.exports = InvalidCommand;