const Discord = require('discord.js');
const Handles = require('../src/index');

const client = new Discord.Client();
client.once('ready', () => {
    const handler = new Handles(client, {
        // config options go here
    });
    client.on('message', handler.handle);
});
