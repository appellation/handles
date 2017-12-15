import HandlesClient from '../core/Client';
import Command from '../structures/Command';
import Response from '../structures/Response';
import Runnable from '../util/Runnable';

import { Collection, Message, MessageCollector, PartialGuild } from 'discord.js';

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
  public prompt?: string;

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
   * Pattern to match for prompt cancellations.
   */
  public cancel: string | RegExp = 'cancel';

  /**
   * Current message collector for prompting.
   */
  private _collector?: MessageCollector;

  /**
   * The raw content matching regex.
   */
  private _pattern: RegExp;

  constructor(command: Command, key: string, {
    prompt,
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
    this.optional = optional;
    this.timeout = timeout;
    this.suffix = suffix;
    this.pattern = pattern;
    if (resolver) this.resolver = resolver;

    this.command.once('cancel', () => {
      if (this._collector) this._collector.stop('command cancelled');
    });
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
    let content = this.matcher(this.command.body);
    this.command.body = this.command.body.replace(content, '').trim();

    let resolved: T | null = null;
    do {
      try {
        resolved = await this.resolver(content, this.command.message, this);
      } catch (e) {
        if (this.optional) {
          resolved = null;
          break;
        }

        if (!this.prompt) this.command.cancel(e || `Argument \`${this.key}\` is invalid.`);

        try {
          const msg = await this._collectPrompt(e.message || e);
          if (msg.content.match(this.cancel)) this.command.cancel();
          content = msg.content;
        } catch (e) {
          this.command.cancel(e);
        }
      }
    } while (!resolved);

    return this.command.args[this.key] = resolved;
  }

  private async _collectPrompt(text: string): Promise<Message> {
    const suffix = this.suffix || this.handles.argsSuffix ||
      `\nCommand will be cancelled in **${this.timeout} seconds**. Type \`cancel\` to cancel immediately.`;

    // get first response
    const prompt = new Response(this.command.message, false);
    await prompt.send(text + suffix);

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
