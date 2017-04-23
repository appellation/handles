/**
 * To prompt for arguments.
 */
class Prompter {
    /**
     * @param {Response} response
     */
    constructor(response) {

        /**
         * The responder to use for prompting.
         * @type {Response}
         */
        this.response = response;
        this.response.edit = false;
    }

    /**
     * Collect prompts for an argument.
     * @param {Argument} arg - The argument to prompt for.
     * @param {Boolean} valid - Whether this argument was valid on prior prompt.
     * @returns {Promise} - The result of the resolver.  Reject with `string` reason
     * that the collector failed.
     */
    collectPrompt(arg, valid = true) {
        const text = valid ? arg.prompt : arg.rePrompt;
        return this.awaitResponse(text).then(response => {
            if(response.content === 'cancel') throw 'cancelled';
            const resolved = arg.resolver(response.content, response);
            if(resolved === null) return this.collectPrompt(arg, false);
            return resolved;
        }).catch(reason => {
            return this.response.error('Command cancelled.').then(() => reason).catch(() => reason).then(r => Promise.reject(r));
        });
    }

    /**
     * Wait for a response to some text.
     * @param {String} text - The text to send prior to waiting.
     * @returns {Message}
     */
    awaitResponse(text) {
        return this.response.send(text).then(() => {
            return this.response.message.channel.awaitMessages(m => m.author.id === this.response.message.author.id, { time: 30000, max: 1, errors: ['time'] });
        }).then(responses => {
            return responses.first();
        });
    }
}

module.exports = Prompter;
