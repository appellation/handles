import Command from '../structures/Command';
import { Code } from '../util/Error';
import Runnable from '../util/Runnable';

/**
 * ```js
 * validator.apply(v => v.command.author.id === 'some id', 'uh oh'); // executed at runtime
 * // or
 * validator.apply(cmd.message.author.id === 'some id', 'uh oh'); // executed immediately
 * ```
 */
export type ValidationFunction = (v: Validator) => boolean;

/**
 * Passed as a parameter to command validators.  Arguments will not be available in this class,
 * as this is run before arguments are resolved from the command.  Use for permissions checks and
 * other pre-command validations.
 *
 * ```js
 * // Using a custom validator.
 * class CustomValidator extends Validator {
 *   ensureGuild() {
 *     return this.apply(this.command.message.channel.type === 'text', 'Command must be run in a guild channel.');
 *   }
 * }
 *
 * // Usage in command
 * exports.validator = processor => {
 *   return processor.ensureGuild();
 * }
 * ```
 *
 * ```js
 * // Usage without a custom validator
 * exports.validator = (processor, command) => {
 *   return processor.apply(command.message.channel.type === 'text', 'Command must be run in a guild channel.');
 * }
 * ```
 */
export default class Validator extends Runnable<void> {
  public command: Command;

  /**
   * The reason this validator is invalid.
   */
  public reason?: string;

  /**
   * Whether to automatically respond with reason when invalid.
   */
  public respond: boolean = true;

  /**
   * Whether this validator is valid.
   */
  public valid = true;

  /**
   * Functions to execute when determining validity. Maps validation functions to reasons.
   */
  private exec: Array<[ValidationFunction, string | undefined]> = [];

  constructor(cmd: Command) {
    super();
    this.command = cmd;
  }

  /**
   * Test a new boolean for validity.
   *
   * ```js
   * const validator = new Validator();
   * await validator
   *   .apply(aCondition, 'borke')
   *   .apply(otherCondition, 'different borke');
   * ```
   */
  public apply(test: ValidationFunction | boolean, reason?: string) {
    this.exec.push([typeof test === 'function' ? test : () => test, reason]);
    return this;
  }

  public async run() {
    for (const [test, reason] of this.exec) {
      try {
        if (!test(this)) {
          this.reason = reason || undefined;
          this.valid = false;
          this.command.cancel(this.reason);
        }
      } catch (e) {
        if (this.respond) this.command.response.send(e.message || e);
        this.command.cancel(Code.COMMAND_INVALID, this);
      }
    }
  }
}
