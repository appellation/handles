const Handles = require('../../src/index');

class Command {
  * middleware() {
    const val1 = new Handles.Validator()
      .apply(false, 'kek');
    const val2 = new Handles.Validator()
      .apply(true, 'lol');

    yield val2;

    yield new Handles.Argument('first')
      .setPrompt('Please provide the first digit.')
      .setRePrompt('xd1')
      .setResolver(c => !c || isNaN(c) ? null : parseInt(c));

    yield new Handles.Argument('second')
      .setPrompt('Please provide the second digit.')
      .setRePrompt('xd2')
      .setResolver(c => !c || isNaN(c) ? null : parseInt(c));
  }

  exec(command) {
    return command.response.send(command.args.first + command.args.second);
  }
}

module.exports = new Command();
