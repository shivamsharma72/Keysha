import { IUser } from '../models/User';
/**
 * User Service - User CRUD Operations
 *
 * This service handles all database operations related to users.
 * It's like a "file clerk" that knows how to find, create, and update
 * user records in the database.
 */
export interface CreateUserData {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    refreshToken: string;
}
export interface UpdateUserData {
    name?: string;
    picture?: string;
    refreshToken?: string;
}
/**
 * Finds a user by Google ID
 *
 * Why Google ID? It's unique and provided by Google, so we can
 * identify users even if they change their email.
 */
export declare function findUserByGoogleId(googleId: string): Promise<IUser | null>;
/**
 * Finds a user by email
 */
export declare function findUserByEmail(email: string): Promise<IUser | null>;
/**
 * Creates a new user
 *
 * Process:
 * 1. Encrypt refresh token before storing
 * 2. Create user document
 * 3. Save to database
 */
export declare function createUser(data: CreateUserData): Promise<IUser>;
/**
 * Updates an existing user
 *
 * Handles:
 * - Updating user info (name, picture)
 * - Updating refresh token (when it's rotated)
 */
export declare function updateUser(userId: string, data: UpdateUserData): Promise<IUser | null>;
/**
 * Gets a user's refresh token (decrypted)
 *
 * This is used when we need to refresh Google access tokens.
 * We decrypt the stored token and use it to get new tokens.
 */
export declare function getUserRefreshToken(userId: string): Promise<string | null>;
/**
 * Invalidates a user's refresh token
 *
 * Used during logout - we set refreshToken to empty string.
 * This prevents the token from being used again.
 */
export declare function invalidateUserRefreshToken(userId: string): Promise<void>;
//# sourceMappingURL=userService.d.ts.map