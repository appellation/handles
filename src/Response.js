const queue = require('queue');

/**
 * Send responses to a message.
 */
class Response {

    /**
     * @param {Message} message The message to respond to.
     * @param {boolean} edit Whether to edit previous responses.
     */
    constructor(message, edit = true)    {

        /**
         * The message to respond to.
         * @type {Message}
         */
        this.message = message;

        /**
         * The channel to send responses in.
         * @type {TextChannel}
         */
        this.channel = message.channel;

        /**
         * Whether to edit previous responses.
         * @type {boolean}
         */
        this.edit = edit;

        /**
         * Previously sent responses will be edited.
         * @type {Message}
         */
        this.responseMessage = null;

        /**
         * The queue of responses that are being sent.
         * @type {Array}
         * @private
         */
        this._q = queue({
            autostart: true,
            concurrency: 1
        });
    }

    /**
     * Send a message using the Discord.js `Message.send` method.  If a prior
     * response has been sent, it will edit that unless the `force` parameter
     * is set.
     * @param {*} data The data to send
     * @param {boolean} [force=false] Whether to send a new message regardless
     * of any prior responses.
     * @returns {Promise.<Message>}
     */
    send(data, force = false)  {
        return new Promise((resolve, reject) => {
            this._q.push(cb => {
                if(this.responseMessage && this.edit && !force) {
                    const edited = this.responseMessage.edit(data);
                    edited.then((m) => {
                        cb(null, m);
                        resolve(m);
                    }).catch((e) => {
                        cb(e);
                        reject(e);
                    });
                } else {
                    this.channel.send(data).then(m => {
                        this.responseMessage = m;
                        cb(null, m);
                        resolve(m);
                    }).catch(e => {
                        cb(e);
                        reject(e);
                    });
                }
            });
        });
    }

    /**
     * Send a DM to the message author.
     * @param {*} data The data to send.
     * @returns {Promise.<Message>}
     */
    dm(data) {
        return this.message.author.send(data);
    }

    /**
     * Send a message indicating success.
     * @param {string} text The text to send.
     * @param {string} [prefix] Content to prefix the message with (mainly intended for mentions).
     * @return {Promise.<Message>}
     */
    success(text, prefix)   {
        return this.send(`${prefix ? `${prefix} | ` : ''}\`✅\` | ${text}`);
    }

    /**
     * Send an error message.
     * @param {string} text The error to send.
     * @return {Promise.<Message>}
     */
    error(text) {
        return this.send(`\`❌\` | ${text}`);
    }
}

module.exports = Response;
