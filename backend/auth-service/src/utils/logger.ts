import winston from 'winston'

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

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json() // JSON format for easy parsing
  ),
  defaultMeta: {
    service: 'auth-service',
  },
  transports: [
    // Write all logs to console (for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // In production, you'd add file transports or CloudWatch
  ],
})

export default logger
