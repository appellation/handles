import { ClientOptions } from 'discord.js';
import { CommandResolver } from '../core/CommandHandler';
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
  validator?: CommandResolver;

  /**
   * Set to false to resolve/reject the command handling process properly. When true,
   * the command handler promise will always resolve with void (you should use the events
   * [[HandlesClient#commandFailed]] and [[HandlesClient#commandFinished]] to check completion status in this
   * case).
   */
  silent?: boolean;

  /**
   * By default, Handles will automatically add any event listeners it needs in order to process commands. Set this to
   * false if you want to add listeners yourself.
   */
  listen?: boolean;
}
