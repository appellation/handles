const Handles = require('../../dist/index');

class AddCommand extends Handles.Command {
  async pre() {
    // this.assert(false, 'kek');

    this.first = await new Handles.Argument(this, {
      resolver: (c) => {
        if (isNaN(c)) throw new Error('das no number');
        return parseInt(c);
      },
    });

    this.second = await new Handles.Argument(this, {
      resolver: (c) => {
        if (isNaN(c)) throw new Error('das no number');
        return parseInt(c);
      },
    });
  }

  exec() {
    return console.log(this.first + this.second);
  }
}

AddCommand.triggers = 'add';

module.exports = AddCommand;
