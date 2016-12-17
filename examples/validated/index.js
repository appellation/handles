/**
 * Created by Will on 12/17/2016.
 */

const Discord = require('discord.js');
const handler = require('discord-handles')({
    validator: message => {
        // please don't do this, but it shows that you can
        return message.author.id === 'some id';
    }
});

const client = new Discord.Client();

client.on('message', handler);
client.login('token');