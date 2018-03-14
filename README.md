# Handles

[![Handles support server](https://discordapp.com/api/guilds/251245211416657931/embed.png)](https://discord.gg/DPuaDvP)
[![Build Status](https://travis-ci.org/appellation/handles.svg?branch=master)](https://travis-ci.org/appellation/handles)
![Downloads](https://img.shields.io/npm/dt/discord-handles.svg)

For those of us who get frustrated with writing command handlers but don't quite want to use a full framework.  Intended for use with [Discord.js](https://github.com/hydrabolt/discord.js).

Documentation is available at [handles.topkek.pw](http://handles.topkek.pw).

## Getting started

### Installation

```xl
npm install --save discord-handles
```

Or, if you want to risk cutting yourself, install the bleeding edge version:

```xl
npm install --save appellation/handles#master
```

Usually I try to avoid pushing broken code, but sometimes I move a little too fast.

### The basics

```js
const discord = require('discord.js');
const handles = require('discord-handles');

const client = new discord.Client();
const handler = new handles.Client(client);

client.login('token');
```

This will automatically load all commands in the `./commands` directory and handle incoming messages.  See [`Command`](https://handles.topkek.pw/modules/_structures_command_.html) in the docs for information on how to format the exports of the files you place in `./commands`.  Particularly of interest are the `pre`, `exec`, and `post` methods.  The loader and handler can be configured according to [`Config`](https://handles.topkek.pw/modules/_interfaces_config_.html) options passed to the constructor.

```js
const handler = new handles.Client(client, {
    directory: './some/other/awesome/directory',
    prefixes: ['dank', 'memes']
});
```

Here's an example of what you might place in the `./commands` directory.
```js
const { MessageMentions, Permissions } = require('discord.js');
const { Command, Argument, Validator } = require('discord-handles');

module.exports = class extends Command {
    static get triggers() {
        return ['banne', 'ban'];
    }

    async pre() {
        await this.guild.fetchMembers();

        await new Validator(this)
            .apply(this.guild.me.permissions.has(Permissions.FLAGS.BAN_MEMBERS), 'I don\'t have permission to ban people.')
            .apply(this.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS), 'You don\'t have permission to ban people.');

        const member = await new Argument(this, 'member')
            .setResolver(c => {
                const member = this.guild.members.get(c);

                if (member) { // if they provided a raw user ID
                    return member;
                } else if (MessageMentions.USERS_PATTERN.test(c)) { // if they mentioned someone
                    return this.guild.members.get(c.match(MessageMentions.USERS_PATTERN)[1]);
                }

                // check for if they provided a tag
                const tag = this.guild.members.find(member => member.user.tag === c);
                if (tag) return tag;

                throw new Error(`Could not find a member matching \`${c}\`.`);
            })
            .setPrompt('Who would you like to ban?');

        await new Validator(this)
            .apply(member.bannable, 'I cannot ban this person.');
            .apply(member.highestRole.position < this.member.highestRole.position, 'You cannot ban this person.');

        await new Argument(this, 'days')
            .setPattern(/\d+/)
            .setResolver(c => {
                if (isNaN(c)) throw new Error('Please provide a valid number of days for which to purge messages.');
                const num = parseInt(c);
                if (num < 0) throw new Error('Please provide a number greater than 0.');
                if (num % 1 !== 0) throw new Error('Please provide an integer.');
                return num;
            });
            .setOptional();

        await new Argument(this, 'reason')
            .setInfinite()
            .setOptional();
    }

    async exec() {
        await this.args.member.ban(this.args.days);
        return this.response.reply(`banned ${this.args.member.user.tag} with reason *${this.args.reason}*`);
    }
};
```

Handles ships with some default error handlers, which simply respond to the user with a brief description of why the command execution was halted. Commands will emit `cancel` and `error` events on both the client and command instances, and listening on either the command or client will remove the default error handling.  For example, here's a simple global error handler.

```js
handler.on('error', (error, cmd) => {
    console.log(error);
    cmd.response.send(`he\'s dead Jim: \`${error}\``);
});
```

To respond gracefully to command cancellations, simply add a `cancel` listener on either the client (for global handling) or the command (for local handling).

```js
const { Error: { Code } } = require('discord-handles');

handler.on('cancel', (error, cmd) => {
    if (error.code === Code.ARGUMENT_MISSING) cmd.response.send(`Argument \`${error.details}\` is required.`);
    else cmd.response.send('Command cancelled.');
});
```

An argument will only be missing if there is no prompt specified and the argument could not be resolved from any provided content; otherwise, the command was cancelled for some other reason. The error parameter of the `cancel` event will always be an instance of `HandlesError`.
