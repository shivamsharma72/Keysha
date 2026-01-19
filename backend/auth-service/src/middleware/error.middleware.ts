import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

/**
 * Error Handling Middleware
 * 
 * This is the "safety net" that catches all errors in your application.
 * Instead of crashing, it:
 * 1. Logs the error
 * 2. Returns a user-friendly error message
 * 3. Maintains consistent error format
 * 
 * Why centralized error handling? Makes debugging easier and prevents
 * sensitive error details from leaking to clients.
 */

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  // Determine status code
  const statusCode = err.statusCode || 500

  // Don't expose internal errors in production
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message

  // Return error response
  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

/**
 * Creates an operational error (expected errors)
 * 
 * Operational errors = errors we expect and handle (e.g., validation errors)
 * vs programming errors = bugs we didn't expect
 */
export function createError(
  message: string,
  statusCode: number = 400
): AppError {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}
