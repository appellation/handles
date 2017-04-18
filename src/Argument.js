class Argument {
    constructor(prompt, reprompt) {
        this.prompt = prompt;
        this.rePrompt = reprompt;
        this.optional = false;
        this.resolver = () => null;
        this.pattern = /^\S+/;
    }

    set pattern(regex) {
        this.matcher = content => {
            const m = content.match(regex);
            return m === null ? '' : m[0];
        };
    }

    setPrompt(prompt = null) {
        this.prompt = prompt;
        return this;
    }

    setOptional(optional = true) {
        this.optional = optional;
        return this;
    }

    setResolver(resolver = () => null) {
        this.resolver = resolver;
        return this;
    }
}

module.exports = Argument;
