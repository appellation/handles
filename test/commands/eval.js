const util = require('util');
const { Command, Argument } = require('../../dist');

module.exports = class extends Command {
  async pre() {
    await new Argument(this, 'code')
      .setResolver(c => c || null)
      .setPrompt('What would you like to eval?')
      .setRePrompt('That\'s not valid.');
  }

  async exec() {
    try {
      this.response.send(util.inspect(await eval(this.args.code)), { code: 'js', split: true });
    } catch (e) {
      this.response.send(e);
    }
  }
};
