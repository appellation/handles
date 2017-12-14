process.on('unhandledRejection', console.error);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// const raven = require('raven');
const discord = require('discord.js');
const handles = require('../dist/index');

// raven.config(process.env.raven, {
//   captureUnhandledRejections: true,
// }).install();

const client = new discord.Client();
const handler = new handles.Client(client, {
  directory: path.join('test', 'commands'),
  prefixes: ['x!'],
});

handler.on('commandError', ({ command, error }) => {
  // const extra = {
  //   message: {
  //     content: command.message.content,
  //     id: command.message.id,
  //     type: command.message.type,
  //   },
  //   channel: {
  //     id: command.message.channel.id,
  //     type: command.message.channel.type,
  //   },
  //   guild: {},
  //   client: {
  //     shard: command.client.shard ? command.client.shard.id : null,
  //     ping: command.client.ping,
  //     status: command.client.status,
  //   },
  // };

  // if (command.message.channel.type === 'text') {
  //   extra.guild = {
  //     id: command.guild.id,
  //     name: command.guild.name,
  //     owner: command.guild.ownerID,
  //   };
  // }
  console.error(error);
  // console.error(extra);

  // console.log(raven.captureException(error, {
  //   user: {
  //     id: command.message.author.id,
  //     username: command.message.author.tag,
  //   },
  //   extra
  // }));
});

client.once('ready', () => console.log('ready'));

client.login(process.env.BOT_TOKEN);
