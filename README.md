# Handles

[![Handles support server](https://discordapp.com/api/guilds/251245211416657931/embed.png)](https://discord.gg/DPuaDvP)
[![Build Status](https://travis-ci.org/appellation/handles.svg?branch=master)](https://travis-ci.org/appellation/handles)
[!Downloads](https://img.shields.io/npm/dt/discord-handles.svg)

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
const handler = new handles.Client();

client.on('message', handler.handle);
client.login('token');
```

This will automatically load all commands in the `./commands` directory and handle incoming messages.  See [`Command`](http://handles.topkek.pw/global.html#Command) in the docs for information on how to format the exports of the files you place in `./commands`.  The loader and handler can be configured according to [`Config`](http://handles.topkek.pw/global.html#Config) options passed to the constructor.

```js
const handler = new handles.Client({
    directory: './some/other/awesome/directory',
    prefixes: ['dank', 'memes']
});
```
