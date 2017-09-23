export default abstract class Runnable<T> implements Promise<T> {
  public abstract run(): Promise<T>;

  public then<TResult1 = T, TResult2 = never>(
    resolver?: ((value: T) => TResult1 | PromiseLike<TResult1>),
    rejector?: ((value: Error) => TResult2 | PromiseLike<TResult2>),
  ): Promise<TResult1 | TResult2> {
    return new Promise((resolve, reject) => this.run()).then(resolver, rejector);
  }

  public catch<TResult2 = never>(rejector?: ((value: Error) => TResult2 | PromiseLike<TResult2>)) {
    return this.then(undefined, rejector);
  }

  public get [Symbol.toStringTag](): 'Promise' {
    return 'Promise';
  }
}
