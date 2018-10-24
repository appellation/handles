export enum Code {
  ARGUMENT_INVALID,
  ARGUMENT_MISSING,
  COMMAND_CANCELLED,
  COMMAND_INVALID,
}

export default class HandlesError extends Error {
  public readonly code: Code;
  public details?: string;

  constructor(code: Code, details?: string) {
    super(details || Code[code]);
    this.code = code;
    this.details = details;
  }
}
