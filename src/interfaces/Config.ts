import { ClientOptions } from 'discord.js';
import { MessageValidator } from '../core/CommandHandler';
import Response from '../structures/Response';

export interface IConfig {
  /**
   * Command prefixes (will not be used if a [[validator]] is provided).
   */
  prefixes?: Set<string>;

  /**
   * A global setting for configuring the argument suffix.
   */
  argsSuffix?: string;

  /**
   * Directory to load commands from. Default to `./commands` relative to the cwd.
   */
  directory?: string;

  /**
   * This will get run on every message. Use to manually determine whether a message is a command.
   */
  validator?: MessageValidator;

  /**
   * Set to false to resolve/reject the command handling process properly. When true,
   * the command handler promise will always resolve with void (you should use the events
   * [[HandlesClient#commandFailed]] and [[HandlesClient#commandFinished]] to check completion status in this
   * case).
   */
  silent?: boolean;

  /**
   * Whether to automatically listen for commands. If you specify this as false, you'll have to
   * `handles.handle(message)` in your message listener.
   */
  autoListen?: boolean;
}
