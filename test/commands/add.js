const Handles = require('../../dist/index');

class Command extends Handles.Command {
  async pre() {
    // const val1 = new Handles.Validator()
    //   .apply(false, 'kek');
    // const val2 = new Handles.Validator()
    //   .apply(true, 'lol');

    // yield val1;

    await new Handles.Argument(this, 'first')
      .setPrompt('Please provide the first digit.')
      .setRePrompt('xd1')
      .setResolver(c => isNaN(c) ? null : parseInt(c));

    await new Handles.Argument(this, 'second')
      .setPrompt('Please provide the second digit.')
      .setRePrompt('xd2')
      .setResolver(c => isNaN(c) ? null : parseInt(c));
  }

  exec() {
    return this.response.send(this.args.first + this.args.second);
  }
}

module.exports = Command;
