"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../config/jwt");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Generates a JWT token for a user
 *
 * Process:
 * 1. Create payload with user info
 * 2. Sign with secret key (creates signature)
 * 3. Return token string
 *
 * The token is self-contained - it has everything needed to verify
 * the user's identity without querying the database.
 */
function generateToken(payload) {
    try {
        const secret = jwt_1.JWT_CONFIG.secret;
        if (!secret || secret.length === 0) {
            throw new Error('JWT_SECRET is not configured');
        }
        // @ts-ignore - Type definition issue with jsonwebtoken, secret is validated above
        const token = jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: jwt_1.JWT_CONFIG.expiresIn,
            algorithm: 'HS256', // HMAC SHA-256 (symmetric encryption)
        });
        logger_1.default.debug(`Generated JWT for user: ${payload.email}`);
        return token;
    }
    catch (error) {
        logger_1.default.error('Failed to generate JWT:', error);
        throw new Error('Token generation failed');
    }
}
/**
 * Verifies and decodes a JWT token
 *
 * Process:
 * 1. Verify signature (proves token wasn't tampered)
 * 2. Check expiration
 * 3. Return decoded payload
 *
 * Throws error if:
 * - Signature invalid (token was modified)
 * - Token expired
 * - Token malformed
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwt_1.JWT_CONFIG.secret);
        // Additional validation
        if (!decoded.userId || !decoded.email) {
            throw new Error('Invalid token payload');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            logger_1.default.debug('JWT token expired');
            throw new Error('Token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            logger_1.default.debug('Invalid JWT token');
            throw new Error('Invalid token');
        }
        throw error;
    }
}
/**
 * Decodes a JWT without verification (for expired token refresh)
 *
 * Use case: When refreshing, we want to get userId from expired token
 * but still verify it was signed by us (even if expired).
 */
function decodeToken(token) {
    try {
        // Verify signature but ignore expiration
        const decoded = jsonwebtoken_1.default.verify(token, jwt_1.JWT_CONFIG.secret, {
            ignoreExpiration: true,
        });
        return decoded;
    }
    catch (error) {
        logger_1.default.debug('Failed to decode JWT:', error);
        return null;
    }
}
//# sourceMappingURL=jwtService.js.map