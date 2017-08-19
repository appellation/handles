import CommandMessage from '../structures/CommandMessage';

export type MiddlewareExecutor = (msg: CommandMessage) => any;
export interface IMiddleware {
  run: MiddlewareExecutor;
}
export type Middleware = IMiddleware | MiddlewareExecutor;
