module.exports = (commandMessage) => {
    const msg = commandMessage;
    msg.resolveArgs().then(() => {
        msg.command.exec(msg);
    });
};
