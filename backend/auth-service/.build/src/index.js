"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================
// CRITICAL: Load environment variables FIRST
// ============================================
// Using 'dotenv/config' imports and immediately loads .env file
// This MUST be the very first import - it executes immediately
require("dotenv/config");
// Now import everything else
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const googleOAuth_1 = require("./config/googleOAuth");
const jwt_1 = require("./config/jwt");
const cors_middleware_1 = require("./middleware/cors.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const logger_1 = __importDefault(require("./utils/logger"));
/**
 * Auth Service - Main Entry Point
 *
 * This is where everything comes together. Think of it as the "main stage"
 * where all the actors (routes, middleware, services) perform.
 *
 * Express.js is our web framework - it handles HTTP requests and responses.
 * It's like a restaurant: routes are the menu, middleware are the waiters,
 * and services are the kitchen.
 */
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
/**
 * Middleware Setup
 *
 * Middleware runs in order, so we set it up before routes.
 * Think of it like an assembly line - each middleware processes
 * the request before it reaches the route handler.
 */
// CORS - Allow frontend to make requests
app.use((0, cors_1.default)(cors_middleware_1.corsOptions));
// Body Parser - Parse JSON request bodies
app.use(express_1.default.json());
// Request Logging (optional - for debugging)
app.use((req, _res, next) => {
    logger_1.default.debug(`${req.method} ${req.path}`);
    next();
});
/**
 * Health Check Endpoint
 *
 * Useful for:
 * - Load balancers to check if service is alive
 * - Monitoring tools
 * - Quick verification that server is running
 */
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
    });
});
/**
 * API Routes
 *
 * All authentication endpoints are under /auth
 */
app.use('/auth', auth_routes_1.default);
/**
 * 404 Handler
 *
 * Catches any requests to routes that don't exist
 */
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
    });
});
/**
 * Error Handler
 *
 * Must be last middleware - catches all errors from routes
 */
app.use(error_middleware_1.errorHandler);
/**
 * Server Startup
 *
 * This is where we:
 * 1. Validate configuration
 * 2. Connect to database
 * 3. Start listening for requests
 */
async function startServer() {
    try {
        // Validate configuration
        logger_1.default.info('Validating configuration...');
        (0, googleOAuth_1.validateOAuthConfig)();
        (0, jwt_1.validateJWTConfig)();
        // Connect to database
        logger_1.default.info('Connecting to database...');
        await (0, database_1.connectDatabase)();
        // Start server
        app.listen(PORT, () => {
            logger_1.default.info(`🚀 Auth Service running on port ${PORT}`);
            logger_1.default.info(`📍 Health check: http://localhost:${PORT}/health`);
            logger_1.default.info(`📍 Auth endpoints: http://localhost:${PORT}/auth/*`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger_1.default.error('Unhandled promise rejection:', error);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught exception:', error);
    process.exit(1);
});
// Start the server
startServer();
//# sourceMappingURL=index.js.map