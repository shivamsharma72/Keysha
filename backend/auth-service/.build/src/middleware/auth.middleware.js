"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.decodeExpiredToken = decodeExpiredToken;
const jwtService_1 = require("../services/jwtService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Verifies JWT token and attaches user to request
 *
 * Use this for protected routes that require authentication
 */
function authenticate(req, res, next) {
    try {
        // Get token from Authorization header
        // Format: "Bearer <token>"
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'No token provided' });
            return;
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        // Verify token
        const payload = (0, jwtService_1.verifyToken)(token);
        // Attach user to request object
        // Now route handlers can access req.user
        req.user = {
            userId: payload.userId,
            email: payload.email,
        };
        // Continue to route handler
        next();
    }
    catch (error) {
        logger_1.default.debug('Authentication failed:', error);
        res.status(401).json({
            message: error instanceof Error ? error.message : 'Invalid token',
        });
    }
}
/**
 * Optional authentication - doesn't fail if token is missing/invalid
 *
 * Use this for routes that work with or without authentication
 * (e.g., public endpoints that show more data if authenticated)
 */
function optionalAuthenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwtService_1.verifyToken)(token);
            req.user = {
                userId: payload.userId,
                email: payload.email,
            };
        }
    }
    catch (error) {
        // Ignore errors - authentication is optional
        logger_1.default.debug('Optional authentication failed (ignored):', error);
    }
    next();
}
/**
 * Decodes token even if expired (for refresh endpoint)
 *
 * When refreshing, we want to get userId from expired token
 * but still verify it was signed by us.
 */
function decodeExpiredToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'No token provided' });
            return;
        }
        const token = authHeader.substring(7);
        const payload = (0, jwtService_1.decodeToken)(token);
        if (!payload) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }
        req.user = {
            userId: payload.userId,
            email: payload.email,
        };
        next();
    }
    catch (error) {
        logger_1.default.debug('Token decode failed:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
}
//# sourceMappingURL=auth.middleware.js.map