import HandlesClient from '../core/Client';
import ArgumentError from '../errors/ArgumentError';
import Argument from '../middleware/Argument';
import Response from './Response';

import { Message } from 'discord.js';

/**
 * To prompt for arguments.
 */
export default class Prompter {
  /**
   * The handles client.
   */
  public handles: HandlesClient;

  /**
   * The responder to use for prompting.
   */
  public response: Response;

  constructor(client: HandlesClient, response: Response) {
    this.handles = client;
    this.response = response;
    this.response.edit = false;
  }

  /**
   * Collect prompts for an argument.
   * @param arg The argument for which to prompt.
   * @param first Whether this is the first prompt.
   */
  public async collectPrompt(arg: Argument, first = true): Promise<any> {
    const text = first ? arg.prompt : arg.rePrompt;
    const defaultSuffix = arg.suffix || this.handles.argsSuffix ||
      `\nCommand will be cancelled in **${arg.timeout} seconds**.  Type \`cancel\` to cancel immediately.`;

    const response = await this.awaitResponse(text + defaultSuffix, arg.timeout * 1000);
    if (response.content === 'cancel') throw new ArgumentError(arg, 'cancelled');

    const resolved = await arg.resolver(response.content, response, arg);
    if (resolved === null) return this.collectPrompt(arg, false);

    return resolved;
  }

  /**
   * Wait for a response to some text.
   * @param text The text for which to await a response.
   * @param time The time (in ms) for which to wait.
   */
  public async awaitResponse(text: string, time = 30000): Promise<Message> {
    await this.response.send(text);

    const responses = await this.response.channel.awaitMessages(
      (m: Message) => m.author.id === this.response.message.author.id,
      { time, max: 1, errors: ['time'] },
    );
    return responses.first();
  }
}
