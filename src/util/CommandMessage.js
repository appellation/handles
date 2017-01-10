
const EventEmitter = require('events').EventEmitter;

const NotACommandError = require('../errors/NotACommand');
const InvalidCommandError = require('../errors/InvalidCommand');

/**
 * A message to be processed as a command.
 *
 * @param {CommandLoader} loader
 * @param {Message} msg
 * @param {String} [body]
 * @extends {EventEmitter}
 * @constructor
 */
class CommandMessage extends EventEmitter {

    constructor(loader, msg, body)    {
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
        this.msg = msg;

        /**
         * The body of the command.
         * @type {String}
         */
        this.body = body || this.msg.content;

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
         * @type {String|null}
         */
        this.commandBody = null;

        /**
         * The command arguments.
         * @type {Array<String>}
         */
        this.args = [];
    }

    /**
     * Handles a command.
     * @fires CommandMessage#commandStarted
     * @fires CommandMessage#commandFinished
     * @fires CommandMessage#commandFailed
     * @return {Promise} - Conditional upon settings and return type of CommandExecutor.
     */
    handle()    {
        return new Promise((resolve, reject) => {
            if(this.msg.author.bot) return reject(null);
            if(!this.resolvePrefix() || !this.resolveCommand()) return reject(new NotACommandError(this.msg));
            return this.validate().then(resolve).catch(reason => reject(new InvalidCommandError(this.msg, this.command, reason)));
        }).then(() => {
            if(typeof this.command.func !== 'function') throw new Error('No command function provided.');

            /**
             * Fired when the command starts.
             *
             * @event CommandMessage#commandStarted
             * @type {object}
             * @property {Message} message
             * @property {Command} command
             * @property {ResolvedContent} content
             */
            this.emit('commandStarted', {
                message: this.msg,
                command: this.command,
                content: this.resolvedContent
            });

            return Promise.resolve(this.command.func(this.msg, this.args, this)).catch(err => {

                /**
                 * This is only fired if the CommandExecutor returns a promise that rejects.
                 *
                 * @event CommandMessage#commandFailed
                 * @type {object}
                 * @property {Message} message
                 * @property {Command} command
                 * @property {ResolvedContent} content
                 * @property {*} error - The error of the command.
                 */
                this.emit('commandFailed', {
                    message: this.msg,
                    command: this.command,
                    content: this.resolvedContent,
                    error: err
                });

                return Promise.reject(err);
            });
        }).then(result => {

            /**
             * Fired upon successful completion of the command.
             *
             * @event CommandMessage#commandFinished
             * @type {object}
             * @property {Message} message
             * @property {Command} command
             * @property {ResolvedContent} content
             * @property {*} result - The returned result of the CommandExecutor.
             */
            this.emit('commandFinished', {
                message: this.msg,
                command: this.command,
                content: this.resolvedContent,
                result
            });

            if((this.loader.config.respond || this.command.respond) && (typeof result === 'string' || typeof result === 'number')) this.msg.channel.sendMessage(result).catch(() => null);
            return result;
        }).catch(err => {
            if(!err) return;
            if((typeof this.loader.config.ignoreInvalid === 'undefined' || this.loader.config.ignoreInvalid === true) && (err instanceof NotACommandError || err instanceof InvalidCommandError)) return;
            return Promise.reject(err);
        });
    }

    /**
     * Ensure that the command form is valid.
     * @return {Promise<*,String>} - Rejects with reason, otherwise resolves.
     */
    validate()  {
        if(!this.command) return Promise.reject('No command to validate.');
        if(typeof this.command.validator !== 'function') return Promise.resolve(true);

        const validate = this.command.validator(this.msg, this.args);
        if(validate instanceof Promise)    {
            return validate;
        }   else if(typeof validate === 'boolean')    {
            return validate ? Promise.resolve(true) : Promise.reject('Invalid command.');
        }   else if(validate)  {
            return Promise.reject(validate);
        }
        return Promise.resolve(true);
    }

    /**
     * Validate the command form and set the prefix-less message content.
     * @return {ResolvedContent}
     */
    resolvePrefix() {
        const config = this.loader.config;
        if(config.validator && typeof config.validator === 'function')    {
            return this.resolvedContent = config.validator(this.msg);
        }   else    {

            config.prefixes.concat([ `<@${this.msg.client.user.id}>`, `<@!${this.msg.client.user.id}>` ]);
            for(const pref of config.prefixes) if(this.body.startsWith(pref)) return this.resolvedContent = this.body.substring(pref.length).trim();
            return this.resolvedContent = null;
        }
    }

    /**
     * Resolve a command from the resolved content.
     * @return {String|NotACommand}
     */
    resolveCommand()  {
        if(!this.resolvedContent) this.resolvePrefix();
        if(!this.resolvedContent) throw new NotACommandError(this.msg);

        const split = this.resolvedContent.trim().toLowerCase().split(' ');
        if(typeof split[0] === 'string' && this.loader.commands.has(split[0])) {
            this.commandBody = this.resolvedContent.replace(/^(\S*\s*)(.*)/, '$2');
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
        const regex = /("([^"]+)")|('([^']+)')|\S+/g;
        const matches = [];
        let match;
        while((match = regex.exec(this.commandBody)) !== null) matches.push(match[4] || match[2] || match[0]);
        return this.args = matches;
    }
}

module.exports = CommandMessage;