/**
 * Created by Will on 1/28/2017.
 */
module.exports = class {

    /**
     * @constructor
     * @param {Message} message
     */
    constructor(message)    {

        /**
         * @type {Message}
         */
        this.message = message;

        /**
         * @type {TextChannel}
         */
        this.channel = message.channel;
    }

    send(data)  {
        return this.channel.send(data);
    }

    dm(data)    {
        return this.message.author.sendMessage(data);
    }

    /**
     * Send a message indicating success.
     * @param {String} text
     * @param {String} [prefix] - Content to prefix the message with (mainly intended for mentions).
     * @return {Promise.<Message>}
     */
    success(text, prefix)   {
        return this.send(`${prefix ? `${prefix} | ` : ''}\`✅\` | ${text}`);
    }

    /**
     * Send an error message.
     * @param {String} text
     * @return {Promise.<Message>}
     */
    error(text) {
        return this.send(`\`❌\` | ${text}`);
    }
};