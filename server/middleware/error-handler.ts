import { NextFunction, Request, Response } from 'express';

interface ErrorResponse {
  message: string;
  status: number;
  timestamp: string;
  code?: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('Application error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err instanceof AppError ? err.status : 500;
  const message = err.message || 'Internal Server Error';
  const code = err instanceof AppError ? err.code : undefined;
  const details = err instanceof AppError ? err.details : undefined;

  const errorResponse: ErrorResponse = {
    message,
    status,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
    ...(details && { details }),
  };

  res.status(status).json({ error: errorResponse });
};
