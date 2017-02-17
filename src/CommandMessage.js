
const EventEmitter = require('events').EventEmitter;
const Response = require('./Response');
const ValidationProcessor = require('./ValidationProcessor');

/**
 * A message to be processed as a command.
 *
 * @param {CommandLoader} loader
 * @param {Message} message
 * @param {String} [body]
 * @extends {EventEmitter}
 * @constructor
 */
class CommandMessage extends EventEmitter {

    constructor(loader, message, body)    {
        super();

        /**
         * The command loader to use for commands.
         * @type {CommandLoader}
         */
        this.loader = loader;

        /**
         * The message that triggered this command.
         * @type {Message}
         */
        this.message = message;

        /**
         * The text body of the message being processed as a command.
         * @type {String}
         */
        this.body = body || this.message.content;

        /**
         * The un-prefixed content of the message.
         * @type {ResolvedContent}
         */
        this.resolvedContent = null;

        /**
         * The command.
         * @type {Command}
         */
        this.command = null;

        /**
         * The body of the message without the command.
         * @type {?String}
         */
        this.commandBody = null;

        /**
         * The command arguments.  Delimited by space unless quoted.
         * @type {Array<String>}
         */
        this.args = [];

        /**
         * The response object for this command.
         * @type {Response}
         */
        this.response = new Response(this.message);

        /**
         * The validator object for this command.
         * @type {ValidationProcessor}
         */
        this.validator = new (this.loader.config.ValidationProcessor || ValidationProcessor)(this);
    }

    /**
     * Handles a command.
     *
     * @fires CommandMessage#notACommand
     * @fires CommandMessage#invalidCommand
     * @fires CommandMessage#commandStarted
     * @fires CommandMessage#commandFinished
     * @fires CommandMessage#commandFailed
     * @throws {Error} If no command function is provided (this really should not happen, ever).
     * @return {Promise.<CommandMessage>} - Resolves when the command has finished processing (does not reject).
     */
    handle()    {
        return new Promise((resolve, reject) => {
            if(this.message.author.bot || !this.resolvePrefix() || !this.resolveCommand()) {

                /**
                 * Fired if the message is not a command.
                 *
                 * @event CommandMessage#notACommand
                 * @type {CommandMessage}
                 */
                this.emit('notACommand', this);
                return reject();
            }

            return this.validate().then(validator => {

                if(validator.valid) return resolve();

                /**
                 * Fired if the command is invalid.
                 *
                 * @event CommandMessage#invalidCommand
                 * @type {ValidationProcessor}
                 */
                this.emit('invalidCommand', validator);
                this._handleError(validator.reason);
                return reject();
            });
        }).then(() => {
            if(typeof this.command.func !== 'function') throw new Error('No command function provided.');

            /**
             * Fired when the command starts.
             *
             * @event CommandMessage#commandStarted
             * @type {CommandMessage}
             */
            this.emit('commandStarted', this);
            
            let result;
            try {
                result = this.command.func(this.response, this.message, this.args, this);
            } catch (e) {
                return this._commandFailed(e);
            }

            return Promise.resolve(result).catch(this._commandFailed.bind(this));
        }).then(result => {

            /**
             * Fired upon successful completion of the command.
             *
             * @event CommandMessage#commandFinished
             * @type {object}
             * @property {CommandMessage} command
             * @property {*} result - The returned result of the CommandExecutor.
             * @see CommandExecutor
             */
            this.emit('commandFinished', {
                command: this,
                result
            });

            return this;
        }).catch(err => {
            if(typeof err === 'undefined') return;
            this.emit('error', err);
            this._handleError(err);
            return this;
        });
    }
    
    _commandFailed(err) {
        
        /**
         * This is only fired if the CommandExecutor returns a promise that rejects.
         *
         * @event CommandMessage#commandFailed
         * @type {Object}
         * @property {CommandMessage} command
         * @property err
         * @see CommandExecutor
         */
        this.emit('commandFailed', {
            command: this,
            err
        });

        return Promise.reject(err);
    }

    /**
     * Handle any errors.
     * @param {String} text
     * @private
     */
    _handleError(text)    {
        if(this.loader.config.respond) this.response.error(text).catch(() => null);
    }

    /**
     * Ensure that the command form is valid.
     * @return {Promise<ValidationProcessor>} - Rejects with reason, otherwise resolves.
     */
    validate()  {
        if(!this.command) throw new Error('No command to validate');
        if(typeof this.command.validator !== 'function') return Promise.resolve(this.validator);

        const validate = this.command.validator(this.validator, this);

        return Promise.resolve(validate).then(valid => {
            this.validator.valid = !!valid;
            return this.validator;
        });
    }

    /**
     * Validate the command form and set the prefix-less message content.
     * @return {ResolvedContent}
     */
    resolvePrefix() {
        const config = this.loader.config;
        if(config.validator && typeof config.validator === 'function')    {
            return this.resolvedContent = config.validator(this.message);
        }   else    {

            const prefixes = config.prefixes.concat([ `<@${this.message.client.user.id}>`, `<@!${this.message.client.user.id}>` ]);
            for(const pref of prefixes) if(this.body.startsWith(pref)) return this.resolvedContent = this.body.substring(pref.length).trim();
            return this.resolvedContent = null;
        }
    }

    /**
     * Resolve a command from the resolved content.
     * @return {Command|undefined}
     */
    resolveCommand()  {
        if(!this.resolvedContent) this.resolvePrefix();
        if(!this.resolvedContent) return;

        const split = this.resolvedContent.trim().toLowerCase().split(' ');
        if(typeof split[0] === 'string' && this.loader.commands.has(split[0])) {
            this.commandBody = this.resolvedContent.replace(/^(\S+\s*)(.*)/, '$2');
            this.resolveArgs();
            return this.command = this.loader.commands.get(split[0]);
        }

        for(const [trigger, cmd] of this.loader.commands)  {
            const regex = (trigger instanceof RegExp) ? trigger : new RegExp(`^${trigger}\\s*`, 'i');
            if(regex.test(this.resolvedContent)) {
                this.commandBody = this.resolvedContent.replace(regex, '').trim();
                this.resolveArgs();
                return this.command = cmd;
            }
        }
    }

    /**
     * Parse the arguments of the command body.
     * @return {Array}
     */
    resolveArgs()   {
        let regex = /("([^"]+)")|('([^']+)')|\S+/g,
            matches = [],
            match;

        while((match = regex.exec(this.commandBody)) !== null) matches.push(match[4] || match[2] || match[0]);
        return this.args = matches;
    }
}

module.exports = CommandMessage;
