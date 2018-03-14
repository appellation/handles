const Handles = require('../../dist/index');

class Command extends Handles.Command {
  async pre() {
    const val1 = new Handles.Validator(this)
      .apply(false, 'kek');
    const val2 = new Handles.Validator(this)
      .apply(true, 'lol');

    // await val1;

    await new Handles.Argument(this, 'first')
      .setPrompt('Please provide the first digit.')
      .setResolver(c => {
        if (isNaN(c)) throw new Error('das no number');
        return parseInt(c);
      });

    await new Handles.Argument(this, 'second')
      .setPrompt('Please provide the second digit.')
      .setResolver(c => {
        if (isNaN(c)) throw new Error('das no number');
        return parseInt(c);
      });
  }

  exec() {
    return this.response.send(this.args.first + this.args.second);
  }
}

module.exports = Command;
