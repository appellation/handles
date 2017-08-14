import { Message } from 'discord.js';

/**
 * ```js
 * const handler = new handles.Client({
 *   validator: (msg) => {
 *     // this will validate any message in a DM and/or starting with `memes` as a command.
 *     const prefix = /^memes/;
 *     if(prefix.test(msg.content) || msg.channel.type === 'dm') return msg.content.replace(prefix, '');
 *   }
 * });
 * ```
 */
export type MessageValidator = (m: Message) => string | null;
