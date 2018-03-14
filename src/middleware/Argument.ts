import HandlesClient from '../core/Client';
import Command from '../structures/Command';
import Response from '../structures/Response';
import HandlesError, { Code } from '../util/Error';
import Runnable from '../util/Runnable';

import { Collection, Message, MessageCollector } from 'discord.js';

export type Resolver<T> = (content: string, message: Message, arg: Argument<T>) => T;

export interface IOptions<T> {
  cancel?: string | RegExp;
  prompt?: string;
  rePrompt?: string;
  optional?: boolean;
  respond?: boolean;
  resolver?: Resolver<T>;
  timeout?: number;
  pattern?: RegExp;
  suffix?: string | null;
  error?: (err: any) => any;
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
export default class Argument<T = string> extends Runnable<T | undefined> implements IOptions<T> {
  public readonly command: Command;

  /**
   * The key that this arg will be set to.
   *
   * ```js
   * // in command `pre` method
   * new Argument(this, 'thing');
   *
   * // in command execution
   * const thingData = this.args.thing;
   * ```
   */
  public key: string;

  /**
   * Whether to prompt.
   */
  public prompt?: string;

  /**
   * Whether this argument is optional.
   */
  public optional: boolean = false;

  /**
   * How long to wait for a response to a prompt, in seconds.
   */
  public timeout: number = 30;

  /**
   * Text to append to each prompt.  Defaults to global setting or built-in text.
   */
  public suffix: string | null;

  /**
   * A regex describing the pattern of arguments.  Defaults to single words.  If more advanced matching
   * is required, set a custom [[matcher]] instead.  Can pull arguments from anywhere in the unresolved
   * content, so make sure to specify `^` if you want to pull from the front.
   */
  public pattern: RegExp = /^\S+/;

  /**
   * Pattern to match for prompt cancellations.
   */
  public cancel: string | RegExp = 'cancel';

  /**
   * Current message collector for prompting.
   */
  private _collector?: MessageCollector;

  constructor(command: Command, key: string, opts: IOptions<T> = {}) {
    super();
    this.command = command;
    this.key = key;

    if (opts.prompt) this.prompt = opts.prompt;
    if (typeof opts.optional === 'boolean') this.optional = opts.optional;
    if (typeof opts.timeout === 'number') this.timeout = opts.timeout;
    if (opts.cancel) this.cancel = opts.cancel;
    this.suffix = opts.suffix ||
       `\nCommand will be cancelled in **${this.timeout} seconds**. Type \`${this.cancel}\` to cancel immediately.`;
    if (opts.pattern) this.pattern = opts.pattern;
    if (opts.resolver) this.resolver = opts.resolver;
  }

  get handles(): HandlesClient {
    return this.command.handles;
  }

  /**
   * Resolve a string as an argument segment. Unless overridden, matches remaining command body content
   * against [[Argument#pattern]].
   */
  public matcher: Matcher = (content: string) => {
    const m = content.match(this.pattern);
    return m === null ? '' : m[0];
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
  public setPrompt(prompt: string) {
    this.prompt = prompt;
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
  public resolver: Resolver<T> = (content) => {
    return content as any;
  }

  public async run() {
    let content: string = this.matcher(this.command.body);
    this.command.body = this.command.body.replace(content, '').trim();
    let resolved: T | undefined;

    while (!resolved) {
      let prompt: string;

      // if there is content, attempt to resolve it
      if (content) {
        try {
          resolved = await this.resolver(content, this.command.message, this);
          break;
        } catch (e) {
          prompt = e ? e.message || e : this.prompt;
        }
      } else {
        // if there is no matched content: cancel resolution, prompt, or fail based on config
        if (this.optional) return;
        if (this.prompt) {
          prompt = this.prompt;
        } else {
          return this.command.cancel(new HandlesError(Code.ARGUMENT_MISSING, this.key));
        }
      }

      // prompt for resolution
      try {
        const msg = await this._collectPrompt(prompt);
        if (msg.content.match(this.cancel)) this.command.cancel(new HandlesError(Code.COMMAND_CANCELLED, 'user'));
        content = msg.content;
      } catch (e) {
        this.command.cancel(e);
      }
    }

    return this.command.args[this.key] = resolved;
  }

  private async _collectPrompt(text: string): Promise<Message> {
    // get first response
    const prompt = new Response(this.command.message, false);
    await prompt.send(text + this.suffix);

    this._collector = prompt.channel.createCollector(
      (m: Message) => m.author.id === this.command.author.id,
      { time: this.timeout * 1000, max: 1, errors: ['time'] } as any,
    );

    const responses = await new Promise<Collection<string, Message>>((resolve, reject) => {
      if (this._collector) {
        (this._collector as any).once('end', (collected: Collection<string, Message>, reason: string) => {
          if (collected.size) resolve(collected);
          else reject(reason);
        });
      }
    });

    return responses.first();
  }
}
