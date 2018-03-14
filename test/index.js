// process.on('unhandledRejection', console.error);

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

// handler.on('error', console.log);

handler.on('loaded', console.log);

client.once('ready', () => console.log('ready'));

client.login(process.env.BOT_TOKEN);
