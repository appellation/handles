const Argument = require('../../src/Argument');

module.exports.exec = command => {
    // console.log(command);
    command.response.send('pong');
};

module.exports.arguments = function* () {
    const arg = yield new Argument('fuck you', 'fuck me')
        .setResolver(c => c === 'lmao' || null);
    const other = yield new Argument('top', 'kek')
        .setResolver(c => c === 'dank' || null);

    // console.log(arg);
};
