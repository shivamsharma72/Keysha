import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../config/jwt'
import logger from '../utils/logger'

/**
 * Authentication Middleware
 * 
 * Verifies JWT token from Authorization header and attaches user to request.
 * Same pattern as auth-service for consistency.
 */

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

export function authenticate(
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
    const payload = verifyToken(token)

    req.user = {
      userId: payload.userId,
      email: payload.email,
    }

    next()
  } catch (error) {
    logger.debug('Authentication failed:', error)
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Invalid token',
    })
  }
}
