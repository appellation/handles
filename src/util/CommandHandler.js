/**
 * Created by nelso on 1/9/2017.
 */

const EventEmitter = require('events').EventEmitter;

const NotACommandError = require('../errors/NotACommand');
const InvalidCommandError = require('../errors/InvalidCommand');

class CommandHandler extends EventEmitter {
    constructor(loader, msg, body)    {

        /**
         * The command loader to use for commands.
         * @type CommandLoader
         */
        this.loader = loader;

        /**
         * The message that triggered this command.
         * @type Message
         */
        this.msg = msg;

        /**
         * The body of the command.
         * @type String
         */
        this.body = body || this.msg.content;

        /**
         * The unprefixed content of the message.
         * @type {String|null}
         */
        this.resolvedContent = null;

        /**
         * The command trigger that was applied.
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
         * @type {Array}
         */
        this.args = [];
    }

    handle()    {
        if(!this.resolvePrefix() || !this.resolveCommand()) return Promise.resolve(new NotACommandError(this.msg));
        return this.validate().then(() => {
            if(typeof this.command.func !== 'function') throw new Error('No command function provided.');
            this.emit('commandStarted', {
                message: this.msg,
                command: this.command,
                content: this.resolvedContent
            });

            return Promise.resolve(this.command.func(this.msg, this.args, this.loader));
        }).catch(reason => {
            return new InvalidCommandError(this.msg, this.command, reason);
        })
    }

    /**
     * Ensure that the command form is valid.
     * @return {Promise} - Rejects with reason, otherwise resolves.
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

module.exports = CommandHandler;