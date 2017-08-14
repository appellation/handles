/**
 * The base error class.  Used to represent user input errors as opposed to logic failures.
 */
export default class BaseError {
  /**
   * The error message.
   */
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  public toString() {
    return this.message;
  }
}
