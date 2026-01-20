import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { createError } from '../middleware/error.middleware'
import { getGoogleAccessToken } from '../services/authService'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  findCalendarEventByTitleAndTime,
} from '../services/calendarService'
import { markAppModified, markGoogleModified } from '../services/syncService'
import { updateItemFromCalendar, createItemFromCalendar } from '../services/itemService'
import logger from '../utils/logger'
import axios from 'axios'
import { google } from 'googleapis'
import Item from '../models/Item'
import SyncState from '../models/SyncState'
import mongoose from 'mongoose'

const router = Router()

/**
 * POST /sync/calendar/create
 * 
 * Creates an event in Google Calendar.
 * Called by item-service when user creates an EVENT.
 */
router.post('/calendar/create', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const { itemId, title, description, location, startDate, endDate } = req.body

    if (!itemId || !title || !startDate || !endDate) {
      throw createError('Missing required fields', 400)
    }

    // Get JWT token from request headers
    const authHeader = req.headers.authorization
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

    if (!jwtToken) {
      throw createError('JWT token required', 401)
    }

    // Get user's Google access token
    const accessToken = await getGoogleAccessToken(req.user.userId, jwtToken)

    // Check if event already exists in Google Calendar (duplicate protection)
    // This prevents creating duplicates when user creates an event that already exists in Google Calendar
    logger.debug(`Checking if event "${title}" already exists in Google Calendar before creating`)
    const existingGoogleEventId = await findCalendarEventByTitleAndTime(
      accessToken,
      title,
      new Date(startDate),
      new Date(endDate)
    )

    let googleCalendarId: string

    if (existingGoogleEventId) {
      // Event already exists in Google Calendar - link it instead of creating duplicate
      logger.info(`Found existing Google Calendar event ${existingGoogleEventId} for "${title}" - linking instead of creating duplicate`)
      googleCalendarId = existingGoogleEventId

      // Update the item with the existing googleCalendarId
      try {
        const ITEM_SERVICE_URL = process.env.ITEM_SERVICE_URL || 'http://localhost:3002'
        await axios.patch(`${ITEM_SERVICE_URL}/items/${itemId}`, {
          googleCalendarId,
        }, {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        })
        logger.info(`Linked item ${itemId} to existing Google Calendar event: ${googleCalendarId}`)
      } catch (error: any) {
        logger.warn(`Could not update item with googleCalendarId: ${error.message}`)
      }

      // Mark as synced (Google's version is the source of truth)
      // Fetch the Google event to get its updated timestamp
      try {
        const { getCalendarEvent } = await import('../services/calendarService')
        const eventDetails = await getCalendarEvent(accessToken, existingGoogleEventId)
        if (eventDetails.updated) {
          await markGoogleModified(itemId, existingGoogleEventId, new Date(eventDetails.updated))
        }
      } catch (err) {
        logger.warn(`Could not fetch event details for ${existingGoogleEventId}`)
      }
    } else {
      // Event doesn't exist - create it
      logger.info(`Creating new Google Calendar event for "${title}"`)
      googleCalendarId = await createCalendarEvent(accessToken, {
        title,
        description,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      })

      // Mark that we modified this (so we ignore the webhook that will come back)
      await markAppModified(itemId, googleCalendarId)
      logger.info(`Created calendar event: itemId=${itemId}, googleCalendarId=${googleCalendarId}`)
    }

    res.json({ googleCalendarId })
  } catch (error) {
    logger.error('Error syncing calendar create:', error)
    next(error)
  }
})

/**
 * POST /sync/calendar/update
 * 
 * Updates an event in Google Calendar.
 * Called by item-service when user updates an EVENT.
 */
router.post('/calendar/update', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const { itemId, googleCalendarId, title, description, location, startDate, endDate } = req.body

    if (!itemId || !googleCalendarId) {
      throw createError('Missing itemId or googleCalendarId', 400)
    }

    // Get JWT token from request headers
    const authHeader = req.headers.authorization
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

    if (!jwtToken) {
      throw createError('JWT token required', 401)
    }

    // Get user's Google access token
    const accessToken = await getGoogleAccessToken(req.user.userId, jwtToken)

    // Update event in Google Calendar
    await updateCalendarEvent(accessToken, googleCalendarId, {
      title,
      description,
      location,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    // Mark that we modified this
    await markAppModified(itemId, googleCalendarId)

    logger.info(`Updated calendar event: itemId=${itemId}, googleCalendarId=${googleCalendarId}`)

    res.json({ success: true })
  } catch (error) {
    logger.error('Error syncing calendar update:', error)
    next(error)
  }
})

/**
 * POST /sync/calendar/delete
 * 
 * Deletes an event from Google Calendar.
 * Called by item-service when user deletes an EVENT.
 */
router.post('/calendar/delete', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const { googleCalendarId } = req.body

    if (!googleCalendarId) {
      throw createError('Missing googleCalendarId', 400)
    }

    // Get JWT token from request headers
    const authHeader = req.headers.authorization
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

    if (!jwtToken) {
      throw createError('JWT token required', 401)
    }

    // Get user's Google access token
    const accessToken = await getGoogleAccessToken(req.user.userId, jwtToken)

    // Delete event from Google Calendar
    await deleteCalendarEvent(accessToken, googleCalendarId)

    logger.info(`Deleted calendar event: googleCalendarId=${googleCalendarId}`)

    res.json({ success: true })
  } catch (error) {
    logger.error('Error syncing calendar delete:', error)
    next(error)
  }
})

/**
 * POST /sync/full
 * 
 * Performs a full two-way sync between Google Calendar and the app.
 * 
 * This syncs:
 * 1. Google Calendar events → App (creates/updates items)
 * 2. App events → Google Calendar (creates/updates calendar events)
 */
router.post('/full', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const { startDate, endDate } = req.body

    if (!startDate || !endDate) {
      throw createError('startDate and endDate are required', 400)
    }

    // Get JWT token from request headers
    const authHeader = req.headers.authorization
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

    if (!jwtToken) {
      throw createError('JWT token required', 401)
    }

    // Get user's Google access token
    const accessToken = await getGoogleAccessToken(req.user.userId, jwtToken)

    const stats = {
      googleToApp: { created: 0, updated: 0, deleted: 0 },
      appToGoogle: { created: 0, updated: 0 },
    }

    // Step 1: Fetch all Google Calendar events
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const googleEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const googleEvents = googleEventsResponse.data.items || []
    const googleCalendarIds = new Set<string>()
    const googleEventsMap = new Map<string, typeof googleEvents[0]>() // Map googleCalendarId -> event

    // Step 2: Sync Google Calendar events → App
    // Google Calendar is the source of truth for events
    for (const googleEvent of googleEvents) {
      if (!googleEvent.id || !googleEvent.start?.dateTime || !googleEvent.end?.dateTime) {
        continue // Skip all-day events or invalid events
      }

      const googleCalendarId = googleEvent.id
      googleCalendarIds.add(googleCalendarId) // Track which events exist in Google
      if (googleCalendarId) {
        googleEventsMap.set(googleCalendarId, googleEvent) // Store event for later lookup
      }
      const googleLastModified = googleEvent.updated ? new Date(googleEvent.updated) : new Date()

      // Check if item already exists by googleCalendarId (primary check)
      let existingItem = await Item.findOne({
        googleCalendarId,
        userId: new mongoose.Types.ObjectId(req.user.userId),
      })

      // If not found by googleCalendarId, check for duplicate by title + time
      // This prevents creating duplicates when an item exists but doesn't have googleCalendarId yet
      if (!existingItem) {
        const startDate = new Date(googleEvent.start.dateTime)
        const title = googleEvent.summary || 'Untitled Event'
        
        existingItem = await Item.findOne({
          userId: new mongoose.Types.ObjectId(req.user.userId),
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
        // Update existing item if Google's version is newer
        const syncState = await SyncState.findOne({ googleCalendarId })
        const shouldUpdate =
          !syncState || googleLastModified > syncState.lastAppModified

        if (shouldUpdate) {
          await updateItemFromCalendar(jwtToken, existingItem._id.toString(), {
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || undefined,
            location: googleEvent.location || undefined,
            startDate: googleEvent.start.dateTime || undefined,
            endDate: googleEvent.end.dateTime || undefined,
          })

          await markGoogleModified(
            existingItem._id.toString(),
            googleCalendarId,
            googleLastModified
          )

          stats.googleToApp.updated++
          logger.debug(`Updated item from Google Calendar: ${googleCalendarId}`)
        }
      } else {
        // Create new item from Google Calendar event (only if it doesn't exist)
        // Double-check one more time before creating (race condition protection)
        // This prevents duplicates if webhook and full sync run simultaneously
        const finalDuplicateCheck = await Item.findOne({
          googleCalendarId,
          userId: new mongoose.Types.ObjectId(req.user.userId),
        })

        if (finalDuplicateCheck) {
          logger.debug(`Skipping duplicate creation in full sync - item already exists: ${googleCalendarId}`)
          // Update the existing item instead
          await updateItemFromCalendar(jwtToken, finalDuplicateCheck._id.toString(), {
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || undefined,
            location: googleEvent.location || undefined,
            startDate: googleEvent.start.dateTime || undefined,
            endDate: googleEvent.end.dateTime || undefined,
          })
          await markGoogleModified(finalDuplicateCheck._id.toString(), googleCalendarId, googleLastModified)
          stats.googleToApp.updated++
          continue // Skip to next event
        }

        logger.info(`Creating new item in Keysha for Google Calendar event: "${googleEvent.summary || 'Untitled Event'}" (${googleCalendarId})`)
        // Skip if missing required date fields
        if (!googleEvent.start?.dateTime || !googleEvent.end?.dateTime) {
          logger.warn(`Skipping event ${googleCalendarId} - missing start or end date`)
          continue
        }
        const itemId = await createItemFromCalendar(jwtToken, req.user.userId, {
          googleCalendarId,
          title: googleEvent.summary || 'Untitled Event',
          description: googleEvent.description || undefined,
          location: googleEvent.location || undefined,
          startDate: googleEvent.start.dateTime,
          endDate: googleEvent.end.dateTime,
        })

        // Verify the item was created with googleCalendarId by querying item-service
        // Wait a moment for the item to be saved
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify via item-service API
        try {
          const verifyResponse = await axios.get(`${process.env.ITEM_SERVICE_URL || 'http://localhost:3002'}/items/${itemId}`, {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
            },
          })
          const createdItem = verifyResponse.data
          if (createdItem.googleCalendarId === googleCalendarId) {
            logger.info(`✅ Item created successfully with googleCalendarId: ${googleCalendarId}`)
          } else {
            logger.warn(`⚠️ Item created but googleCalendarId mismatch. Expected: ${googleCalendarId}, Got: ${createdItem.googleCalendarId}`)
            // Try to fix it by updating the item
            await axios.patch(`${process.env.ITEM_SERVICE_URL || 'http://localhost:3002'}/items/${itemId}`, {
              googleCalendarId,
            }, {
              headers: {
                Authorization: `Bearer ${jwtToken}`,
              },
            })
            logger.info(`Fixed googleCalendarId for item ${itemId}`)
          }
        } catch (verifyError) {
          logger.warn(`Could not verify item creation: ${verifyError}`)
        }

        await markGoogleModified(itemId, googleCalendarId, googleLastModified)
        stats.googleToApp.created++
        logger.info(`Created item from Google Calendar: ${googleCalendarId}`)
      }
    }

    // Step 2.5: Delete items that exist in app but not in Google Calendar
    // This handles deletions from Google Calendar
    const appItemsWithGoogleId = await Item.find({
      userId: new mongoose.Types.ObjectId(req.user.userId),
      type: { $in: ['event', 'reminder'] },
      googleCalendarId: { $exists: true, $ne: null },
      $or: [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { reminderTime: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      ],
    })

    for (const appItem of appItemsWithGoogleId) {
      if (appItem.googleCalendarId && !googleCalendarIds.has(appItem.googleCalendarId)) {
        // Item exists in app but not in Google Calendar - delete it
        logger.info(`Deleting item ${appItem._id} - no longer exists in Google Calendar`)
        await Item.findByIdAndDelete(appItem._id)
        // Also clean up sync state
        await SyncState.deleteOne({ itemId: appItem._id })
        stats.googleToApp.deleted = (stats.googleToApp.deleted || 0) + 1
      }
    }

    // Step 3: Sync App events and reminders → Google Calendar
    // IMPORTANT: Only sync items that DON'T have googleCalendarId yet
    // Items created in Step 2 already have googleCalendarId, so skip them
    const appEvents = await Item.find({
      userId: new mongoose.Types.ObjectId(req.user.userId),
      type: { $in: ['event', 'reminder'] },
      googleCalendarId: { $exists: false }, // Only items NOT yet synced to Google
      $or: [
        // Events with startDate/endDate in range
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Reminders with reminderTime in range
        { reminderTime: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      ],
    })
    
    logger.info(`Found ${appEvents.length} app events without googleCalendarId to sync`)

    for (const appEvent of appEvents) {
      // Handle events
      if (appEvent.type === 'event') {
        if (!appEvent.startDate || !appEvent.endDate) {
          continue
        }

        // Since we filtered for items WITHOUT googleCalendarId, check if it already exists in Google Calendar
        // This prevents creating duplicates when event was created in Google Calendar first
        logger.debug(`Checking if event "${appEvent.title}" already exists in Google Calendar`)
        
        const existingGoogleEventId = await findCalendarEventByTitleAndTime(
          accessToken,
          appEvent.title,
          appEvent.startDate,
          appEvent.endDate
        )

          if (existingGoogleEventId) {
            // Event already exists in Google Calendar - link it to the app item
            logger.info(`Found existing Google Calendar event ${existingGoogleEventId} for "${appEvent.title}" - linking instead of creating duplicate`)
            
            await Item.findByIdAndUpdate(appEvent._id, {
              googleCalendarId: existingGoogleEventId,
            })

            // Mark as synced (Google's version is the source of truth)
            const googleEvent = googleEventsMap.get(existingGoogleEventId)
            if (googleEvent && googleEvent.updated) {
              await markGoogleModified(
                appEvent._id.toString(),
                existingGoogleEventId,
                new Date(googleEvent.updated)
              )
            } else {
              // If not in map, fetch it to get updated time
              try {
                const { getCalendarEvent } = await import('../services/calendarService')
                const eventDetails = await getCalendarEvent(accessToken, existingGoogleEventId)
                if (eventDetails.updated) {
                  await markGoogleModified(
                    appEvent._id.toString(),
                    existingGoogleEventId,
                    new Date(eventDetails.updated)
                  )
                }
              } catch (err) {
                logger.warn(`Could not fetch event details for ${existingGoogleEventId}`)
              }
            }

            logger.debug(`Linked app event to existing Google Calendar event: ${existingGoogleEventId}`)
            stats.appToGoogle.updated++
          } else {
            // Event doesn't exist in Google Calendar - create it
            // Convert strings to Date objects and validate
            const startDate = appEvent.startDate instanceof Date 
              ? appEvent.startDate 
              : new Date(appEvent.startDate)
            const endDate = appEvent.endDate instanceof Date 
              ? appEvent.endDate 
              : new Date(appEvent.endDate)
            
            // Validate dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              logger.warn(`Skipping event "${appEvent.title}" - invalid dates: startDate=${appEvent.startDate}, endDate=${appEvent.endDate}`)
              continue
            }
            
            // Google Calendar requires endDate > startDate
            // Auto-fix: if dates are reversed, swap them (safety measure for data integrity issues)
            let finalStartDate = startDate
            let finalEndDate = endDate
            if (endDate <= startDate) {
              logger.warn(`Event "${appEvent.title}" has reversed dates (endDate <= startDate). Auto-correcting: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`)
              // Swap dates if they're reversed
              finalStartDate = endDate
              finalEndDate = startDate
              
              // If dates are equal, add 1 hour to endDate
              if (finalEndDate.getTime() === finalStartDate.getTime()) {
                finalEndDate = new Date(finalStartDate.getTime() + 60 * 60 * 1000) // Add 1 hour
                logger.info(`Event "${appEvent.title}" had equal dates, setting endDate to 1 hour after startDate`)
              }
            }
            
            logger.info(`Creating new Google Calendar event for "${appEvent.title}"`)
            const googleCalendarId = await createCalendarEvent(accessToken, {
              title: appEvent.title,
              description: appEvent.description,
              location: appEvent.location,
              startDate: finalStartDate,
              endDate: finalEndDate,
            })

            // Update item with googleCalendarId
            await Item.findByIdAndUpdate(appEvent._id, {
              googleCalendarId,
            })

            await markAppModified(appEvent._id.toString(), googleCalendarId)
            stats.appToGoogle.created++
            logger.debug(`Created Google Calendar event from app: ${googleCalendarId}`)
          }
      }
      // Handle reminders
      else if (appEvent.type === 'reminder' && appEvent.startDate) {
        // Convert startDate to endDate (15-minute duration)
        const reminderStartDate = appEvent.startDate instanceof Date 
          ? appEvent.startDate 
          : new Date(appEvent.startDate)
        
        if (isNaN(reminderStartDate.getTime())) {
          logger.warn(`Skipping reminder "${appEvent.title}" - invalid startDate: ${appEvent.startDate}`)
          continue
        }
        
        const startDate = reminderStartDate
        const endDate = new Date(startDate.getTime() + 15 * 60 * 1000) // 15 minutes later

        // Since we filtered for items WITHOUT googleCalendarId, check if it exists in Google Calendar
        const reminderTitle = `🔔 ${appEvent.title}`
          const existingGoogleEventId = await findCalendarEventByTitleAndTime(
            accessToken,
            reminderTitle,
            startDate,
            endDate
          )

        if (existingGoogleEventId) {
          // Reminder already exists in Google Calendar - link it to the app item
          await Item.findByIdAndUpdate(appEvent._id, {
            googleCalendarId: existingGoogleEventId,
          })

          // Mark as synced (Google's version is the source of truth)
          const googleEvent = googleEventsMap.get(existingGoogleEventId)
          if (googleEvent && googleEvent.updated) {
            await markGoogleModified(
              appEvent._id.toString(),
              existingGoogleEventId,
              new Date(googleEvent.updated)
            )
          }

          logger.debug(`Linked app reminder to existing Google Calendar event: ${existingGoogleEventId}`)
          stats.appToGoogle.updated++
        } else {
          // Reminder doesn't exist in Google Calendar - create it
          const googleCalendarId = await createCalendarEvent(accessToken, {
            title: reminderTitle,
            description: appEvent.description,
            location: appEvent.location,
            startDate,
            endDate,
          })

          // Update item with googleCalendarId
          await Item.findByIdAndUpdate(appEvent._id, {
            googleCalendarId,
          })

          await markAppModified(appEvent._id.toString(), googleCalendarId)
          stats.appToGoogle.created++
          logger.debug(`Created Google Calendar reminder from app: ${googleCalendarId}`)
        }
      }
    }

    logger.info(`Full sync completed: ${JSON.stringify(stats)}`)

    res.json({
      success: true,
      stats,
    })
  } catch (error) {
    logger.error('Error performing full sync:', error)
    next(error)
  }
})

export default router
