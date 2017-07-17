import CommandMessage from './CommandMessage';
import Prompter from './Prompter';
import ArgumentError from './errors/ArgumentError';

import { Message } from 'discord.js';

export type Resolver = (content: string, message: Message, arg: Argument) => any | null;
export type Options = {
  key: string,
  prompt: string,
  rePrompt: string,
  optional: boolean,
  resolver: Resolver,
  timeout: number,
  pattern: RegExp,
  suffix?: string
};
export type Matcher = (content: string) => string | null;

/**
 * This is called every time new potential argument data is received, either in the body of
 * the original command or in subsequent prompts.
 * @typedef {function} ArgumentResolver
 * @param {string} content - The remaining unknown content of the command.  For instance,
 * if a command is `play stuff`, this param will be `stuff`: if this returns anything other
 * than `null`, the next argument resolver will be called with an empty string.
 * @param {CommandMessage} message - The command message for which this argument resolver
 * is running.
 * @param {Argument} arg - This argument.
 * @returns {*} - If null, the argument is considered unresolved.
 */

/**
 * Represents a command argument.
 */
export default class Argument implements Options {

  public key: string;
  public prompt: string;
  public rePrompt: string;
  public optional: boolean = false;
  public resolver: Resolver;
  public timeout: number;
  public suffix?: string;
  public matcher: Matcher;

  private _pattern: RegExp;

  /**
   * @param {string} key The key that this arg will be set to.
   * @param {Object} [data] An object with any of the properties of this class.
   */
  constructor(key: string, {
    prompt = '',
    rePrompt = '',
    optional = false,
    resolver = (content: string) => content || null,
    timeout = 30,
    suffix = null,
    pattern = /^\S+/
  }: Options) {

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
     * is required, set a custom `matcher` instead.  Can pull arguments from anywhere in the unresolved
     * content, so make sure to specify `^` if you want to pull from the front.
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

    /**
     * This function takes a string which contains any number of arguments and returns the first of them.
     * The return should be a substring of the input, which will then be chopped off the input. The remaining
     * input will be fed back into this function for the next argument, etc. until no more arguments remain.
     * @type {Function}
     * @param {string} content The content.
     * @returns {string} The potential argument string contents (to still be resolved).
     * @see Argument#pattern
     */
    this.matcher = content => {
      const m = content.match(regex);
      return m === null ? '' : m[0];
    };
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
  setPattern(pattern: RegExp) {
    this.pattern = pattern;
    return this;
  }

  /**
   * Set the prompt for the argument.
   * @param {string} [prompt=null] The prompt.
   * @returns {Argument}
   */
  setPrompt(prompt: string = null) {
    this.prompt = prompt;
    return this;
  }

  /**
   * Set the re-prompt for the argument.
   * @param {string} [rePrompt=null] The re-prompt text.
   * @returns {Argument}
   */
  setRePrompt(rePrompt: string = null) {
    this.rePrompt = rePrompt;
    return this;
  }

  /**
   * Set whether the argument is optional.
   * @param {boolean} [optional=true] - True if the argument is optional.
   * @returns {Argument}
   */
  setOptional(optional: boolean = true) {
    this.optional = optional;
    return this;
  }

  /**
   * Set the argument resolver function for this argument.
   * @param {function} [resolver] - The resolver (defaults to returning null).
   * @returns {Argument}
   */
  setResolver(resolver: Resolver = content => content || null) {
    this.resolver = resolver;
    return this;
  }

  /**
   * Set the time to wait for a prompt response (in seconds).
   * @param {number} [time=30] The time to wait.
   * @returns {Argument}
   */
  setTimeout(time: number = 30) {
    this.timeout = time;
    return this;
  }

  /**
   * Set the suffix for all prompts.
   * @param {string} [text=''] The text.
   * @returns {Argument}
   */
  setSuffix(text: string = '') {
    this.suffix = text;
    return this;
  }

  run(command: CommandMessage) {
    const matched = this.matcher(command.body);
    if (typeof matched !== 'string') return Promise.reject(new Error('Argument matchers must return a substring of the command body.'));
    command.body = command.body.replace(matched, '').trim();

    return Promise.resolve(this.resolver(matched, command.message, this))
      .then(resolved => {
        if (resolved === null) {
          if (this.optional && !matched.length) {
            return null;
          } else {
            const Response = command.config.Response;
            const prompter = new Prompter(command.handles, new Response(command.message, false));
            return prompter.collectPrompt(this, matched.length === 0)
              .catch((reason: string) => {
                command.response.send('Command cancelled.');
                return Promise.reject(new ArgumentError(this, reason));
              });
          }
        } else {
          return resolved;
        }
      })
      .then(value => {
        if (!command.args) command.args = {};
        command.args[this.key] = value;
        return value;
      });
  }
}
