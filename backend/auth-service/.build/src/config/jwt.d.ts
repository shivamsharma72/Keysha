/**
 * JWT Configuration
 *
 * JWT (JSON Web Token) is like a "ticket" that proves you're authenticated.
 * It contains:
 * - Header: Algorithm used (HS256)
 * - Payload: User info (userId, email) + expiration
 * - Signature: Cryptographically signed to prevent tampering
 *
 * Why JWT? Stateless authentication - server doesn't need to store sessions.
 * Perfect for serverless (Lambda) where we can't rely on in-memory sessions.
 *
 * Hotel Analogy:
 * - JWT = Room key card
 * - Contains your room number (userId) and expiration time
 * - Anyone can read it, but only the hotel (server) can create valid ones
 */
export declare const JWT_CONFIG: {
    secret: string;
    expiresIn: string;
};
/**
 * Validates JWT configuration
 */
export declare function validateJWTConfig(): void;
//# sourceMappingURL=jwt.d.ts.map