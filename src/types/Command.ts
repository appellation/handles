import CommandMessage from '../CommandMessage';

export type Trigger = string | RegExp;
export type CommandExecutor = (m: CommandMessage) => any;

export interface Command {
  triggers: Trigger[] | Trigger,
  disabled: boolean,
  exec: CommandExecutor,
  middleware: Function
}
