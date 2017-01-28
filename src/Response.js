/**
 * Created by Will on 1/28/2017.
 */
module.exports = class Response {

    /**
     * @constructor
     * @param {Message} message
     */
    constructor(message)    {

        /**
         * @type {TextChannel}
         */
        this.channel = message.channel;
    }

    send(data)  {
        return this.channel.send(data);
    }

    /**
     * Send a message indicating success.
     * @param {String} text
     * @return {Promise.<Message>}
     */
    success(text)   {
        return this.channel.sendMessage(`\`✅\` | **Success:** ${text}`);
    }

    /**
     * Send an error message.
     * @param {String} text
     * @return {Promise.<Message>}
     */
    error(text) {
        return this.channel.sendMessage(`\`❌\` | **Error:** ${text}`)
    }
};