export type Send = (
  data: string | IMessageOptions,
  options?: IMessageOptions,
) => Promise<Context>;

export interface IMessageOptions {
  /**
   * Whether to catch all rejections when sending.  The promise will always resolve when this option
   * is enabled; if there is an error, the resolution will be undefined.
   */
  catchall?: boolean;

  /**
   * Whether to send a new message regardless of any prior responses.
   */
  force?: boolean;
}

export default abstract class Context {
  public abstract id: string;
  public abstract authorID: string;
  public abstract channel: {
    id: string;
    type: string;
  };
  public abstract body: string;
}
