import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import logger from '../utils/logger'

/**
 * Authentication Middleware
 * 
 * For internal service-to-service communication.
 * Verifies JWT tokens or service API keys.
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

const JWT_SECRET = process.env.JWT_SECRET || ''

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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    }

    next()
  } catch (error) {
    logger.debug('Authentication failed:', error)
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Invalid token',
    })
  }
}
