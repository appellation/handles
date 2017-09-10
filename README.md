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
    prefixes: new Set(['dank', 'memes'])
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

                // if they provided a raw user ID
                if (member) return member;
                // if they mentioned someone
                else if (MessageMentions.USERS_PATTERN.test(c)) return this.guild.members.get(c.match(MessageMentions.USERS_PATTERN)[1]);
                // if they provided a user tag
                else if (this.guild.members.exists(u => u.tag === c)) return this.guild.members.find(u => u.tag === c);
                else return null;
            })
            .setPrompt('Who would you like to ban?')
            .setRePrompt('You provided an invalid user. Please try again.');

        await new Validator(this)
            .apply(member.bannable, 'I cannot ban this person.');
            .apply(member.highestRole.position < this.member.highestRole.position, 'You cannot ban this person.')

        await new Argument(this, 'days')
            .setResolver(c => parseInt(c) || null);
            .setOptional();
    }

    async exec() {
        await this.args.member.ban(this.args.days);
        return this.response.success(`banned ${this.args.member.user.tag}`);
    }
};
```
