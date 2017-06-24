// process.on('unhandledRejection', console.error);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const discord = require('discord.js');
const handles = require('../src/index');

const client = new discord.Client();
const handler = new handles.Client({
  directory: path.join('test', 'commands'),
  prefixes: new Set(['x!'])
});

handler.on('commandFailed', console.error);
handler.on('commandError', console.error);

client.on('message', handler.handle);
client.once('ready', () => console.log('ready'));

client.login(process.env.BOT_TOKEN);
