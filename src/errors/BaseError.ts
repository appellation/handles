export default class BaseError {
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  public toString() {
    return this.message;
  }
}
