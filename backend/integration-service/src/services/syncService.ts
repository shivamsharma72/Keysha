import SyncState from '../models/SyncState'
import CalendarSubscription from '../models/CalendarSubscription'
import mongoose from 'mongoose'
import logger from '../utils/logger'

/**
 * Sync Service - Manages Sync State and Prevents Infinite Loops
 * 
 * This is the "traffic controller" that prevents infinite sync loops.
 * It tracks who changed what and when, so we don't sync changes we already know about.
 */

/**
 * Records that our app modified an event
 * 
 * Called BEFORE we update Google Calendar.
 * This marks the event as "we changed this" so we can ignore
 * the webhook that Google will send back.
 */
export async function markAppModified(
  itemId: string,
  googleCalendarId: string
): Promise<void> {
  try {
    // Check if another SyncState exists with this itemId but different googleCalendarId
    const conflictingState = await SyncState.findOne({ 
      itemId: new mongoose.Types.ObjectId(itemId),
      googleCalendarId: { $ne: googleCalendarId } // Different googleCalendarId
    })
    
    // If there's a conflict, delete the old record first
    if (conflictingState) {
      await SyncState.deleteOne({ _id: conflictingState._id })
      logger.debug(`Removed conflicting SyncState for itemId=${itemId}`)
    }
    
    // Query by googleCalendarId first (it's unique), then update itemId if needed
    await SyncState.findOneAndUpdate(
      { googleCalendarId },
      {
        $set: {
          itemId: new mongoose.Types.ObjectId(itemId),
          googleCalendarId,
          lastAppModified: new Date(),
          syncing: true, // Set flag to prevent concurrent syncs
        },
      },
      { upsert: true, new: true }
    )

    logger.debug(`Marked app modified: itemId=${itemId}, googleCalendarId=${googleCalendarId}`)
  } catch (error) {
    logger.error('Error marking app modified:', error)
    throw error
  }
}

/**
 * Checks if we should process a webhook (prevents infinite loop)
 * 
 * Returns true if Google's change is newer than our last change.
 * Returns false if we already have this change (ignore webhook).
 */
export async function shouldProcessWebhook(
  googleCalendarId: string,
  googleLastModified: Date
): Promise<boolean> {
  try {
    const syncState = await SyncState.findOne({ googleCalendarId })

    if (!syncState) {
      // First time seeing this event - process it
      return true
    }

    // If Google's timestamp is newer than our last app modification, process it
    // If same or older, ignore (we already have this change)
    const shouldProcess = googleLastModified > syncState.lastAppModified

    if (!shouldProcess) {
      logger.debug(
        `Ignoring webhook - Google change is not newer. Google: ${googleLastModified}, App: ${syncState.lastAppModified}`
      )
    }

    return shouldProcess
  } catch (error) {
    logger.error('Error checking sync state:', error)
    // On error, process the webhook to be safe
    return true
  }
}

/**
 * Records that Google modified an event
 * 
 * Called AFTER we process a webhook and update our database.
 * This marks the event as "Google changed this" so we know we're in sync.
 */
export async function markGoogleModified(
  itemId: string,
  googleCalendarId: string,
  googleLastModified: Date
): Promise<void> {
  try {
    // Query by googleCalendarId since it's the unique index
    const existingState = await SyncState.findOne({ googleCalendarId })
    
    // Check if another SyncState exists with this itemId (to avoid duplicate key error)
    const conflictingState = await SyncState.findOne({ 
      itemId: new mongoose.Types.ObjectId(itemId),
      googleCalendarId: { $ne: googleCalendarId } // Different googleCalendarId
    })
    
    // If there's a conflict, delete the old record first
    if (conflictingState) {
      await SyncState.deleteOne({ _id: conflictingState._id })
      logger.debug(`Removed conflicting SyncState for itemId=${itemId}`)
    }
    
    await SyncState.findOneAndUpdate(
      { googleCalendarId }, // Query by googleCalendarId (unique index)
      {
        $set: {
          itemId: new mongoose.Types.ObjectId(itemId),
          googleCalendarId,
          lastGoogleModified: googleLastModified,
          lastAppModified: existingState?.lastAppModified || new Date(),
          syncing: false, // Clear sync flag
        },
      },
      { upsert: true, new: true }
    )

    logger.debug(`Marked Google modified: itemId=${itemId}, googleCalendarId=${googleCalendarId}`)
  } catch (error) {
    logger.error('Error marking Google modified:', error)
    throw error
  }
}

/**
 * Gets userId from resourceId
 * 
 * When webhook arrives, Google only gives us resourceId.
 * We look up which user this belongs to.
 */
export async function getUserIdFromResourceId(resourceId: string): Promise<string | null> {
  try {
    const subscription = await CalendarSubscription.findOne({ resourceId })

    if (!subscription) {
      logger.warn(`No subscription found for resourceId: ${resourceId}`)
      return null
    }

    return subscription.userId.toString()
  } catch (error) {
    logger.error('Error getting userId from resourceId:', error)
    return null
  }
}

/**
 * Stores a calendar subscription
 */
export async function storeSubscription(
  userId: string,
  resourceId: string,
  channelId: string,
  expiration: Date
): Promise<void> {
  try {
    await CalendarSubscription.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          resourceId,
          channelId,
          expiration,
        },
      },
      { upsert: true, new: true }
    )

    logger.info(`Stored subscription: userId=${userId}, resourceId=${resourceId}`)
  } catch (error) {
    logger.error('Error storing subscription:', error)
    throw error
  }
}

/**
 * Gets expired subscriptions (need renewal)
 */
export async function getExpiredSubscriptions(): Promise<
  Array<{
    userId: string
    resourceId: string
    channelId: string
  }>
> {
  try {
    const expired = await CalendarSubscription.find({
      expiration: { $lt: new Date() },
    })

    return expired.map((sub) => ({
      userId: sub.userId.toString(),
      resourceId: sub.resourceId,
      channelId: sub.channelId,
    }))
  } catch (error) {
    logger.error('Error getting expired subscriptions:', error)
    return []
  }
}

/**
 * Full Sync - Syncs all events between Google Calendar and App
 * 
 * This performs a two-way sync:
 * 1. Fetches all Google Calendar events
 * 2. Creates/updates items in app for Google events
 * 3. Creates/updates Google Calendar events for app items
 */
export async function performFullSync(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  googleToApp: { created: number; updated: number }
  appToGoogle: { created: number; updated: number }
}> {
  const stats = {
    googleToApp: { created: 0, updated: 0 },
    appToGoogle: { created: 0, updated: 0 },
  }

  logger.info(`Starting full sync for user ${userId} from ${startDate} to ${endDate}`)

  // This will be called from the sync route with access token
  // The actual implementation will fetch Google events and compare with app items

  return stats
}
