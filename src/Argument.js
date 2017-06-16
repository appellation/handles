/**
 * This is called every time new potential argument data is received, either in the body of
 * the original command or in subsequent prompts.
 * @typedef {function} ArgumentResolver
 * @param {string} content - The remaining unknown content of the command.  For instance,
 * if a command is `play stuff`, this param will be `stuff`: if this returns anything other
 * than `null`, the next argument resolver will be called with an empty string.
 * @param {Message} message - The message for which this argument resolver
 * is running.
 * @returns {*} - If null, the argument is considered unresolved.
 */

/**
 * Represents a command argument.
 */
class Argument {

  /**
   * @param {string} key The key that this arg will be set to.
   * @param {Object} [data] An object with any of the properties of this class.
   */
  constructor(key, {
    prompt = '',
    rePrompt = '',
    optional = false,
    resolver = c => c || null,
    timeout = 30,
    suffix = null,
    pattern = /^\S+/
  } = {}) {
    /**
     * The key that this arg will be set to.
     * @type {string}
     * @example
     * // in args definition
     * new Argument('thing');
     *
     * // in command execution
     * const thingData = command.args.thing;
     */
    this.key = key;

    /**
     * The initial prompt text of this argument.
     * @type {string}
     */
    this.prompt = prompt;

    /**
     * Text sent for re-prompting to provide correct input when provided input is not resolved
     * (ie. the resolver returns null).
     * @see ArgumentResolver
     * @type {string}
     */
    this.rePrompt = rePrompt;

    /**
     * Whether this argument is optional.
     * @type {boolean}
     */
    this.optional = optional;

    /**
     * The argument resolver for this argument.
     * @type {ArgumentResolver}
     */
    this.resolver = resolver;

    /**
     * How long to wait for a response to a prompt, in seconds.
     * @type {number}
     */
    this.timeout = timeout;

    /**
     * Text to append to each prompt.  Defaults to global setting or built-in text.
     * @type {?string}
     */
    this.suffix = suffix;

    /**
     * A regex describing the pattern of arguments.  Defaults to single words.  If more advanced matching
     * is required, set a custom `matcher` instead.
     * @see Argument#matcher
     * @type {RegExp}
     */
    this.pattern = pattern;
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
   * This function takes a string which contains any number of arguments and returns the first of them.
   * The return should be a substring of the input, which will then be chopped off the input. The remaining
   * input will be fed back into this function for the next argument, etc. until no more arguments remain.
   * @param {string} content The content.
   * @returns {string} The potential argument string contents (to still be resolved).
   * @see Argument#resolver
   */
  matcher() {
    return '';
  }

  /**
   * Make this argument take up the rest of the words in the command.
   * @returns {Argument}
   */
  setInfinite() {
    return this.setPattern(/.*/);
  }

  /**
   * Set the pattern for matching args strings.
   * @param {RegExp} pattern The pattern to apply to potential args strings.
   * @returns {Argument}
   */
  setPattern(pattern) {
    this.pattern = pattern;
    return this;
  }

  /**
   * Set the prompt for the argument.
   * @param {string} [prompt=null] The prompt.
   * @returns {Argument}
   */
  setPrompt(prompt = null) {
    this.prompt = prompt;
    return this;
  }

  /**
   * Set the re-prompt for the argument.
   * @param {string} [rePrompt=null] The re-prompt text.
   * @returns {Argument}
   */
  setRePrompt(rePrompt = null) {
    this.rePrompt = rePrompt;
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
  setResolver(resolver = content => content || null) {
    this.resolver = resolver;
    return this;
  }

  /**
   * Set the time to wait for a prompt response (in seconds).
   * @param {number} [time=30] The time to wait.
   * @returns {Argument}
   */
  setTimeout(time = 30) {
    this.timeout = time;
    return this;
  }

  /**
   * Set the suffix for all prompts.
   * @param {string} [text=''] The text.
   * @returns {Argument}
   */
  setSuffix(text = '') {
    this.suffx = text;
    return this;
  }
}

module.exports = Argument;
