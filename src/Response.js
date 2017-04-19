const queue = require('queue');

class Response {

    /**
     * @constructor
     * @param {Message} message
     */
    constructor(message, edit = true)    {

        /**
         * @type {Message}
         */
        this.message = message;

        /**
         * @type {TextChannel}
         */
        this.channel = message.channel;

        /**
         * @type {boolean} edit Whether to edit previous responses. half a
         */
        this.edit = edit;

        /**
         * @type {Message} responseMessage Previously sent responses will be edited.
         */
        this.responseMessage = null;

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
     * @returns {Promise<Message>}
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

    dm(data) {
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
}

module.exports = Response;
