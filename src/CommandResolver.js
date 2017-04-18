const CommandMessage = require('./CommandMessage');

class CommandResolver {
    constructor(handles) {
        this.handles = handles;

        if(typeof this.handles.config.validator !== 'function' && (!this.handles.config.prefixes || !this.handles.config.prefixes.length))
            throw new Error('Unable to validate commands: no validator or prefixes were provided.');

        this._validator = this.handles.config.validator || ((message) => {
            for(const p of this.handles.config.prefixes)
                if(message.content.startswith(p))
                    return message.content.substring(p.length).trim();
        });

        this._regex = /^([^\s]+)(.*)/;
    }

    resolve(message, body) {
        const content = this._resolveContent(message, body);
        if(typeof content !== 'string' || !content) return null;

        const [, command, commandContent] = content.match(this._regex);
        if(this.handles.loader.commands.has(command))
            return new CommandMessage(this.handles.loader.commands.get(command), message, commandContent.trim());

        for(const [c, command] of this.handles.loader.commands)
            if(content.startsWith(c))
                return new CommandMessage(command, message, content.substring(0, c.length).trim());

        return null;
    }

    _resolveContent(message, body) {
        const content = body || message.content;
        if(this.handles.config.validator && typeof this.handles.config.validator === 'function')
            return this.config.validator(message);

        for(const pref of this.handles.config.prefixes) if(content.startsWith(pref)) return content.substring(pref.length).trim();
        return null;
    }
}

module.exports = CommandResolver;
