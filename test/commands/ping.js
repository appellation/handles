const Argument = require('../../src/Argument');

module.exports.exec = command => {
    // console.log(command);
    command.response.send('pong');
};

module.exports.arguments = function* () {
    const arg = yield new Argument('fuck you', 'fuck me')
        .setResolver(c => c === 'lmao' || null);
    // console.log(arg);
};
