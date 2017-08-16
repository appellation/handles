export type QueueFunction = (...args: any[]) => Promise<void>;

export default class Queue extends Array<QueueFunction> {
  private _started: boolean;

  constructor() {
    super();
    Object.defineProperty(this, '_started', { writable: true, value: false });

    return new Proxy(this, {
      set(target, prop: any, value: QueueFunction) {
        target[prop] = value;
        if (!isNaN(prop)) target.start();
        return true;
      },
    });
  }

  public async start() {
    if (this._started) return;
    this._started = true;

    while (this.length) {
      const func = this.shift();
      if (func) await func();
    }

    this._started = false;
  }
}
