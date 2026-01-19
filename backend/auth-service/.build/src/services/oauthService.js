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
exports.initiateOAuth = initiateOAuth;
exports.handleOAuthCallback = handleOAuthCallback;
exports.refreshJWT = refreshJWT;
exports.getGoogleAccessToken = getGoogleAccessToken;
const googleOAuth_1 = require("../config/googleOAuth");
const pkce_1 = require("../utils/pkce");
const userService_1 = require("./userService");
const jwtService_1 = require("./jwtService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Initiates OAuth Flow - Step 1
 *
 * This is called when user clicks "Sign in with Google"
 *
 * Process:
 * 1. Generate PKCE code verifier (random secret)
 * 2. Generate code challenge (hash of verifier)
 * 3. Build Google OAuth URL with all parameters
 * 4. Return URL + verifier to frontend
 *
 * The frontend will redirect to the URL, and we'll need the verifier
 * later to complete the flow.
 */
async function initiateOAuth() {
    try {
        const oauth2Client = (0, googleOAuth_1.getOAuth2Client)();
        // Generate PKCE code verifier and challenge
        const codeVerifier = (0, pkce_1.generateCodeVerifier)();
        const codeChallenge = (0, pkce_1.generateCodeChallenge)(codeVerifier);
        // Generate Google OAuth authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Request refresh token
            scope: googleOAuth_1.GOOGLE_SCOPES,
            prompt: 'consent', // Force consent screen (ensures refresh token)
            code_challenge: codeChallenge,
            // @ts-ignore - Type definition issue with googleapis, 'S256' is valid
            code_challenge_method: 'S256', // SHA256
        });
        logger_1.default.info('Generated OAuth authorization URL');
        // Return URL and verifier
        // Note: We return verifier to frontend, but in production you might
        // want to store it server-side (Redis) and return a session ID instead
        return {
            authUrl,
            codeVerifier,
            codeChallenge,
        };
    }
    catch (error) {
        logger_1.default.error('Error initiating OAuth:', error);
        throw new Error('Failed to initiate OAuth flow');
    }
}
/**
 * Handles OAuth Callback - Step 2
 *
 * This is called after Google redirects back with authorization code
 *
 * Process:
 * 1. Verify code verifier matches challenge
 * 2. Exchange authorization code with Google for tokens
 * 3. Get user info from Google using access token
 * 4. Create or update user in database
 * 5. Generate JWT for frontend
 *
 * This is the "check-in" moment - user is authenticated, now we issue
 * them a "room key" (JWT) to access the app.
 */
async function handleOAuthCallback(code, codeVerifier) {
    try {
        const oauth2Client = (0, googleOAuth_1.getOAuth2Client)();
        // Step 1: Exchange authorization code for tokens
        // This is where we use the code verifier - Google verifies it matches
        // the challenge we sent earlier
        const { tokens } = await oauth2Client.getToken({
            code,
            codeVerifier,
        });
        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Failed to obtain tokens from Google');
        }
        logger_1.default.info('Successfully exchanged code for tokens');
        // Step 2: Set credentials on OAuth client
        oauth2Client.setCredentials(tokens);
        // Step 3: Get user info from Google
        const { google } = await Promise.resolve().then(() => __importStar(require('googleapis')));
        const oauth2 = google.oauth2('v2');
        const userInfoResponse = await oauth2.userinfo.get({
            auth: oauth2Client,
        });
        const googleUser = userInfoResponse.data;
        if (!googleUser.id || !googleUser.email) {
            throw new Error('Invalid user data from Google');
        }
        logger_1.default.info(`Retrieved user info for: ${googleUser.email}`);
        // Step 4: Create or update user in database
        let user = await (0, userService_1.findUserByGoogleId)(googleUser.id);
        if (user) {
            // User exists - update refresh token (in case it was rotated)
            user = await (0, userService_1.updateUser)(user._id.toString(), {
                name: googleUser.name || user.name,
                picture: googleUser.picture || user.picture,
                refreshToken: tokens.refresh_token,
            });
        }
        else {
            // New user - create account
            user = await (0, userService_1.createUser)({
                googleId: googleUser.id,
                email: googleUser.email,
                name: googleUser.name || 'User',
                picture: googleUser.picture || undefined,
                refreshToken: tokens.refresh_token,
            });
        }
        if (!user) {
            throw new Error('Failed to create/update user');
        }
        // Step 5: Generate JWT for frontend
        const jwtToken = (0, jwtService_1.generateToken)({
            userId: user._id.toString(),
            email: user.email,
        });
        logger_1.default.info(`Generated JWT for user: ${user.email}`);
        return {
            token: jwtToken,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        };
    }
    catch (error) {
        logger_1.default.error('Error handling OAuth callback:', error);
        throw error;
    }
}
/**
 * Refreshes JWT Token
 *
 * When JWT expires, frontend calls this to get a new one.
 *
 * Process:
 * 1. Decode expired JWT to get userId
 * 2. Get user's refresh token from database
 * 3. Use refresh token to get new Google access token
 * 4. Generate new JWT
 *
 * Why refresh Google token? In case we need to call Google APIs,
 * we want a fresh access token. But mostly we just need a new JWT.
 */
async function refreshJWT(userId) {
    try {
        // Get user's refresh token
        const refreshToken = await (0, userService_1.getUserRefreshToken)(userId);
        if (!refreshToken) {
            throw new Error('No refresh token found for user');
        }
        // Use refresh token to get new Google access token
        const oauth2Client = (0, googleOAuth_1.getOAuth2Client)();
        oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });
        // Refresh the access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (!credentials.access_token) {
            throw new Error('Failed to refresh Google access token');
        }
        // Get user from database
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Generate new JWT
        const jwtToken = (0, jwtService_1.generateToken)({
            userId: user._id.toString(),
            email: user.email,
        });
        logger_1.default.info(`Refreshed JWT for user: ${user.email}`);
        return {
            token: jwtToken,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        };
    }
    catch (error) {
        logger_1.default.error('Error refreshing JWT:', error);
        throw error;
    }
}
/**
 * Gets Google access token for a user
 *
 * Used by integration-service to make Google Calendar API calls.
 *
 * Process:
 * 1. Get user's refresh token from database
 * 2. Use refresh token to get new Google access token
 * 3. Return access token
 */
async function getGoogleAccessToken(userId) {
    try {
        // Get user's refresh token
        const refreshToken = await (0, userService_1.getUserRefreshToken)(userId);
        if (!refreshToken) {
            throw new Error('No refresh token found for user');
        }
        // Use refresh token to get new Google access token
        const oauth2Client = (0, googleOAuth_1.getOAuth2Client)();
        oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });
        // Refresh the access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (!credentials.access_token) {
            throw new Error('Failed to refresh Google access token');
        }
        logger_1.default.debug(`Got Google access token for user: ${userId}`);
        return credentials.access_token;
    }
    catch (error) {
        logger_1.default.error('Error getting Google access token:', error);
        throw error;
    }
}
//# sourceMappingURL=oauthService.js.map