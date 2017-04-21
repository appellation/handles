const CommandMessage = require('./CommandMessage');

class CommandResolver {
    constructor(handles) {
        this.handles = handles;
        this.config = this.handles.config;
        this.loader = this.handles.loader;

        if(typeof this.config.validator !== 'function' && (!this.config.prefixes || !this.config.prefixes.length))
            throw new Error('Unable to validate commands: no validator or prefixes were provided.');

        this._validator = this.config.validator || ((message) => {
            for(const p of this.config.prefixes)
                if(message.content.startswith(p))
                    return message.content.substring(p.length).trim();
        });

        this._regex = /^([^\s]+)(.*)/;
    }

    resolve(message, body) {
        const content = this._resolveContent(message, body);
        if(typeof content !== 'string' || !content) return null;

        const [, command, commandContent] = content.match(this._regex);
        if(this.loader.commands.has(command))
            return new CommandMessage(this.loader.commands.get(command), message, commandContent.trim());

        for(const [c, command] of this.loader.commands)
            if(content.startsWith(c))
                return new CommandMessage(command, message, content.substring(0, c.length).trim());

        return null;
    }

    _resolveContent(message, body) {
        const content = body || message.content;
        if(this.config.validator && typeof this.config.validator === 'function')
            return this.config.validator(message);

        for(const pref of this.config.prefixes) if(content.startsWith(pref)) return content.substring(pref.length).trim();
        return null;
    }
}

module.exports = CommandResolver;
