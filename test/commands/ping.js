const Argument = require('../../dist/middleware/Argument').default;

// const HTTPPing = require('node-http-ping')

class PingCommand
{
    exec(command)
    {
        if (!command.args.site) {
            return command.response.success(`${Math.round(command.message.client.ping)}ms 💓`)
        }

        HTTPPing(command.args[0]).then((time) => {
            return command.response.success(`Website **${command.args[0]}** responded in ${time}ms.`)
        }).catch(console.error)
    }

    * middleware()
    {
        yield new Argument('site')
            .setPrompt('plz provide websit')
            .setRePrompt('this is no link my fRIEND')
            .setOptional()
            .setResolver((content) => {
                if (!content.match(new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi))) {
                    return null
                }

                return content
            })
    }
}

module.exports = new PingCommand
