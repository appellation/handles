export default abstract class Runnable<T> implements Promise<T> {
  public [Symbol.toStringTag]: 'Promise' = 'Promise';

  public then<TResult1 = T, TResult2 = never>(
    resolver?: ((value: any) => TResult1 | PromiseLike<TResult1>),
    rejector?: ((value: Error) => TResult2 | PromiseLike<TResult2>),
  ): Promise<TResult1 | TResult2> {
    return this._run().then(resolver, rejector);
  }

  public catch<TResult2 = never>(
    rejector?: ((value: Error) => TResult2 | PromiseLike<TResult2>),
  ): Promise<TResult2 | T> {
    return this.then(undefined, rejector);
  }

  protected abstract _run(): Promise<T>;
}
