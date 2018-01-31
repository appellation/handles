export enum Code {
  ARGUMENT_INVALID,
  ARGUMENT_MISSING,
  COMMAND_CANCELLED,
  COMMAND_INVALID,
}

export default class HandlesError {
  public readonly code: Code;
  public readonly message: string;
  public details?: string;

  constructor(code: Code, details?: string) {
    this.code = code;
    this.message = Code[code];
    this.details = details;
  }

  public toString() {
    return this.details ? `${this.message}: ${this.details}` : this.message;
  }
}
