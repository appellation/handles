import CommandMessage from '../CommandMessage';

export interface IMiddleware {
  run: (msg: CommandMessage) => any;
}
