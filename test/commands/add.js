const Handles = require('../../src/index')

class Command
{
    exec(command)
    {
        return command.response.send(command.args[0] + command.args[1])
    }

    * arguments(command)
    {
        yield new Handles.Argument('Please provide the first digit.', 'xd1')
            .setResolver(c => !c || isNaN(c) ? null : parseInt(c));
        yield new Handles.Argument('Please provide the second digit.', 'xd2')
            .setResolver(c => !c || isNaN(c) ? null : parseInt(c));
    }
}

module.exports = new Command
