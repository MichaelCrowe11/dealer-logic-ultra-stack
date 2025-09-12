import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ApiError) {
    logger.error(`API Error: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode
    });
    return;
  }

  logger.error('Unexpected error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500
  });
}