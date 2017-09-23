const { Command } = require('discord-handles');

module.exports = class extends Command {
  static resolve(msg) {
    if (msg.content === 'denk memes') return this;
  }

  exec() {
    this.message.member.kick();
  }
};
