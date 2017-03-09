exports.func = (response, message, command) => {
    return command.message.guild.member(command.message.mentions.users.find(u => u.id !== u.client.id)).ban();
};

exports.validator = (validator, command) => {
    const mention = /<@!?([0-9]+)>/;
    const toBan = command.message.guild.member(command.message.mentions.users.find(u => u.id !== u.client.id));
    return validator.applyValid(
        command.message.channel.type === 'text',
        'This command cannot be run outside of a guild.'
    ) &&
    validator.applyValid(
        command.message.member.hasPermission('BAN_MEMBERS'),
        'You do not have permission to run this command.'
    ) &&
    validator.applyValid(
        command.message.mentions.users.some(u => u.id !== u.client.user.id),
        'You must mention a user.'
    ) &&
    validator.applyValid(
        toBan,
        'That member does\'t seem to exist. 👀'
    ) &&
    validator.applyValid(
        toBan.bannable,
        'I cannot ban that user.'
    );
};

exports.triggers = [
    'ban',
    'banne',
    'b&',
    '🔨'
];