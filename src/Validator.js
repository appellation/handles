const ValidationError = require('./errors/ValidationError');

/**
 * @typedef {Function|boolean} ValidationFunction - Passed to {@link Validator#apply} and executed when the
 * validator is run.
 * @param {CommandMessage} - The command that is being validated.
 * @param {Validator} - The validator that is running.
 * @throws {ValidationError|Error} - Error to get collected in {@link CommandMessage#commandFailed}
 * @example
 * validator.apply(cmd => cmd.message.author.id === 'some id', 'uh oh');
 * @example
 * validator.apply(cmd.message.author.id === 'some id', 'uh oh');
 */

/**
 * Passed as a parameter to command validators.  Arguments will not be available in this class,
 * as this is run before arguments are resolved from the command.  Use for permissions checks and
 * other pre-command validations.
 *
 * @example
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
 *
 * @example
 * // Usage without a custom validator
 * exports.validator = (processor, command) => {
 *   return processor.apply(command.message.channel.type === 'text', 'Command must be run in a guild channel.');
 * }
 *
 * @see Command
 * @see CommandValidator
 */
class Validator {
  constructor() {
    /**
     * The reason this command is invalid.
     * @type {?string}
     */
    this.reason = null;

    /**
     * Whether to respond to invalid commands with the reason.
     * @type {boolean}
     */
    this.respond = true;

    /**
     * Whether the command is valid.
     * @type {boolean}
     */
    this.valid = true;

    /**
     * Tests to execute on run.
     * @type {Map<ValidatorFunction, reason: string>}
     * @private
     */
    this._exec = new Map();
  }

  /**
   * Test a new boolean for validity.
   * @example
   * const validator = new Validator();
   * validator.apply(aCondition, 'borke') || validator.apply(otherCondition, 'different borke');
   * yield validator;
   * @param {boolean|Function} test - If falsy, applies `reason` to the now invalid command.
   * @param {?string} reason
   * @return {Validator}
   */
  apply(test, reason) {
    this._exec.set(typeof test === 'function' ? test : () => test, reason);
    return this;
  }

  run(command) {
    for (const [test, reason] of this._exec) {
      try {
        if (!test(command, this)) {
          this.reason = reason;
          this.valid = false;
          throw new ValidationError(this);
        }
      } catch (e) {
        if (this.respond) command.response.error(e);
        throw e;
      }
    }
  }
}

module.exports = Validator;
