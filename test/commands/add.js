const Handles = require('../../src/index')

class Command
{
    exec(command)
    {
        return command.response.send(command.args.first + command.args.second)
    }

    * arguments(command)
    {
        yield new Handles.Argument('first')
            .setPrompt('Please provide the first digit.')
            .setRePrompt('xd1')
            .setResolver(c => !c || isNaN(c) ? null : parseInt(c));
        yield new Handles.Argument('second')
            .setPrompt('Please provide the second digit.')
            .setRePrompt('xd2')
            .setResolver(c => !c || isNaN(c) ? null : parseInt(c));
    }
}

module.exports = new Command
