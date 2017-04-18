class ArgsCollector {
    constructor(response) {
        this.response = response;
        this.response.edit = false;
    }

    collectPrompt(arg, valid = true) {
        const text = valid ? arg.prompt : arg.rePrompt;
        return this.awaitResponse(text).then(response => {
            if(response.content === 'cancel') return Promise.reject();

            const resolved = arg.resolver(response.content, response);
            if(resolved === null) return this.collectPrompt(arg, false);
            return resolved;
        }).catch(() => {
            return this.response.error('Command cancelled.').then(() => null).catch(() => null);
        });
    }

    awaitResponse(text) {
        return this.response.send(text).then(() => {
            return this.response.message.channel.awaitMessages(m => m.author.id === this.response.message.author.id, { time: 30000, max: 1, errors: ['time'] });
        }).then(responses => {
            return responses.first();
        });
    }
}

module.exports = ArgsCollector;
