/**
 * JWT Service - Token Generation and Verification
 *
 * This service handles creating and validating JWTs.
 * Think of it as the "ticket office" that issues and validates tickets.
 */
export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}
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
export declare function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
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
export declare function verifyToken(token: string): JWTPayload;
/**
 * Decodes a JWT without verification (for expired token refresh)
 *
 * Use case: When refreshing, we want to get userId from expired token
 * but still verify it was signed by us (even if expired).
 */
export declare function decodeToken(token: string): JWTPayload | null;
//# sourceMappingURL=jwtService.d.ts.map