# Handles

For those of us who get frustrated with writing command handlers but don't quite want to use a full framework.  Intended for use with [Discord.js](https://github.com/hydrabolt/discord.js).

## Installation

```xl
npm install --save discord-handles
```

Or, if you want to risk cutting yourself, install the bleeding edge version:

```xl
npm install --save appellation/handles#master
```

Usually I try to avoid pushing broken code, but sometimes I move a little too fast.

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
module.exports = (message, args) => {
    return message.channel.sendMessage('pong');
}
```

This assumes a lot of things.  First of all, your commands are in a single directory called `commands` on the root level of your project.  Secondly, the only prefix is mentions.  In this case, your bot would only respond to `@Bot ping` (based on the default prefix and the filename) and it would do so by simply saying `pong`.

### Command options!!!!!!!

Let's face it: most of us like a little customization.  For those who like to tinker, your commands can also export an object of specific structure.

| Option    | Type                               | Description                                                                                                                                          |
|:---------:|:----------------------------------:|------------------------------------------------------------------------------------------------------------------------------------------------------|
| func      | Function                           | This is where you command happens; it takes two arguments: a `Message` object and an array of arguments respectively.                                |
| triggers  | Array<String/RegExp>/String/RegExp | This is what will trigger this command and can be either a string or a regular expression.  If it's an array, all of those triggers will be applied. |
| validator | Function                           | More below, but this determines whether to call the command or not.                                                                                  |
| respond   | boolean                            | Whether to automatically attempt to send the return value of the command function to the channel the command was issued in.                          |

The `validator` is pretty powerful and unfortunately complicated.  It takes two parameters, a `Message` object and an array of arguments, and should return a value as outlined below.

| Return type | Considered valid when...        | Considered invalid when...            |
|:-----------:|---------------------------------|---------------------------------------|
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

### Ooohhhhh, global options

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

Here's a complete list of options:

|     Option    |   Type   | Description                                                                                                                                                                                                                                                                                                 |
|:-------------:|:--------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|    respond    |  boolean | Determines whether the command handler should attempt to automatically respond with output from `func`.  If it's a promise, the promise will be resolved before outputting.  This is exactly the same as the command-level option.                                                                          |
|    prefixes   |   Array  | An array of strings, each of which denotes a prefix to which your bot will respond. You don't need this if you've specified a `validator` (below).                                                                                                                                                          |
|   directory   |  String  | When you want to name your command directory `folder of awesomeness`, simply set this to `./folder of awesomeness` and put your command files inside.  You can use this option to specify a subdirectory or any other schenanigans you might want.                                                          |
|   validator   | Function | This function accepts one parameter: the `Message` object of D.js.  It must return the message content (`String`) without any prefixes if the message is a command, or falsy if the command is not valid.  It will be evaluated for every message your bot receives, so don't do anything inefficient here. |
| ignoreInvalid |  boolean | By default, your command handler will ignore any invalid commands.  If, for some reason, you feel inclined to handle them yourself, invalid commands will reject with a `NotACommand` object that has properties `msg` of the Message object and `message` of string `Not a command.`.                      |

### A couple other things

Your command handler emits `commandStarted` and `commandFinished` events.  Both pass an object of `{ message, cmd }` in which `message` is the message that triggered the command and `cmd` is the exported command properties minus `triggers`.  `commandFinished` has one extra property `result` which is the returned value from the command function.

The handler itself resolves with the result of the command.

If either the handler or the command specify `respond`, the handler will respond.  There is no priority given to either (should be an easy fix if you want to PR it).