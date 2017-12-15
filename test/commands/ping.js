const { Argument, Command } = require('../../dist');

// const HTTPPing = require('node-http-ping')

class PingCommand extends Command {
  exec() {
    if (!this.args.site) {
      return this.response.send(`${Math.round(this.message.client.ping)}ms 💓`);
    } else {
      return this.response.send(`lul pinging \`${this.args.site}\` in 2017`);
    }

    // HTTPPing(this.args[0]).then((time) => {
    //   return this.response.success(`Website **${this.args[0]}** responded in ${time}ms.`);
    // }).catch(console.error);
  }

  async pre() {
    await new Argument(this, 'site')
      // .setPrompt('plz provide websit')
      // .setOptional()
      .setResolver((content) => {
        console.log(content);
        if (!content.match(new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi))) {
          throw new Error('this is no link my fRIEND');
        }

        return content;
      });
  }
}

module.exports = PingCommand;
