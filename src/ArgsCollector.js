const Response = require('./Response');
// const Argument = require('./Argument');

class ArgsCollector {
    constructor(command, collector) {
        this.command = command;
        this.collector = collector;
        this.response = new Response(this.command.message);
        this.args = [];
    }

    collect() {
        this._argsIndex = -1;
        return this._collect();
    }

    _collect(prev = null) {
        const elem = this.collector.next(prev);
        const arg = elem.value;
        if(++this._argsIndex < this.command.args.length) {
            return this._endCollector(elem, arg.resolver(this.command.args[this._argsIndex]));
        }

        return this.collectPrompt(arg).then(response => {
            return this._endCollector(elem, response.content);
        });
    }

    _endCollector(elem, data) {
        this.args.push(data);
        if(elem.done) return data;
        return this._collect(data);
    }

    collectPrompt(arg, valid = true) {
        const text = valid ? arg.text : arg.error;
        return this.awaitResponse(text).then(response => {
            if(response.content === 'cancel') return Promise.reject();

            const resolved = arg.resolver(response);
            if(resolved instanceof Error) return this._collectarg(arg, false);
            return resolved;
        }).catch(() => {
            return this.response.error('Command cancelled.').then(() => null).catch(() => null);
        });
    }

    awaitResponse(text) {
        return this.response.send(text).then(() => {
            return this.message.channel.awaitMessages(m => m.author.id === this.message.author.id, { time: 30000, max: 1, errors: ['time'] });
        }).then(responses => {
            return responses.first();
        });
    }
}

module.exports = ArgsCollector;
