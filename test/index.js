// process.on('unhandledRejection', console.error);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const raven = require('raven');
const discord = require('discord.js');
const handles = require('../dist/index');

raven.config(process.env.raven, {
  captureUnhandledRejections: true,
}).install();

const client = new discord.Client();
const handler = new handles.Client({
  directory: path.join('test', 'commands'),
  prefixes: new Set(['x!'])
});

// handler.on('commandFailed', console.error);
// handler.on('commandError', console.error);

raven.context(() => {
  client.on('message', m => {
    const extra = {
      message: {
        content: m.content,
        id: m.id,
        type: m.type,
      },
      channel: {
        id: m.channel.id,
        type: m.channel.type,
      },
      guild: {},
      client: {
        shard: m.client.shard ? m.client.shard.id : null,
        ping: m.client.ping,
        status: m.client.status,
      },
    };

    if (m.channel.type === 'text') {
      extra.guild = {
        id: m.guild.id,
        name: m.guild.name,
        owner: m.guild.ownerID,
      };

      const perms = m.channel.permissionsFor(m.guild.me);
      extra.channel.permissions = perms ? perms.serialize() : null;
    }

    raven.setContext({
      user: {
        id: m.author.id,
        username: m.author.tag,
      },
      extra,
    });

    handler.handle(m);
  });
});

client.once('ready', () => console.log('ready'));

client.login(process.env.BOT_TOKEN);
