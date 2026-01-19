import winston from 'winston';
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
declare const logger: winston.Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map