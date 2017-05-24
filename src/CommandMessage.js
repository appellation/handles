const EventEmitter = require('events');
const Prompter = require('./Prompter');
const Argument = require('./Argument');
const ArgumentError = require('./errors/ArgumentError');

/**
 * A message to be processed as a command.
 * @extends {EventEmitter}
 */
class CommandMessage extends EventEmitter {

    /**
     * @param {Object} data
     * @param {Command} data.command
     * @param {Message} data.message
     * @param {string} data.body
     * @param {Config} data.config
     */
    constructor(client, { command, message, body } = {})    {
        super();

        /**
         * The handles client.
         * @type {HandlesClient}
         */
        this.client = client;

        /**
         * The command loader to use for commands.
         * @type {Command}
         */
        this.command = command;

        /**
         * The message that triggered this command.
         * @type {Message}
         */
        this.message = message;

        /**
         * The body of the command (without prefix or command), as provided in the original message.
         * @type {string}
         */
        this.body = body;

        /**
         * The config.
         * @type {Config}
         */
        this.config = client.config;

        /**
         * The command arguments as returned by the resolver.
         * @see {ArgumentResolver}
         * @type {?Object}
         */
        this.args = null;

        /**
         * The response object for this command.
         * @type {Response}
         */
        this.response = new (this.config.Response)(this.message);

        /**
         * The validator object for this command.
         * @type {Validator}
         */
        this.validator = new (this.config.Validator)(this);
    }

    /**
     * Ensure that the command form is valid.
     * @return {Promise<Validator>}
     */
    validate()  {
        if(!this.command) throw new Error('No command to validate');
        if(typeof this.command.validate !== 'function') return Promise.resolve(this.validator);
        return Promise.resolve(this.command.validate(this.validator, this)).then(valid => {
            this.validator.valid = Boolean(valid);
            return this.validator;
        });
    }

    /**
     * Parse the arguments of the command body.
     * @fires CommandMessage#argumentsLoaded
     * @return {Promise}
     */
    resolveArgs()   {
        if(!Array.isArray(this.args)) this.args = {};
        if(typeof this.command.arguments !== 'function') return Promise.resolve();
        return this._iterateArgs(this.command.arguments(Argument, this), this.body);
    }

    _iterateArgs(generator, content, result = null) {
        const next = generator.next(result);
        if(next.done) {
            /**
             * Emitted with the resolved arguments of the message.
             * @event CommandMessage#argumentsLoaded
             * @type {Array}
             */
            this.emit('argumentsLoaded', this.args);
            return;
        }

        const arg = next.value;
        const matched = arg.matcher(content);

        if(typeof matched !== 'string') {
            generator.throw(new Error('Argument matchers must return a string representing an argument segment.'));
            return;
        }

        return new Promise((resolve, reject) => {
            content = content.substring(matched.length).trim();
            const resolved = arg.resolver(matched, this.message);
            if(resolved === null) {
                if(arg.optional && !matched.length) { // if the resolver failed but the argument is optional, resolve with null
                    resolve(null);
                } else { // if the resolver failed and the argument is not optional, prompt
                    const prompter = new Prompter(this.client, new (this.config.Response)(this.message, false));
                    prompter.collectPrompt(arg, matched.length === 0).then(response => {
                        resolve(response);
                    }).catch(reason => {
                        this.response.error('Command cancelled.');
                        reject(new ArgumentError(arg, reason));
                    });
                }
            } else {
                resolve(resolved);
            }
        }).then(value => {
            this.args[arg.key] = value;
            return this._iterateArgs(generator, content, value);
        }).catch(e => {
            generator.return(null);
            return Promise.reject(e);
        });
    }
}

module.exports = CommandMessage;
