import Response from '../Response';
import { MessageValidator } from '../types/MessageValidator';

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
   * Set this to enable mention prefix.
   */
  userID?: string;

  /**
   * Directory to load commands from. Default to `./commands` relative to the cwd.
   */
  directory?: string;

  /**
   * This will get run on every message. Use to manually determine whether a message is a command.
   */
  validator?: MessageValidator;

  /**
   * A custom response class to use. Should extend the built-in class.
   */
  Response?: typeof Response;

  /**
   * Set to false to resolve/reject the command handling process properly. When true,
   * the command handler promise will always resolve with void (you should use the events
   * [[HandlesClient#commandFailed]] and [[HandlesClient#commandFinished]] to check completion status in this
   * case).
   */
  silent?: boolean;
}
