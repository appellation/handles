exports.exec = (command) => {
    return command.args.member.ban();
};

exports.validator = (validator, command) => {
    // const mention = /<@!?([0-9]+)>/;
    return validator.apply(
        command.message.channel.type === 'text',
        'This command cannot be run outside of a guild.'
    ) &&
    validator.apply(
        command.message.member.hasPermission('BAN_MEMBERS'),
        'You do not have permission to run this command.'
    ) &&
    validator.apply(
        command.message.guild.me.permissions.has('BAN_MEMBERS'),
        'I cannot ban members in this guild.'
    );
};

exports.arguments = function* (Argument) {
    const member = new Argument('member')
        .setPrompt('Who would you like to ban?')
        .setRePrompt('Please provide a valid member.')
        .setResolver((c, msg) => {
            if (!msg.mentions.users.size) return null;

            let toBan = msg.mentions.users.filter(u => u.id !== u.client.user.id);
            if (toBan.size > 1) {
                member.rePrompt = `Found multiple users: \`${toBan.map(u => `${u.username}#${u.discriminator}`).join(', ')}\``;
                return null;
            }
            if (toBan.size < 1) return null;

            toBan = toBan.first();
            if (!toBan.bannable) return null;
            return msg.guild.member(toBan) || null;
        });

    yield member;
};

exports.triggers = [
    'ban',
    'banne',
    'b&',
    '🔨'
];
