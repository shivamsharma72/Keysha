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
      logger.debug('No authorization header or invalid format', { 
        hasHeader: !!authHeader,
        headerPrefix: authHeader?.substring(0, 20) 
      })
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const token = authHeader.substring(7)
    
    // Validate token format (basic check)
    if (!token || token.length < 10) {
      logger.debug('Token too short or empty', { tokenLength: token?.length })
      res.status(401).json({ message: 'Invalid token format' })
      return
    }

    // Check if JWT_SECRET is configured
    if (!JWT_SECRET || JWT_SECRET.length === 0) {
      logger.error('JWT_SECRET is not configured')
      res.status(500).json({ message: 'Server configuration error' })
      return
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    }

    next()
  } catch (error) {
    logger.debug('Authentication failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'Unknown',
    })
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Invalid token',
    })
  }
}
