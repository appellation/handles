import CommandMessage from '../structures/CommandMessage';

export interface IMiddleware {
  run: (msg: CommandMessage) => any;
}
