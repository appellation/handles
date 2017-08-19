import CommandMessage from '../structures/CommandMessage';
import { Middleware } from './Middleware';

/**
 * Something that will trigger a command.
 */
export type Trigger = string | RegExp;

/**
 * A function that will get executed when the command is run.
 */
export type CommandExecutor = (m: CommandMessage) => any;

/**
 * A generator function that yields middleware.
 */
export type CommandMiddleware = (m: CommandMessage) => Iterator<Middleware>;

/**
 * Structure of exported commands.
 *
 * ```js
 * class SomeCommand {
 *   exec(command) {
 *     return command.response.send('dank memes');
 *   }
 *   * middleware(command) {
 *     yield new Argument('meme') // this arg will be accessible as `command.args.meme`
 *        .setPrompt('Please provide a thing.')
 *        .setRePrompt('The thing you provided was invalid.')
 *        .setResolver(content => content === 'thing' ? { stuff: 'is what I want to be in the args property' } : null);
 *   }
 * }
 *
 * module.exports = SomeCommand;
 * ```
 */
export interface ICommand {
  /**
   * Defaults to the file name.
   */
  triggers?: Trigger[] | Trigger;

  /**
   * Whether the command is globally disabled.
   */
  disabled?: boolean;

  /**
   * The command function to execute.
   */
  exec: CommandExecutor;

  /**
   * Command middleware.
   */
  middleware?: CommandMiddleware;
}
