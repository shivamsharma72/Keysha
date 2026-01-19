import { Router, Request, Response } from 'express'
import { z } from 'zod'
import {
  initiateOAuth,
  handleOAuthCallback,
  refreshJWT,
  getGoogleAccessToken,
} from '../services/oauthService'
import { invalidateUserRefreshToken } from '../services/userService'
import { authenticate, decodeExpiredToken } from '../middleware/auth.middleware'
import { verifyToken } from '../services/jwtService'
import { createError } from '../middleware/error.middleware'
import logger from '../utils/logger'

/**
 * Auth Routes - API Endpoints
 * 
 * These are the "doors" to your authentication service.
 * Each route handles a specific part of the auth flow.
 */

const router = Router()

// Validation schemas (using Zod)
const callbackSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  codeVerifier: z.string().min(43, 'Code verifier is required'),
})

/**
 * POST /auth/initiate
 * 
 * Initiates OAuth flow - Step 1
 * 
 * Request: None
 * Response: { authUrl: string, codeVerifier: string }
 * 
 * This is called when user clicks "Sign in with Google"
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    logger.info('OAuth initiation requested')

    const result = await initiateOAuth()

    res.json({
      authUrl: result.authUrl,
      codeVerifier: result.codeVerifier,
    })
  } catch (error) {
    logger.error('Error in /auth/initiate:', error)
    throw createError(
      error instanceof Error ? error.message : 'Failed to initiate OAuth',
      500
    )
  }
})

/**
 * POST /auth/callback
 * 
 * Handles OAuth callback - Step 2
 * 
 * Request: { code: string, codeVerifier: string }
 * Response: { token: string, user: { id, email, name, picture } }
 * 
 * This is called after Google redirects back with authorization code
 */
router.post('/callback', async (req: Request, res: Response, next) => {
  try {
    // Validate request body
    const validationResult = callbackSchema.safeParse(req.body)

    if (!validationResult.success) {
      throw createError('Invalid request data', 400)
    }

    const { code, codeVerifier } = validationResult.data

    logger.info('OAuth callback received')

    const result = await handleOAuthCallback(code, codeVerifier)

    res.json(result)
  } catch (error) {
    logger.error('Error in /auth/callback:', error)
    next(error)
  }
})

/**
 * POST /auth/refresh
 * 
 * Refreshes JWT token
 * 
 * Request: Authorization header with expired JWT
 * Response: { token: string, user: { id, email, name, picture } }
 * 
 * This is called when JWT expires and frontend needs a new one
 */
router.post(
  '/refresh',
  decodeExpiredToken, // Middleware: allows expired tokens
  async (req: Request, res: Response, next) => {
    try {
      if (!req.user) {
        throw createError('User not found in token', 401)
      }

      logger.info(`Token refresh requested for user: ${req.user.userId}`)

      const result = await refreshJWT(req.user.userId)

      res.json(result)
    } catch (error) {
      logger.error('Error in /auth/refresh:', error)
      next(error)
    }
  }
)

/**
 * POST /auth/logout
 * 
 * Logs out user
 * 
 * Request: Authorization header with JWT
 * Response: { message: string }
 * 
 * This invalidates the refresh token, preventing further token refreshes
 */
router.post(
  '/logout',
  authenticate, // Middleware: requires valid JWT
  async (req: Request, res: Response, next) => {
    try {
      if (!req.user) {
        throw createError('User not found', 401)
      }

      logger.info(`Logout requested for user: ${req.user.userId}`)

      // Invalidate refresh token
      await invalidateUserRefreshToken(req.user.userId)

      res.json({ message: 'Logged out successfully' })
    } catch (error) {
      logger.error('Error in /auth/logout:', error)
      next(error)
    }
  }
)

/**
 * GET /auth/me (Optional - for testing)
 * 
 * Returns current user info
 * 
 * Request: Authorization header with JWT
 * Response: { user: { id, email, name, picture } }
 */
router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    // Get user from database
    const User = (await import('../models/User')).default
    const user = await User.findById(req.user.userId)

    if (!user) {
      throw createError('User not found', 404)
    }

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /auth/tokens/:userId
 * Get Google access token for a user
 *
 * Used by integration-service to make Google Calendar API calls.
 * Requires authentication (JWT) to prevent unauthorized access.
 * 
 * For webhooks, we allow a special service token (check env var).
 */
router.get('/tokens/:userId', async (req: Request, res: Response, next) => {
  try {
    const { userId } = req.params
    
    // Check if this is a service-to-service call (for webhooks)
    const serviceToken = req.headers['x-service-token'] as string
    const expectedServiceToken = process.env.SERVICE_TOKEN
    
    // Log for debugging
    logger.debug(`Token request - userId: ${userId}, hasServiceToken: ${!!serviceToken}, hasExpectedToken: ${!!expectedServiceToken}`)
    
    if (serviceToken && expectedServiceToken && serviceToken === expectedServiceToken) {
      // Service-to-service call (for webhooks)
      logger.info(`Service-to-service token request for userId: ${userId}`)
      const accessToken = await getGoogleAccessToken(userId)
      return res.json({ accessToken })
    }
    
    // Log why service token auth failed
    if (serviceToken) {
      logger.warn(`Service token mismatch or missing. Received: ${serviceToken.substring(0, 10)}..., Expected: ${expectedServiceToken ? expectedServiceToken.substring(0, 10) + '...' : 'NOT SET'}`)
    }
    
    // Otherwise, require JWT authentication
    if (!req.headers.authorization) {
      throw createError('Authentication required. Provide either JWT token or x-service-token header.', 401)
    }
    
    // Use authenticate middleware logic
    const token = req.headers.authorization.replace('Bearer ', '')
    const decoded = verifyToken(token)
    
    if (decoded.userId !== userId) {
      throw createError('Unauthorized', 403)
    }

    const accessToken = await getGoogleAccessToken(userId)

    res.json({ accessToken })
  } catch (error) {
    next(error)
  }
})

export default router
