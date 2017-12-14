import HandlesClient from '../core/Client';
import ArgumentError from '../errors/ArgumentError';
import Command from '../structures/Command';
import Response from '../structures/Response';
import Runnable from '../util/Runnable';

import { Message } from 'discord.js';

export type Resolver<T> = (content: string, message: Message, arg: Argument<T>) => T | null;

export interface IOptions<T> {
  prompt?: string;
  rePrompt?: string;
  optional?: boolean;
  resolver?: Resolver<T>;
  timeout?: number;
  pattern?: RegExp;
  suffix?: string | null;
}

/**
 * This function takes a string which contains any number of arguments and returns the first of them.
 * The return should be a substring of the input, which will then be removed from the input string. The remaining
 * input will be fed back into this function for the next argument, etc. until no more arguments remain. Use this
 * to determine whether an argument *exists*; use [[Argument#resolver]] to determine if the argument is *valid*.
 */
export type Matcher = (content: string) => string;

/**
 * Represents a command argument.
 */
export default class Argument<T = string> extends Runnable<T | null> implements IOptions<T> {
  public readonly command: Command;

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

  constructor(command: Command, key: string, {
    prompt = '',
    rePrompt = '',
    optional = false,
    timeout = 30,
    suffix = null,
    pattern = /^\S+/,
    resolver,
  }: IOptions<T> = {}) {
    super();
    this.command = command;
    this.key = key;

    this.prompt = prompt;
    this.rePrompt = rePrompt;
    this.optional = optional;
    this.timeout = timeout;
    this.suffix = suffix;
    this.pattern = pattern;
    if (resolver) this.resolver = resolver;
  }

  get handles(): HandlesClient {
    return this.command.handles;
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
   * Make this argument take up the rest of the words in the command. Any remaining required arguments
   * will be prompted for.
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
  public setResolver(resolver: Resolver<T>) {
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

  /**
   * This is called every time new potential argument data is received, either in the body of
   * the original command or in subsequent prompts.
   */
  public resolver(content: string, message: Message, arg: Argument<T>): T | null {
    return content as any;
  }

  public async run() {
    const matched = this.matcher(this.command.body);
    this.command.body = this.command.body.replace(matched, '').trim();

    let resolved = !matched ? null : await this.resolver(matched, this.command.message, this);

    // if there is no matched content and the argument is not optional, collect a prompt
    if (resolved === null && !this.optional) {
      try {
        resolved = await this.collectPrompt(matched.length === 0);
      } catch (e) {
        this.command.response.send('Command cancelled.');
        if (typeof e === 'string') e = new ArgumentError<T>(this, e);
        throw e;
      }
    }

    if (!this.command.args) this.command.args = {};
    this.command.args[this.key] = resolved;

    return resolved;
  }

  private async collectPrompt(first = true): Promise<T> {
    const text = first ? this.prompt : this.rePrompt;
    const suffix = this.suffix || this.handles.argsSuffix ||
      `\nCommand will be cancelled in **${this.timeout} seconds**.  Type \`cancel\` to cancel immediately.`;

    // get first response
    const prompt = new Response(this.command.message);
    await prompt.send(text + suffix);
    const responses = await prompt.channel.awaitMessages(
      (m: Message) => m.author.id === this.command.author.id,
      { time: this.timeout * 1000, max: 1, errors: ['time'] },
    );
    const response = responses.first();

    // cancel
    if (response.content === 'cancel') throw new ArgumentError<T>(this, 'cancelled');

    // resolve: if not, prompt again
    const resolved = await this.resolver(response.content, response, this);
    if (resolved === null) return this.collectPrompt(false);

    return resolved;
  }
}
