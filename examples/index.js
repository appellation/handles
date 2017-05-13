const discord = require('discord.js');
const handles = require('../src/index');

const client = new discord.Client();
client.once('ready', () => {
    const handler = new handles.Client({
        // config options go here
    });
    client.on('message', handler.handle);
});
