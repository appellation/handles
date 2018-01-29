export enum Code {
  ARGUMENT_INVALID,
  ARGUMENT_MISSING,
  COMMAND_CANCELLED,
  COMMAND_INVALID,
}

export default class HandlesError {
  public readonly code: Code;
  public readonly message: string;

  constructor(code: Code) {
    this.code = code;
    this.message = Code[code];
  }

  public toString() {
    return this.message;
  }
}
