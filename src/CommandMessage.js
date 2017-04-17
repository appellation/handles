
const EventEmitter = require('events').EventEmitter;
const Response = require('./Response');
const ValidationProcessor = require('./ValidationProcessor');

/**
 * @typedef {String|null} ResolvedContent - Message content without any prefixes, null if invalid.
 */

/**
 * A message to be processed as a command.
 *
 * @param {CommandLoader} loader
 * @param {Message} message
 * @param {String} [body]
 * @extends EventEmitter
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
        this.resolvedContent = CommandMessage.resolveContent(this.loader.config, this.message, this.body);

        /**
         * The command.
         * @property {?Command} command
         */
        /**
         * The body of the message without the command.
         * @property {ResolvedContent} resolvedContent
         */
        /**
         * The trigger for this command.
         * @property {?String} trigger
         */
        Object.assign(this, CommandMessage.resolveCommand(this.loader, this.resolvedContent));

        /**
         * The command arguments.  Delimited by space unless quoted.
         * @type {Array<String>}
         */
        this.args = CommandMessage.resolveArgs(this.resolvedContent);

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
     * Validate the command form and set the prefix-less message content.
     * @return {ResolvedContent}
     */
    static resolveContent(config, message, content) {
        if(config.validator && typeof config.validator === 'function')
            return config.validator(this.message);

        for(const pref of config.prefixes) if(content.startsWith(pref)) return content.substring(pref.length).trim();
        return null;
    }

    /**
     * Resolve a command from the resolved content.
     * @return {{resolvedContent: ResolvedContent, command: Command, trigger: String}}
     */
    static resolveCommand(loader, content)  {
        const parsed = content.trim().match(/^(\S+)(\s*)(.*)/i);
        if(loader.commands.has(parsed[1])) {
            return {
                trigger: parsed[1],
                resolvedContent: parsed[3] || '',
                command: loader.commands.get(parsed[1])
            };
        }

        for(const [trigger, cmd] of loader.commands)  {
            const regex = (trigger instanceof RegExp) ? trigger : new RegExp(`^${trigger}(\\s+|$)`, 'i');
            if(regex.test(content)) {
                return {
                    trigger,
                    resolvedContent: content.replace(regex, '').trim(),
                    command: cmd
                };
            }
        }
    }

    /**
     * Parse the arguments of the command body.
     * @return {Array.<String>}
     */
    static resolveArgs(content)   {
        let regex = /("([^"]+)")|('([^']+)')|\S+/g,
            matches = [],
            match;

        while((match = regex.exec(content)) !== null) matches.push(match[4] || match[2] || match[0]);
        return matches;
    }
}

module.exports = CommandMessage;
