"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.createError = createError;
const logger_1 = __importDefault(require("../utils/logger"));
function errorHandler(err, req, res, _next) {
    // Log error with context
    logger_1.default.error('Request error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    // Determine status code
    const statusCode = err.statusCode || 500;
    // Don't expose internal errors in production
    const message = statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
    // Return error response
    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
/**
 * Creates an operational error (expected errors)
 *
 * Operational errors = errors we expect and handle (e.g., validation errors)
 * vs programming errors = bugs we didn't expect
 */
function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
}
//# sourceMappingURL=error.middleware.js.map