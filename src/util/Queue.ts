export type QueueFunction<T> = () => Promise<T>;

export default class Queue<T = void> extends Array<QueueFunction<T>> {
  private _started: boolean = false;

  constructor() {
    super();
    Object.defineProperty(this, '_started', { writable: true, value: false });

    return new Proxy(this, {
      set(target, prop: any, value: QueueFunction<T>) {
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
