import jwt from 'jsonwebtoken'
import { JWT_CONFIG } from '../config/jwt'
import logger from '../utils/logger'

/**
 * JWT Service - Token Generation and Verification
 * 
 * This service handles creating and validating JWTs.
 * Think of it as the "ticket office" that issues and validates tickets.
 */

export interface JWTPayload {
  userId: string
  email: string
  iat?: number // Issued at (added automatically by jwt.sign)
  exp?: number // Expiration (added automatically by jwt.sign)
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
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  try {
    const secret = JWT_CONFIG.secret
    if (!secret || secret.length === 0) {
      throw new Error('JWT_SECRET is not configured')
    }
    // @ts-ignore - Type definition issue with jsonwebtoken, secret is validated above
    const token = jwt.sign(payload, secret, {
      expiresIn: JWT_CONFIG.expiresIn,
      algorithm: 'HS256', // HMAC SHA-256 (symmetric encryption)
    })

    logger.debug(`Generated JWT for user: ${payload.email}`)
    return token
  } catch (error) {
    logger.error('Failed to generate JWT:', error)
    throw new Error('Token generation failed')
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
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret) as JWTPayload

    // Additional validation
    if (!decoded.userId || !decoded.email) {
      throw new Error('Invalid token payload')
    }

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('JWT token expired')
      throw new Error('Token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('Invalid JWT token')
      throw new Error('Invalid token')
    }
    throw error
  }
}

/**
 * Decodes a JWT without verification (for expired token refresh)
 * 
 * Use case: When refreshing, we want to get userId from expired token
 * but still verify it was signed by us (even if expired).
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    // Verify signature but ignore expiration
    const decoded = jwt.verify(token, JWT_CONFIG.secret, {
      ignoreExpiration: true,
    }) as JWTPayload

    return decoded
  } catch (error) {
    logger.debug('Failed to decode JWT:', error)
    return null
  }
}
