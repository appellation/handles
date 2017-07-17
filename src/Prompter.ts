import HandlesClient from './Client';
import Response from './Response';
import Argument from './Argument';

import { Message } from 'discord.js';

/**
 * To prompt for arguments.
 */
export default class Prompter {
  public client: HandlesClient;
  public response: Response;

  /**
     * @param {HandlesClient} client
     * @param {Response} response
     */
  constructor(client: HandlesClient, response: Response) {
    /**
     * The handles client.
     * @type {HandlesClient}
     */
    this.client = client;

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
   * @param {boolean} [first=true] - Whether this is the first prompt.
   * @returns {Promise} - The result of the resolver.  Reject with `string` reason
   * that the collector failed.
   */
  collectPrompt(arg: Argument, first = true): Promise<any> {
    const text = first ? arg.prompt : arg.rePrompt;
    const defaultSuffix = this.client.config.argsSuffix || `\nCommand will be cancelled in **${arg.timeout} seconds**.  Type \`cancel\` to cancel immediately.`;
    return this.awaitResponse(text + (arg.suffix || defaultSuffix), arg.timeout * 1000).then(response => {
      if (response.content === 'cancel') throw 'cancelled';
      const resolved = arg.resolver(response.content, response, arg);
      if (resolved === null) return this.collectPrompt(arg, false);
      return resolved;
    });
  }

  /**
   * Wait for a response to some text.
   * @param {string} text - The text to send prior to waiting.
   * @returns {Message}
   */
  awaitResponse(text: string, time = 30000): Promise<Message> {
    return this.response.send(text).then(() => {
      return this.response.message.channel.awaitMessages(m => m.author.id === this.response.message.author.id, { time, max: 1, errors: ['time'] });
    }).then(responses => {
      return responses.first();
    });
  }
}
