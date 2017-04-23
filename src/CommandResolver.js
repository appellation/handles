const CommandMessage = require('./CommandMessage');

/**
 * Class for resolving a command from a message.
 */
class CommandResolver {

    /**
     * @param {Handles}
     */
    constructor(handles) {
        /**
         * @type {Handles}
         */
        this.handles = handles;

        /**
         * @type {Config}
         */
        this.config = this.handles.config;

        /**
         * @type {Loader}
         */
        this.loader = this.handles.loader;

        if(typeof this.config.validator !== 'function' && (!this.config.prefixes || !this.config.prefixes.size))
            throw new Error('Unable to validate commands: no validator or prefixes were provided.');

        /**
         * The validator function to determine if a command is valid.
         * @type {Function}
         * @private
         */
        this._validator = this.config.validator || ((message) => {
            for(const p of this.config.prefixes)
                if(message.content.startswith(p))
                    return message.content.substring(p.length).trim();
        });

        /**
         * The base regex for parsing command parts.
         * @type {RegExp}
         */
        this._regex = /^([^\s]+)(.*)/;
    }

    /**
     * @param {Message} message - The message that could be a command.
     * @param {String} [body] - Command text if not the message content.
     */
    resolve(message, body) {
        const content = this._resolveContent(message, body);
        if(typeof content !== 'string' || !content) return null;

        const [, command, commandContent] = content.match(this._regex);
        if(this.loader.commands.has(command))
            return new CommandMessage({
                command: this.loader.commands.get(command),
                message,
                body: commandContent.trim(),
                config: this.config
            });

        for(const [c, command] of this.loader.commands)
            if(content.startsWith(c))
                return new CommandMessage({
                    command,
                    message,
                    body: content.substring(0, c.length).trim(),
                    config: this.config
                });

        return null;
    }

    /**
     * Resolve the content of the command.
     * @param {Message} message
     * @param {String} body
     * @private
     */
    _resolveContent(message, body) {
        const content = body || message.content;
        if(this.config.validator && typeof this.config.validator === 'function')
            return this.config.validator(message);

        for(const pref of this.config.prefixes) if(content.startsWith(pref)) return content.substring(pref.length).trim();
        return null;
    }
}

module.exports = CommandResolver;
