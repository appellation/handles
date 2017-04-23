/**
 * Represents a command argument.
 */
class Argument {

    /**
     * @param {String} [prompt] - The prompt text with which to initially query the command issuer.
     * @param {String} [rePrompt] - The prompt text with which to query the user upon prompt failure.
     */
    constructor(prompt, rePrompt) {
        /**
         * @type {String}
         */
        this.prompt = prompt;

        /**
         * @type {String}
         */
        this.rePrompt = rePrompt;

        /**
         * @type {Boolean}
         */
        this.optional = false;

        /**
         * @type {Function}
         */
        this.resolver = () => null;

        /**
         * @type {RegExp}
         */
        this.pattern = /^\S+/;
    }

    get pattern() {
        return this._pattern;
    }

    set pattern(regex) {
        this._pattern = regex;
        this.matcher = content => {
            const m = content.match(regex);
            return m === null ? '' : m[0];
        };
    }

    /**
     * Set the prompt for the argument.
     * @param {String} [prompt=null] - The prompt.
     * @returns {Argument}
     */
    setPrompt(prompt = null) {
        this.prompt = prompt;
        return this;
    }

    /**
     * Set whether the argument is optional.
     * @param {Boolean} [optional=true] - True if the argument is optional.
     * @returns {Argument}
     */
    setOptional(optional = true) {
        this.optional = optional;
        return this;
    }

    /**
     * Set the argument resolver function for this argument.
     * @param {Function} [resolver] - The resolver (defaults to returning null).
     * @returns {Argument}
     */
    setResolver(resolver = () => null) {
        this.resolver = resolver;
        return this;
    }
}

module.exports = Argument;
