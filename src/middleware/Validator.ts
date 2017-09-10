import ValidationError from '../errors/ValidationError';
import Command from '../structures/Command';

/**
 * ```js
 * validator.apply(cmd => cmd.message.author.id === 'some id', 'uh oh'); // executed at runtime
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
export default class Validator {
  public command: Command;

  /**
   * The reason this validator is invalid.
   */
  public reason: string | null = null;

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
  private exec: Map<ValidationFunction, string | null> = new Map();

  constructor(cmd: Command) {
    this.command = cmd;
  }

  /**
   * Test a new boolean for validity.
   *
   * ```js
   * const validator = new Validator();
   * validator.apply(aCondition, 'borke') || validator.apply(otherCondition, 'different borke');
   * yield validator;
   * ```
   */
  public apply(test: ValidationFunction | boolean, reason: string | null = null) {
    this.exec.set(typeof test === 'function' ? test : () => test, reason);
    return this;
  }

  public then<TResult1 = void, TResult2 = never>(
    resolver?: ((value: void) => TResult1 | PromiseLike<TResult1>),
    rejector?: ((value: Error) => TResult2 | PromiseLike<TResult2>),
  ): Promise<TResult1 | TResult2> {
    return new Promise<void>((resolve, reject) => {
      for (const [test, reason] of this.exec) {
        try {
          if (!test(this)) {
            this.reason = reason;
            this.valid = false;
            throw new ValidationError(this);
          }
        } catch (e) {
          if (this.respond) this.command.response.error(e);
          return reject(e);
        }
      }

      return resolve();
    }).then(resolver, rejector);
  }
}
