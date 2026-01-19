"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const oauthService_1 = require("../services/oauthService");
const userService_1 = require("../services/userService");
const auth_middleware_1 = require("../middleware/auth.middleware");
const jwtService_1 = require("../services/jwtService");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Auth Routes - API Endpoints
 *
 * These are the "doors" to your authentication service.
 * Each route handles a specific part of the auth flow.
 */
const router = (0, express_1.Router)();
// Validation schemas (using Zod)
const callbackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Code is required'),
    codeVerifier: zod_1.z.string().min(43, 'Code verifier is required'),
});
/**
 * POST /auth/initiate
 *
 * Initiates OAuth flow - Step 1
 *
 * Request: None
 * Response: { authUrl: string, codeVerifier: string }
 *
 * This is called when user clicks "Sign in with Google"
 */
router.post('/initiate', async (_req, res) => {
    try {
        logger_1.default.info('OAuth initiation requested');
        const result = await (0, oauthService_1.initiateOAuth)();
        res.json({
            authUrl: result.authUrl,
            codeVerifier: result.codeVerifier,
        });
    }
    catch (error) {
        logger_1.default.error('Error in /auth/initiate:', error);
        throw (0, error_middleware_1.createError)(error instanceof Error ? error.message : 'Failed to initiate OAuth', 500);
    }
});
/**
 * POST /auth/callback
 *
 * Handles OAuth callback - Step 2
 *
 * Request: { code: string, codeVerifier: string }
 * Response: { token: string, user: { id, email, name, picture } }
 *
 * This is called after Google redirects back with authorization code
 */
router.post('/callback', async (req, res, next) => {
    try {
        // Validate request body
        const validationResult = callbackSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw (0, error_middleware_1.createError)('Invalid request data', 400);
        }
        const { code, codeVerifier } = validationResult.data;
        logger_1.default.info('OAuth callback received');
        const result = await (0, oauthService_1.handleOAuthCallback)(code, codeVerifier);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error in /auth/callback:', error);
        next(error);
    }
});
/**
 * POST /auth/refresh
 *
 * Refreshes JWT token
 *
 * Request: Authorization header with expired JWT
 * Response: { token: string, user: { id, email, name, picture } }
 *
 * This is called when JWT expires and frontend needs a new one
 */
router.post('/refresh', auth_middleware_1.decodeExpiredToken, // Middleware: allows expired tokens
async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, error_middleware_1.createError)('User not found in token', 401);
        }
        logger_1.default.info(`Token refresh requested for user: ${req.user.userId}`);
        const result = await (0, oauthService_1.refreshJWT)(req.user.userId);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error in /auth/refresh:', error);
        next(error);
    }
});
/**
 * POST /auth/logout
 *
 * Logs out user
 *
 * Request: Authorization header with JWT
 * Response: { message: string }
 *
 * This invalidates the refresh token, preventing further token refreshes
 */
router.post('/logout', auth_middleware_1.authenticate, // Middleware: requires valid JWT
async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, error_middleware_1.createError)('User not found', 401);
        }
        logger_1.default.info(`Logout requested for user: ${req.user.userId}`);
        // Invalidate refresh token
        await (0, userService_1.invalidateUserRefreshToken)(req.user.userId);
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        logger_1.default.error('Error in /auth/logout:', error);
        next(error);
    }
});
/**
 * GET /auth/me (Optional - for testing)
 *
 * Returns current user info
 *
 * Request: Authorization header with JWT
 * Response: { user: { id, email, name, picture } }
 */
router.get('/me', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, error_middleware_1.createError)('User not found', 401);
        }
        // Get user from database
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        const user = await User.findById(req.user.userId);
        if (!user) {
            throw (0, error_middleware_1.createError)('User not found', 404);
        }
        res.json({
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /auth/tokens/:userId
 * Get Google access token for a user
 *
 * Used by integration-service to make Google Calendar API calls.
 * Requires authentication (JWT) to prevent unauthorized access.
 *
 * For webhooks, we allow a special service token (check env var).
 */
router.get('/tokens/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Check if this is a service-to-service call (for webhooks)
        const serviceToken = req.headers['x-service-token'];
        const expectedServiceToken = process.env.SERVICE_TOKEN;
        // Log for debugging
        logger_1.default.debug(`Token request - userId: ${userId}, hasServiceToken: ${!!serviceToken}, hasExpectedToken: ${!!expectedServiceToken}`);
        if (serviceToken && expectedServiceToken && serviceToken === expectedServiceToken) {
            // Service-to-service call (for webhooks)
            logger_1.default.info(`Service-to-service token request for userId: ${userId}`);
            const accessToken = await (0, oauthService_1.getGoogleAccessToken)(userId);
            res.json({ accessToken });
            return;
        }
        // Log why service token auth failed
        if (serviceToken) {
            logger_1.default.warn(`Service token mismatch or missing. Received: ${serviceToken.substring(0, 10)}..., Expected: ${expectedServiceToken ? expectedServiceToken.substring(0, 10) + '...' : 'NOT SET'}`);
        }
        // Otherwise, require JWT authentication
        if (!req.headers.authorization) {
            throw (0, error_middleware_1.createError)('Authentication required. Provide either JWT token or x-service-token header.', 401);
        }
        // Use authenticate middleware logic
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = (0, jwtService_1.verifyToken)(token);
        if (decoded.userId !== userId) {
            throw (0, error_middleware_1.createError)('Unauthorized', 403);
        }
        const accessToken = await (0, oauthService_1.getGoogleAccessToken)(userId);
        res.json({ accessToken });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map