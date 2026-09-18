export class AppError extends Error {
  statusCode: number;
  details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    statusCode: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
