import CommandMessage from '../CommandMessage';
import ArgumentError from '../errors/ArgumentError';
import { IMiddleware } from '../interfaces/IMiddleware';
import Prompter from '../Prompter';
import Response from '../Response';

import { Message } from 'discord.js';

/**
 * This is called every time new potential argument data is received, either in the body of
 * the original command or in subsequent prompts.
 */
export type Resolver = (content: string, message: Message, arg: Argument) => any | null;

export interface IOptions {
  prompt?: string;
  rePrompt?: string;
  optional?: boolean;
  resolver?: Resolver;
  timeout?: number;
  pattern?: RegExp;
  suffix?: string | null;
}

/**
 * This function takes a string which contains any number of arguments and returns the first of them.
 * The return should be a substring of the input, which will then be removed from the input string. The remaining
 * input will be fed back into this function for the next argument, etc. until no more arguments remain.
 */
export type Matcher = (content: string) => string | null;

/**
 * Represents a command argument.
 */
export default class Argument implements IOptions, IMiddleware {
  /**
   * The key that this arg will be set to.
   *
   * ```js
   * // in args definition
   * new Argument('thing');
   *
   * // in command execution
   * const thingData = command.args.thing;
   * ```
   */
  public key: string;

  /**
   * The initial prompt text of this argument.
   */
  public prompt: string;

  /**
   * Text sent for re-prompting to provide correct input when provided input is not resolved
   * (ie. the resolver returns null).
   */
  public rePrompt: string;

  /**
   * Whether this argument is optional.
   */
  public optional: boolean = false;

  /**
   * The argument resolver for this argument.
   */
  public resolver: Resolver;

  /**
   * How long to wait for a response to a prompt, in seconds.
   */
  public timeout: number;

  /**
   * Text to append to each prompt.  Defaults to global setting or built-in text.
   */
  public suffix: string | null;

  /**
   * The matcher for this argument.
   */
  public matcher: Matcher;

  /**
   * The raw content matching regex.
   */
  private _pattern: RegExp;

  constructor(key: string, {
    prompt = '',
    rePrompt = '',
    optional = false,
    resolver = (content: string) => content || null,
    timeout = 30,
    suffix = null,
    pattern = /^\S+/,
  }: IOptions = {}) {
    this.key = key;
    this.prompt = prompt;
    this.rePrompt = rePrompt;
    this.optional = optional;
    this.resolver = resolver;
    this.timeout = timeout;
    this.suffix = suffix;
    this.pattern = pattern;
  }

  /**
   * A regex describing the pattern of arguments.  Defaults to single words.  If more advanced matching
   * is required, set a custom [[matcher]] instead.  Can pull arguments from anywhere in the unresolved
   * content, so make sure to specify `^` if you want to pull from the front.
   */
  get pattern() {
    return this._pattern;
  }

  set pattern(regex) {
    this._pattern = regex;

    this.matcher = (content) => {
      const m = content.match(regex);
      return m === null ? '' : m[0];
    };
  }

  /**
   * Make this argument take up the rest of the words in the command.
   */
  public setInfinite() {
    return this.setPattern(/.*/);
  }

  /**
   * Set the pattern for matching args strings.
   */
  public setPattern(pattern: RegExp) {
    this.pattern = pattern;
    return this;
  }

  /**
   * Set the prompt for the argument.
   */
  public setPrompt(prompt: string = '') {
    this.prompt = prompt;
    return this;
  }

  /**
   * Set the re-prompt for the argument.
   */
  public setRePrompt(rePrompt: string = '') {
    this.rePrompt = rePrompt;
    return this;
  }

  /**
   * Set whether the argument is optional.
   */
  public setOptional(optional: boolean = true) {
    this.optional = optional;
    return this;
  }

  /**
   * Set the argument resolver function for this argument.
   */
  public setResolver(resolver: Resolver = (content) => content || null) {
    this.resolver = resolver;
    return this;
  }

  /**
   * Set the time to wait for a prompt response (in seconds).
   */
  public setTimeout(time: number = 30) {
    this.timeout = time;
    return this;
  }

  /**
   * Set the suffix for all prompts.
   */
  public setSuffix(text: string = '') {
    this.suffix = text;
    return this;
  }

  public run(command: CommandMessage) {
    const matched = this.matcher(command.body);
    if (typeof matched !== 'string') {
      return Promise.reject(new Error('Argument matchers must return a substring of the command body.'));
    }

    command.body = command.body.replace(matched, '').trim();

    // if there is no matched content, skip straight to prompting if necessary; otherwise resolve first
    return Promise.resolve(!matched ? null : this.resolver(matched, command.message, this))
      .then((resolved) => {
        if (resolved === null) {
          if (this.optional) {
            return null;
          } else {
            const R = command.config.Response || Response;
            const prompter = new Prompter(command.handles, new R(command.message, false));
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
      .then((value) => {
        if (!command.args) command.args = {};
        command.args[this.key] = value;
        return value;
      });
  }
}
