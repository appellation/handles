import Command from '../structures/Command';
import HandlesError, { Code } from '../util/Error';
import Runnable from '../util/Runnable';

export type HookExec = () => PromiseLike<void | boolean | string | Command>;

export default class Hook extends Runnable<void> {
  public fn: HookExec;

  constructor(fn: HookExec) {
    super();
    this.fn = fn;
  }

  public async run() {
    let res: void | boolean | string | Command;
    try {
      res = await this.fn();
    } catch (e) {
      if (e instanceof HandlesError) throw e;
      throw new HandlesError(Code.COMMAND_INVALID, e.message || e);
    }

    if (res === false) throw new HandlesError(Code.COMMAND_INVALID);
    if (typeof res === 'string') throw new HandlesError(Code.COMMAND_INVALID, res);
    if (res instanceof Command) await res;
  }
}
