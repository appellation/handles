/**
 * Created by Will on 12/17/2016.
 */

const Discord = require('discord.js');
const handler = require('discord-handles')();

handler().on('commandStarted', ({message, content, cmd}) => {
    console.log(`started command with ${content}`);
});

handler().on('commandFinished', ({message, content, cmd, result}) => {
    console.log(`finished command with ${content}: resulted in ${result}`);
});

const client = new Discord.Client();

client.on('message', handler);
client.login('token');