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

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || '',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
}

/**
 * Validates JWT configuration
 */
export function validateJWTConfig(): void {
  if (!JWT_CONFIG.secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  if (JWT_CONFIG.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters for security')
  }
}
