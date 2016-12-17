/**
 * Created by Will on 12/17/2016.
 */

const Discord = require('discord.js');
const handler = require('discord-handles')();

const client = new Discord.Client();

client.on('message', handler);
client.login('token');