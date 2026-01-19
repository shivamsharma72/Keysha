import { Request, Response, NextFunction } from 'express'
import { verifyToken, decodeToken } from '../services/jwtService'
import logger from '../utils/logger'

/**
 * Authentication Middleware
 * 
 * Middleware is like a "security checkpoint" that runs before your route handlers.
 * It checks if the user is authenticated before allowing them to proceed.
 * 
 * How it works:
 * 1. Extract JWT from Authorization header
 * 2. Verify token signature and expiration
 * 3. Attach user info to request object
 * 4. Call next() to continue to route handler
 * 
 * If token is invalid, it stops the request and returns 401.
 */

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
      }
    }
  }
}

/**
 * Verifies JWT token and attaches user to request
 * 
 * Use this for protected routes that require authentication
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    // Format: "Bearer <token>"
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    // Verify token
    const payload = verifyToken(token)

    // Attach user to request object
    // Now route handlers can access req.user
    req.user = {
      userId: payload.userId,
      email: payload.email,
    }

    // Continue to route handler
    next()
  } catch (error) {
    logger.debug('Authentication failed:', error)
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Invalid token',
    })
  }
}

/**
 * Optional authentication - doesn't fail if token is missing/invalid
 * 
 * Use this for routes that work with or without authentication
 * (e.g., public endpoints that show more data if authenticated)
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      req.user = {
        userId: payload.userId,
        email: payload.email,
      }
    }
  } catch (error) {
    // Ignore errors - authentication is optional
    logger.debug('Optional authentication failed (ignored):', error)
  }

  next()
}

/**
 * Decodes token even if expired (for refresh endpoint)
 * 
 * When refreshing, we want to get userId from expired token
 * but still verify it was signed by us.
 */
export function decodeExpiredToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const token = authHeader.substring(7)
    const payload = decodeToken(token)

    if (!payload) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    }

    next()
  } catch (error) {
    logger.debug('Token decode failed:', error)
    res.status(401).json({ message: 'Invalid token' })
  }
}
