"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
/**
 * Logger Utility - Structured Logging
 *
 * Why structured logging? Makes it easy to:
 * 1. Search logs by level, service, user
 * 2. Send to monitoring tools (CloudWatch, Datadog)
 * 3. Debug production issues
 *
 * Think of it like a filing system: instead of random notes,
 * we organize logs by type (error, info, warn) and add metadata.
 */
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json() // JSON format for easy parsing
    ),
    defaultMeta: {
        service: 'auth-service',
    },
    transports: [
        // Write all logs to console (for development)
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        // In production, you'd add file transports or CloudWatch
    ],
});
exports.default = logger;
//# sourceMappingURL=logger.js.map