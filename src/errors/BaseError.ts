export default class BaseError {
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  toString() {
    return this.message;
  }
}
