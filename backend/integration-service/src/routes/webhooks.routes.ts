import { Router, Request, Response } from 'express'
import { getUserIdFromResourceId, shouldProcessWebhook, markGoogleModified } from '../services/syncService'
import { getGoogleAccessToken } from '../services/authService'
import logger from '../utils/logger'
import mongoose from 'mongoose'
import Item from '../models/Item'
import SyncState from '../models/SyncState'

const router = Router()

/**
 * POST /webhooks/google/calendar
 * 
 * Google Calendar webhook endpoint.
 * 
 * Google sends webhooks here when calendar events change.
 * 
 * IMPORTANT: Google first sends a verification request (GET) with a challenge.
 * We must respond with the challenge token, then Google starts sending real webhooks.
 */
router.get('/google/calendar', (req: Request, res: Response) => {
  // Google Calendar webhook verification
  // Google sends ?token=CHALLENGE_TOKEN in the initial request
  const challenge = req.query.token as string

  if (challenge) {
    logger.info('Google Calendar webhook verification received')
    // Return the challenge token to verify ownership
    res.status(200).send(challenge)
  } else {
    res.status(400).json({ message: 'Missing challenge token' })
  }
})

/**
 * POST /webhooks/google/calendar
 * 
 * Receives actual webhook notifications from Google Calendar.
 * 
 * Payload structure:
 * {
 *   "kind": "api#channel",
 *   "id": "channel-id",
 *   "resourceId": "resource-id",  // This maps to userId
 *   "resourceUri": "...",
 *   "token": "...",
 *   "expiration": "1234567890"
 * }
 */
router.post('/google/calendar', async (req: Request, res: Response) => {
  try {
    // IMPORTANT: Respond immediately to Google (within 5 seconds)
    // Then process asynchronously
    res.status(200).json({ received: true })

    // Google sends resourceId in BOTH body AND headers
    // Check headers first (X-Goog-Resource-Id), then body
    const resourceIdFromHeader = req.headers['x-goog-resource-id'] as string
    const resourceIdFromBody = req.body?.resourceId
    const resourceId = resourceIdFromHeader || resourceIdFromBody

    // Log webhook details for debugging
    logger.debug(`Webhook headers: ${JSON.stringify(req.headers)}`)
    logger.debug(`Webhook body: ${JSON.stringify(req.body)}`)
    logger.debug(`ResourceId from header: ${resourceIdFromHeader}, from body: ${resourceIdFromBody}`)

    // Google sends different types of webhooks:
    // 1. Initial verification (GET request with ?token=) - handled by GET handler
    // 2. Sync notification (POST with resourceId in header/body) - indicates calendar changed
    // 3. Expiration notification (POST with resourceId and expiration info)
    // 4. Empty POST (heartbeat/sync check - no resourceId, just checking if endpoint is alive)
    
    if (!resourceId) {
      // This is a heartbeat/sync check - Google is just verifying the endpoint is alive
      // These are normal and expected - respond with 200 OK and do nothing
      logger.debug('Webhook heartbeat received (no resourceId) - endpoint is alive')
      return
    }

    logger.info(`Google Calendar webhook received: resourceId=${resourceId}`)

    // Get userId from resourceId
    const userId = await getUserIdFromResourceId(resourceId)

    if (!userId) {
      logger.warn(`No user found for resourceId: ${resourceId}`)
      return
    }

    // Get user's Google access token
    // Webhooks don't have JWT tokens, so we use SERVICE_TOKEN for service-to-service auth
    const SERVICE_TOKEN = process.env.SERVICE_TOKEN
    if (!SERVICE_TOKEN) {
      logger.error('SERVICE_TOKEN not configured - webhooks cannot get access tokens')
      return
    }

    let accessToken: string
    try {
      // Use SERVICE_TOKEN for service-to-service authentication
      accessToken = await getGoogleAccessToken(userId, SERVICE_TOKEN)
      logger.debug(`Got access token for webhook: userId=${userId}`)
    } catch (error: any) {
      logger.error(`Failed to get access token for webhook: ${error.message}`)
      return // Can't process webhook without access token
    }

    // Parse resourceUri to get event IDs that changed
    // Format: https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json
    // We need to fetch the actual changed events
    // For now, we'll fetch recent events and check for changes

    // Get list of recent events from Google Calendar
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Get events from the last hour (webhooks are usually near real-time)
    const timeMin = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'updated',
    })

    const googleEvents = eventsResponse.data.items || []
    const googleCalendarIds = new Set<string>()

    // Process each event that exists in Google Calendar
    for (const googleEvent of googleEvents) {
      if (!googleEvent.id || !googleEvent.updated) {
        continue
      }

      const googleCalendarId = googleEvent.id
      googleCalendarIds.add(googleCalendarId)
      const googleLastModified = new Date(googleEvent.updated)

      // Check if we should process this (prevent infinite loop)
      const shouldProcess = await shouldProcessWebhook(googleCalendarId, googleLastModified)

      if (!shouldProcess) {
        logger.debug(`Skipping webhook for ${googleCalendarId} - already in sync`)
        continue
      }

      // Find existing item by googleCalendarId
      let existingItem = await Item.findOne({ 
        googleCalendarId, 
        userId: new mongoose.Types.ObjectId(userId) 
      })

      // If not found by googleCalendarId, check for duplicate by title + time
      if (!existingItem && googleEvent.start?.dateTime && googleEvent.end?.dateTime) {
        const startDate = new Date(googleEvent.start.dateTime)
        const title = googleEvent.summary || 'Untitled Event'
        
        existingItem = await Item.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          type: { $in: ['event', 'reminder'] },
          title: title,
          $or: [
            { startDate: { $gte: new Date(startDate.getTime() - 5 * 60 * 1000), $lte: new Date(startDate.getTime() + 5 * 60 * 1000) } },
            { reminderTime: { $gte: new Date(startDate.getTime() - 5 * 60 * 1000), $lte: new Date(startDate.getTime() + 5 * 60 * 1000) } },
          ],
        })

        // If found, link it to googleCalendarId
        if (existingItem) {
          await Item.findByIdAndUpdate(existingItem._id, { googleCalendarId })
          logger.debug(`Linked existing item to Google Calendar: ${googleCalendarId}`)
        }
      }

      if (existingItem) {
        // Update existing item directly in MongoDB (webhooks don't have JWT token)
        await Item.findByIdAndUpdate(existingItem._id, {
          $set: {
            title: googleEvent.summary || '',
            description: googleEvent.description,
            location: googleEvent.location,
            startDate: googleEvent.start?.dateTime ? new Date(googleEvent.start.dateTime) : undefined,
            endDate: googleEvent.end?.dateTime ? new Date(googleEvent.end.dateTime) : undefined,
            updatedAt: new Date(),
          },
        })

        // Mark as synced
        await markGoogleModified(
          existingItem._id.toString(),
          googleCalendarId,
          googleLastModified
        )

        logger.info(`Updated item from Google Calendar: ${googleCalendarId}`)
      } else {
        // New event in Google Calendar - create item directly in MongoDB
        // Only create if it has start/end times (is a real event)
        if (googleEvent.start?.dateTime && googleEvent.end?.dateTime) {
          // Double-check one more time before creating (race condition protection)
          // This prevents duplicates if webhook and full sync run simultaneously
          const duplicateCheck = await Item.findOne({
            googleCalendarId,
            userId: new mongoose.Types.ObjectId(userId),
          })

          if (duplicateCheck) {
            logger.debug(`Skipping duplicate creation - item already exists: ${googleCalendarId}`)
            // Update the existing item instead
            await Item.findByIdAndUpdate(duplicateCheck._id, {
              $set: {
                title: googleEvent.summary || '',
                description: googleEvent.description,
                location: googleEvent.location,
                startDate: new Date(googleEvent.start.dateTime),
                endDate: new Date(googleEvent.end.dateTime),
                updatedAt: new Date(),
              },
            })
            await markGoogleModified(duplicateCheck._id.toString(), googleCalendarId, googleLastModified)
            continue // Skip to next event
          }

          // Additional duplicate check by title + time (catches race conditions)
          // This prevents duplicates if webhook processes the same event multiple times
          const title = googleEvent.summary || 'Untitled Event'
          const startDate = new Date(googleEvent.start.dateTime)
          const duplicateByTitleAndTime = await Item.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['event', 'reminder'] },
            title: title,
            $or: [
              { startDate: { $gte: new Date(startDate.getTime() - 5 * 60 * 1000), $lte: new Date(startDate.getTime() + 5 * 60 * 1000) } },
              { reminderTime: { $gte: new Date(startDate.getTime() - 5 * 60 * 1000), $lte: new Date(startDate.getTime() + 5 * 60 * 1000) } },
            ],
          })

          if (duplicateByTitleAndTime) {
            // Link the existing item to googleCalendarId instead of creating a duplicate
            logger.debug(`Linking existing item to Google Calendar (duplicate by title+time): ${googleCalendarId}`)
            await Item.findByIdAndUpdate(duplicateByTitleAndTime._id, {
              $set: {
                googleCalendarId,
                title: googleEvent.summary || '',
                description: googleEvent.description,
                location: googleEvent.location,
                startDate: new Date(googleEvent.start.dateTime),
                endDate: new Date(googleEvent.end.dateTime),
                updatedAt: new Date(),
              },
            })
            await markGoogleModified(duplicateByTitleAndTime._id.toString(), googleCalendarId, googleLastModified)
            continue // Skip to next event
          }

          // Final check: Use findOneAndUpdate with upsert to prevent race conditions
          // This ensures only one item is created even if multiple webhooks process simultaneously
          const result = await Item.findOneAndUpdate(
            {
              googleCalendarId,
              userId: new mongoose.Types.ObjectId(userId),
            },
            {
              $setOnInsert: {
                userId: new mongoose.Types.ObjectId(userId),
                type: 'event',
                title: googleEvent.summary || 'Untitled Event',
                description: googleEvent.description,
                location: googleEvent.location,
                googleCalendarId,
                startDate: new Date(googleEvent.start.dateTime),
                endDate: new Date(googleEvent.end.dateTime),
                completed: false,
                createdAt: new Date(),
              },
              $set: {
                updatedAt: new Date(),
              },
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            }
          )

          // Mark as synced (result is always returned from findOneAndUpdate with upsert)
          if (result) {
            // Check if this was a newly created item by checking if it was just created
            // createdAt is added by Mongoose timestamps, access it safely
            const createdAt = (result as any).createdAt as Date | undefined
            const wasNewItem = createdAt && 
              (new Date().getTime() - createdAt.getTime()) < 1000 // Created within last second
            
            if (wasNewItem) {
              logger.info(`Created item from Google Calendar webhook: ${googleCalendarId}`)
            } else {
              logger.debug(`Updated existing item from Google Calendar webhook: ${googleCalendarId}`)
            }
            
            await markGoogleModified(result._id.toString(), googleCalendarId, googleLastModified)
          }
        }
      }
    }

    // Handle deletions: Delete items that exist in app but not in Google Calendar
    const appItemsWithGoogleId = await Item.find({
      userId: new mongoose.Types.ObjectId(userId),
      type: { $in: ['event', 'reminder'] },
      googleCalendarId: { $exists: true, $ne: null },
      $or: [
        { startDate: { $gte: timeMin, $lte: timeMax } },
        { reminderTime: { $gte: timeMin, $lte: timeMax } },
      ],
    })

    for (const appItem of appItemsWithGoogleId) {
      if (appItem.googleCalendarId && !googleCalendarIds.has(appItem.googleCalendarId)) {
        // Item exists in app but not in Google Calendar - delete it
        logger.info(`Webhook: Deleting item ${appItem._id} - no longer exists in Google Calendar`)
        await Item.findByIdAndDelete(appItem._id)
        // Also clean up sync state
        await SyncState.deleteOne({ itemId: appItem._id })
      }
    }

    logger.info(`Processed webhook for resourceId: ${resourceId}`)
  } catch (error) {
    logger.error('Error processing webhook:', error)
    // Don't throw - we already responded to Google
    // Log error for monitoring
  }
})

export default router
