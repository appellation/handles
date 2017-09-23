export interface ICommand {
  pre(): Promise<void>;
  exec(): Promise<any>;
  post(): Promise<void>;
}
