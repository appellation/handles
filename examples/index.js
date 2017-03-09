const Discord = require('discord.js');
const Handles = require('../src/index');

const client = new Discord.Client();
const handler = new Handles({
    // config options go here
});

client.on('message', handler.handle);