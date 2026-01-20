import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { createError } from '../middleware/error.middleware'
import { getGoogleAccessToken } from '../services/authService'
import { subscribeToCalendar, unsubscribeFromCalendar } from '../services/calendarService'
import { storeSubscription } from '../services/syncService'
import logger from '../utils/logger'

const router = Router()

/**
 * POST /subscriptions/calendar
 * 
 * Subscribes to user's Google Calendar changes.
 * Sets up webhook so Google notifies us when calendar changes.
 */
router.post('/calendar', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL

    if (!webhookBaseUrl) {
      throw createError('WEBHOOK_BASE_URL not configured', 500)
    }

    const webhookUrl = `${webhookBaseUrl}/webhooks/google/calendar`

    // Get JWT token from request headers
    const authHeader = req.headers.authorization
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

    if (!jwtToken) {
      throw createError('JWT token required', 401)
    }

    // Get user's Google access token
    const accessToken = await getGoogleAccessToken(req.user.userId, jwtToken)

    // Subscribe to Google Calendar
    const { channelId, resourceId, expiration } = await subscribeToCalendar(accessToken, webhookUrl)

    // Store subscription in database
    await storeSubscription(req.user.userId, resourceId, channelId, expiration)

    logger.info(`Subscribed user ${req.user.userId} to Google Calendar`)

    res.json({
      channelId,
      resourceId,
      expiration: expiration.toISOString(),
    })
  } catch (error) {
    logger.error('Error subscribing to calendar:', error)
    next(error)
  }
})

/**
 * DELETE /subscriptions/calendar
 * 
 * Unsubscribes from user's Google Calendar changes.
 */
router.delete('/calendar', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    // Get subscription from database
    const CalendarSubscription = (await import('../models/CalendarSubscription')).default
    const subscription = await CalendarSubscription.findOne({
      userId: req.user.userId,
    })

    if (!subscription) {
      throw createError('No subscription found', 404)
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

    // Get user's Google access token
    const accessToken = await getGoogleAccessToken(req.user.userId, jwtToken)

    // Unsubscribe from Google Calendar
    await unsubscribeFromCalendar(accessToken, subscription.channelId, subscription.resourceId)

    // Delete subscription from database
    await CalendarSubscription.deleteOne({ _id: subscription._id })

    logger.info(`Unsubscribed user ${req.user.userId} from Google Calendar`)

    res.json({ success: true })
  } catch (error) {
    logger.error('Error unsubscribing from calendar:', error)
    next(error)
  }
})

export default router
