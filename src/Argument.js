class Argument {
    constructor(prompt) {
        this.prompt = prompt;
        this.optional = false;
        this.resolver = () => {};
    }

    setPrompt(prompt = null) {
        this.prompt = prompt;
        return this;
    }

    setOptional(optional = true) {
        this.optional = optional;
        return this;
    }

    setResolver(resolver = () => {}) {
        this.resolver = resolver;
        return this;
    }
}

module.exports = Argument;
