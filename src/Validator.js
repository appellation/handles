/**
 * Passed as a parameter to command validators.
 * @example
 * // Using a custom validator.
 * class CustomValidator extends Validator {
 *   ensureArgs() {
 *     return this.apply(this.command.args.length > 0, 'No arguments provided.');
 *   }
 * }
 *
 * // Usage in command
 * exports.validator = processor => {
 *   return processor.ensureArgs();
 * }
 *
 * @example
 * // Usage without a custom validator
 * exports.validator = (processor, command) => {
 *   return processor.apply(command.args.length > 0, 'No arguments provided.');
 * }
 *
 * @see Command
 * @see CommandValidator
 */
class Validator {

    /**
     * @param {CommandMessage} command
     */
    constructor(command) {

        /**
         * The command message.
         * @type {CommandMessage}
         */
        this.command = command;

        /**
         * The message to validate.
         * @type {Message}
         */
        this.message = command.message;

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
    }

    /**
     * Test a new boolean for validity.
     * @param {boolean|*} test - If falsy, applies `reason` to the now invalid command.
     * @param {?string} reason
     * @return {boolean}
     */
    apply(test, reason) {
        if(!test && reason) this.reason = reason;
        return this.valid = Boolean(test);
    }
}

module.exports = Validator;
