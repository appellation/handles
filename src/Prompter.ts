import HandlesClient from './Client';
import Argument from './middleware/Argument';
import Response from './Response';

import { Message } from 'discord.js';

/**
 * To prompt for arguments.
 */
export default class Prompter {
  /**
   * The handles client.
   */
  public client: HandlesClient;

  /**
   * The responder to use for prompting.
   */
  public response: Response;

  constructor(client: HandlesClient, response: Response) {
    this.client = client;
    this.response = response;
    this.response.edit = false;
  }

  /**
   * Collect prompts for an argument.
   * @param arg The argument for which to prompt.
   * @param first Whether this is the first prompt.
   */
  public collectPrompt(arg: Argument, first = true): Promise<any> {
    const text = first ? arg.prompt : arg.rePrompt;
    const defaultSuffix = this.client.config.argsSuffix ||
      `\nCommand will be cancelled in **${arg.timeout} seconds**.  Type \`cancel\` to cancel immediately.`;

    return this.awaitResponse(text + (arg.suffix || defaultSuffix), arg.timeout * 1000).then((response) => {
      if (response.content === 'cancel') throw 'cancelled'; // tslint:disable-line no-string-throw
      const resolved = arg.resolver(response.content, response, arg);
      if (resolved === null) return this.collectPrompt(arg, false);
      return resolved;
    });
  }

  /**
   * Wait for a response to some text.
   * @param text The text for which to await a response.
   * @param time The time (in seconds) for which to wait.
   */
  public awaitResponse(text: string, time = 30000): Promise<Message> {
    return this.response.send(text).then(() => {
      return this.response.message.channel.awaitMessages(
        (m) => m.author.id === this.response.message.author.id, { time, max: 1, errors: ['time'] },
      );
    }).then((responses) => {
      return responses.first();
    });
  }
}
