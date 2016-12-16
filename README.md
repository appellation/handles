# Handles

For those of us who get frustrated with writing command handlers but don't quite want to use a full framework.  Intended for use with [Discord.js](https://github.com/hydrabolt/discord.js).

## Examples

### The simplest it gets

```js
const Discord = require('discord.js');
const client = new Discord.Client(); 
const messageHandler = require('discord-handles')();

client.on('message', messageHandler);
```

Meanwhile, inside `./commands`, a file called `ping.js` exists:

```js
module.exports = {
    func: (message, args) => {
        return message.channel.sendMessage('pong');
    },
    triggers: 'ping'
}
```

This assumes a lot of things.  First of all, your commands are in a single directory called `commands` on the root level of your project.  Secondly, the only prefix is mentions.  In this case, your bot would only respond to `@Bot ping` and it would do so by simply saying `pong`.

### Ooohhhhh, options
Suppose we pass a parameter to our message handler initializer like so:

```js
const messageHandler = require('discord-handles')({
    respond: true
});
```

Now your command handler will take the output of your `func`, resolve it if it's a promise, and if the result if a string or number, it will automatically send that output to the channel the command was issued in.  This greatly simplifies our example command like so:

```js
module.exports = {
    func: () => {
        return 'pong';
    },
    triggers: 'ping'
}
```

Here's a list of other options:

|     Option    |   Type   | Description                                                                                                                                                                                                                                                                                                 |
|:-------------:|:--------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|    prefixes   |   Array  | An array of strings, each of which denotes a prefix to which your bot will respond. You don't need this if you've specified a `validator` (below).                                                                                                                                                          |
|   directory   |  String  | When you want to name your command directory `folder of awesomeness`, simply set this to `./folder of awesomeness` and put your command files inside.  You can use this option to specify a subdirectory or any other schenanigans you might want.                                                          |
|   validator   | Function | This function accepts one parameter: the `Message` object of D.js.  It must return the message content (`String`) without any prefixes if the message is a command, or falsy if the command is not valid.  It will be evaluated for every message your bot receives, so don't do anything inefficient here. |
| ignoreInvalid |  boolean | By default, your command handler will ignore any invalid commands.  If, for some reason, you feel inclined to handle them yourself, invalid commands will reject with a `NotACommand` object that has properties `msg` of the Message object and `message` of string `Not a command.`.                      |

### Command-specific options!!!!!!!

We've already seen two of the properties your commands should export.  There's one more that you should be aware of before venturing out into the wild: the `validator`.  This validator accepts 2 parameters: the `Message` object and an array of `args`.

| Return type | Considered valid when...        | Considered invalid when...            |
|-------------|---------------------------------|---------------------------------------|
| Promise     | Resolves with anything.         | Rejects with an optional reason.      |
| Boolean     | true                            | false                                 |
| other       | falsy (undefined, for instance) | truthy (a string reason, for example) |

For example, the below command would be invalid if no arguments are passed:

```js
module.exports = {
    func: (message, args) => {
        return `hey ${args[0]}, wake up`;
    },
    triggers: [
        'poke',
        'prod',
    ],
    validator: (message, args) =>  {
        return args.length !== 0;
    }
}
```

> n.b. don't use this code if you really want to make a poke command.

### A couple other things

Your command handler emits `commandStarted` and `commandFinished` events.  Both pass an object of `{ message, cmd }` in which `message` is the message that triggered the command and `cmd` is the exported command properties minus `triggers`.  `commandFinished` has one extra property `result` which is the returned value from the command function.

The handler itself resolves with the result of the command.