import { Request, Response, NextFunction } from 'express';
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
    statusCode?: number;
    isOperational?: boolean;
}
export declare function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void;
/**
 * Creates an operational error (expected errors)
 *
 * Operational errors = errors we expect and handle (e.g., validation errors)
 * vs programming errors = bugs we didn't expect
 */
export declare function createError(message: string, statusCode?: number): AppError;
//# sourceMappingURL=error.middleware.d.ts.map