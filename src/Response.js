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
     * is set.  Automatically attempts to fallback to DM responses.  You can
     * send responses without waiting for prior responses to succeed.
     * @param {*} data The data to send
     * @param {MessageOptions} [options={}] Message options.
     * @param {boolean} [catchall=true] Whether to catch all rejections when sending.  The promise
     * will always resolve when this option is enabled; if there is an error, the resolution will
     * be undefined.
     * @param {boolean} [force=false] Whether to send a new message regardless
     * of any prior responses.
     * @returns {Promise.<Message>}
     */
    send(data, options = {}, catchall = true, force = false)  {
        return new Promise((resolve, reject) => {
            this._q.push(cb => {
                function success(m) {
                    cb(null, m);
                    resolve(m);
                }

                function error(e) {
                    if(catchall) return success();
                    cb(e);
                    reject(e);
                }


                if(this.responseMessage && this.edit && !force) {
                    this.responseMessage.edit(data).then(success, error);
                } else {
                    this.channel.send(data, options).then(m => {
                        this.responseMessage = m;
                        success(m);
                    }, () => {
                        if (this.channel.type === 'text') this.message.author.send(data, options).then(success, error);
                    });
                }
            });
        });
    }

    /**
     * Set this response to be in a DM and optionally send data.
     * @param {...*} args Arguments in Response#send.
     * @see Response#send
     * @returns {Promise.<Message>}
     */
    dm(...args) {
        this.channel = this.message.author;
        return this.send(...args);
    }

    /**
     * Send a message indicating success.
     * @param {string} text The text to send.
     * @param {string} [prefix] Content to prefix the message with (mainly intended for mentions).
     * @return {Promise.<Message>}
     */
    success(text, prefix, ...args)   {
        return this.send(`${prefix ? `${prefix} | ` : ''}\`✅\` | ${text}`, ...args);
    }

    /**
     * Send an error message.
     * @param {string} text The error to send.
     * @return {Promise.<Message>}
     */
    error(text, ...args) {
        return this.send(`\`❌\` | ${text}`, ...args);
    }
}

module.exports = Response;
