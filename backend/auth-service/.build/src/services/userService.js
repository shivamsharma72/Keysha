"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByGoogleId = findUserByGoogleId;
exports.findUserByEmail = findUserByEmail;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.getUserRefreshToken = getUserRefreshToken;
exports.invalidateUserRefreshToken = invalidateUserRefreshToken;
const User_1 = __importDefault(require("../models/User"));
const encryption_1 = require("../utils/encryption");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Finds a user by Google ID
 *
 * Why Google ID? It's unique and provided by Google, so we can
 * identify users even if they change their email.
 */
async function findUserByGoogleId(googleId) {
    try {
        const user = await User_1.default.findOne({ googleId });
        return user;
    }
    catch (error) {
        logger_1.default.error('Error finding user by Google ID:', error);
        throw error;
    }
}
/**
 * Finds a user by email
 */
async function findUserByEmail(email) {
    try {
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        return user;
    }
    catch (error) {
        logger_1.default.error('Error finding user by email:', error);
        throw error;
    }
}
/**
 * Creates a new user
 *
 * Process:
 * 1. Encrypt refresh token before storing
 * 2. Create user document
 * 3. Save to database
 */
async function createUser(data) {
    try {
        // Encrypt refresh token before storing
        const encryptedToken = (0, encryption_1.encryptRefreshToken)(data.refreshToken);
        const user = new User_1.default({
            googleId: data.googleId,
            email: data.email.toLowerCase(),
            name: data.name,
            picture: data.picture,
            refreshToken: encryptedToken,
        });
        await user.save();
        logger_1.default.info(`Created new user: ${user.email}`);
        return user;
    }
    catch (error) {
        logger_1.default.error('Error creating user:', error);
        throw error;
    }
}
/**
 * Updates an existing user
 *
 * Handles:
 * - Updating user info (name, picture)
 * - Updating refresh token (when it's rotated)
 */
async function updateUser(userId, data) {
    try {
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.picture)
            updateData.picture = data.picture;
        // Encrypt refresh token if provided
        if (data.refreshToken) {
            updateData.refreshToken = (0, encryption_1.encryptRefreshToken)(data.refreshToken);
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
        if (user) {
            logger_1.default.debug(`Updated user: ${user.email}`);
        }
        return user;
    }
    catch (error) {
        logger_1.default.error('Error updating user:', error);
        throw error;
    }
}
/**
 * Gets a user's refresh token (decrypted)
 *
 * This is used when we need to refresh Google access tokens.
 * We decrypt the stored token and use it to get new tokens.
 */
async function getUserRefreshToken(userId) {
    try {
        // Use select to explicitly get refreshToken (normally excluded)
        const user = await User_1.default.findById(userId).select('+refreshToken');
        if (!user || !user.refreshToken) {
            return null;
        }
        // Decrypt the token
        return (0, encryption_1.decryptRefreshToken)(user.refreshToken);
    }
    catch (error) {
        logger_1.default.error('Error getting user refresh token:', error);
        throw error;
    }
}
/**
 * Invalidates a user's refresh token
 *
 * Used during logout - we set refreshToken to empty string.
 * This prevents the token from being used again.
 */
async function invalidateUserRefreshToken(userId) {
    try {
        await User_1.default.findByIdAndUpdate(userId, {
            $set: { refreshToken: '' },
        });
        logger_1.default.info(`Invalidated refresh token for user: ${userId}`);
    }
    catch (error) {
        logger_1.default.error('Error invalidating refresh token:', error);
        throw error;
    }
}
//# sourceMappingURL=userService.js.map