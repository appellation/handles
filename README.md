# Handles

[![Build Status](https://travis-ci.org/appellation/handles.svg?branch=master)](https://travis-ci.org/appellation/handles)

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

## The basics

```js
const Discord = require('discord.js');
const Handles = require('discord-handles');

const client = new Discord.Client();
const handler = new Handles();

client.on('message', m => {
    handler.handle(m);
});

client.login('token');
```

This will automatically load all commands in the `./commands` directory and handle incoming messages.  See `Command` in the docs for information on how to format the exports of the files you place in `./commands`.