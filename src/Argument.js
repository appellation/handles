/**
 * This is called every time new potential argument data is received, either in the body of
 * the original command or in subsequent prompts.
 * @typedef {function} ArgumentResolver
 * @param {string} content - The remaining unknown content of the command.  For instance,
 * if a command is `play stuff`, this param will be `stuff`: if this returns anything other
 * than `null`, the next argument resolver will be called with an empty string.
 * @param {CommandMessage} message - The command message for which this argument resolver
 * is running.
 * @returns {*} - If null, the argument is considered unresolved.
 */

/**
 * Represents a command argument.
 */
class Argument {

    /**
     * @param {string} [prompt] - The prompt text with which to initially query the command issuer.
     * @param {string} [rePrompt] - The prompt text with which to query the user upon prompt failure.
     */
    constructor(prompt, rePrompt) {
        /**
         * The initial prompt text of this argument.
         * @type {string}
         */
        this.prompt = prompt;

        /**
         * Text sent for re-prompting to provide correct input when provided input is not resolved
         * (ie. the resolver returns null).
         * @see {ArgumentResolver}
         * @type {string}
         */
        this.rePrompt = rePrompt;

        /**
         * Whether this argument is optional.
         * @type {boolean}
         */
        this.optional = false;

        /**
         * The argument resolver for this argument.
         * @type {ArgumentResolver}
         */
        this.resolver = () => null;

        /**
         * How long to wait for a response to a prompt, in seconds.
         * @type {number}
         */
        this.timeout = 30;

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
     * @param {string} [prompt=null] - The prompt.
     * @returns {Argument}
     */
    setPrompt(prompt = null) {
        this.prompt = prompt;
        return this;
    }

    /**
     * Set whether the argument is optional.
     * @param {boolean} [optional=true] - True if the argument is optional.
     * @returns {Argument}
     */
    setOptional(optional = true) {
        this.optional = optional;
        return this;
    }

    /**
     * Set the argument resolver function for this argument.
     * @param {function} [resolver] - The resolver (defaults to returning null).
     * @returns {Argument}
     */
    setResolver(resolver = () => null) {
        this.resolver = resolver;
        return this;
    }

    setTimeout(time = 30) {
        this.timeout = time;
        return this;
    }
}

module.exports = Argument;
