process.on('unhandledRejection', err => { throw err });

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const discord = require('discord.js');
const handles = require('../src/index');

const client = new discord.Client();
const user = new discord.Client();
const handler = new handles.Client({
    directory: path.join('test', 'commands'),
    prefixes: new Set(['x!'])
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

client.login(process.env.BOT_TOKEN);
