const Argument = require('../../src/Argument');

class Ping {
    exec(command) {
        throw new Error('lol');
        command.response.send('pong');
    }

    * arguments() {
        yield new Argument('fuck you', 'fuck me')
            .setResolver(c => c === 'lmao' ? 'lmao' : null);
        yield new Argument('top', 'kek')
            .setResolver(c => c === 'dank' ? 'lmao' : null);
    }
}

module.exports = new Ping();
