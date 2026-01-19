import jwt from 'jsonwebtoken'
import logger from '../utils/logger'

/**
 * JWT Configuration
 * 
 * This service uses the SAME JWT_SECRET as auth-service to verify tokens.
 * In production, both services would share the secret via AWS Secrets Manager.
 */
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || '',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
}

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Verifies JWT token and returns payload
 */
export function verifyToken(token: string): JWTPayload {
  try {
    if (!JWT_CONFIG.secret) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, JWT_CONFIG.secret) as JWTPayload

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
