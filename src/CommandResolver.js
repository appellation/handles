class CommandResolver {
    constructor(config, loader) {
        this.config = config;
        this.loader = loader;

        if(typeof this.config.validator !== 'function' || !this.config.prefixes || !this.config.prefixes.length)
            throw new Error('Unable to validate command: no validator or prefixes were provided.');

        this._validator = this.config.validator || ((message) => {
            for(const p of this.config.prefixes)
                if(message.content.startswith(p))
                    return message.content.substring(p.length).trim();
        });

        this._regex = /^[^\s]+/;
    }

    resolve(message) {
        const content = this._validator(message);
        if(!content) return null;

        const command = content.match(this._regex)[0];
        if(this.loader.commands.has(command)) return this.loader.commands.get(command);
        for(const [c, command] of this.loader.commands) if(content.startsWith(c)) return command;
        return null;
    }
}

module.exports = CommandResolver;
