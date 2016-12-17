/**
 * Created by Will on 12/17/2016.
 */

module.exports = {
    func: (message, args) => {
        return message.channel.sendMessage('pong');
    }
};