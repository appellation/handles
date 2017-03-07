process.on('unhandledRejection', err => { throw err });

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Discord = require('discord.js');
const Handles = require('../src/index');

const client = new Discord.Client();
const user = new Discord.Client();
const handler = new Handles({
    directory: path.join('test', 'commands')
});

handler.once('commandFailed', (cmd, err) => { throw err });
handler.once('error', err => { throw err });
handler.once('commandsLoaded', (cmds, errs) => {
    if(errs && errs.length) throw new Error(`Failed to load files: ${errs.join(', ')}`);
});
client.on('message', handler.handle);

user.once('ready', () => {
    const chan = user.channels.get(process.env.CHANNEL_ID);

    chan.awaitMessages(m => m.author.id === client.user.id, {
        max: 1,
        time: 10000
    }).then(messages => {
        user.destroy();
        client.destroy();
        if(!messages.size || messages.first().content !== 'pong') throw new Error('Command response was not sent.');
    });

    chan.sendMessage(`<@${client.user.id}> ping`);
});

client.login(process.env.BOT_TOKEN).then(() => user.login(process.env.USER_TOKEN));