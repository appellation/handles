import CommandMessage from '../CommandMessage';
import { IMiddleware } from './IMiddleware';

export type Trigger = string | RegExp;
export type CommandExecutor = (m: CommandMessage) => any;

export interface ICommand {
  triggers: Trigger[] | Trigger;
  disabled: boolean;
  exec: CommandExecutor;
  middleware: (msg: CommandMessage) => Iterator<IMiddleware>;
}
