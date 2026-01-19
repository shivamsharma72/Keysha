import { google } from 'googleapis'
import logger from '../utils/logger'

/**
 * Calendar Service - Google Calendar API Operations
 * 
 * Handles all direct communication with Google Calendar API.
 * This is the "translator" that speaks Google-ese.
 */

/**
 * Creates a Google Calendar event
 * 
 * Called when user creates an EVENT in your app.
 * Creates the same event in their Google Calendar.
 */
export async function createCalendarEvent(
  accessToken: string,
  eventData: {
    title: string
    description?: string
    location?: string
    startDate: Date
    endDate: Date
  }
): Promise<string> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.endDate.toISOString(),
        timeZone: 'UTC',
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    const eventId = response.data.id
    if (!eventId) {
      throw new Error('Failed to get event ID from Google')
    }

    logger.info(`Created Google Calendar event: ${eventId}`)
    return eventId
  } catch (error) {
    logger.error('Error creating calendar event:', error)
    throw error
  }
}

/**
 * Updates a Google Calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  googleCalendarId: string,
  eventData: {
    title?: string
    description?: string
    location?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<void> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // First get the existing event
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: googleCalendarId,
    })

    // Merge updates
    const updatedEvent = {
      ...existingEvent.data,
      summary: eventData.title || existingEvent.data.summary,
      description: eventData.description !== undefined ? eventData.description : existingEvent.data.description,
      location: eventData.location !== undefined ? eventData.location : existingEvent.data.location,
      start: eventData.startDate
        ? {
            dateTime: eventData.startDate.toISOString(),
            timeZone: 'UTC',
          }
        : existingEvent.data.start,
      end: eventData.endDate
        ? {
            dateTime: eventData.endDate.toISOString(),
            timeZone: 'UTC',
          }
        : existingEvent.data.end,
    }

    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleCalendarId,
      requestBody: updatedEvent,
    })

    logger.info(`Updated Google Calendar event: ${googleCalendarId}`)
  } catch (error) {
    logger.error('Error updating calendar event:', error)
    throw error
  }
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  googleCalendarId: string
): Promise<void> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleCalendarId,
    })

    logger.info(`Deleted Google Calendar event: ${googleCalendarId}`)
  } catch (error) {
    logger.error('Error deleting calendar event:', error)
    throw error
  }
}

/**
 * Gets a Google Calendar event by ID
 * 
 * Used when webhook arrives - we fetch full event details.
 */
export async function getCalendarEvent(
  accessToken: string,
  googleCalendarId: string
): Promise<{
  id: string
  summary: string
  description?: string
  location?: string
  start?: { dateTime?: string }
  end?: { dateTime?: string }
  updated?: string
}> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId: googleCalendarId,
    })

    return {
      id: response.data.id || '',
      summary: response.data.summary || '',
      description: response.data.description,
      location: response.data.location,
      start: response.data.start,
      end: response.data.end,
      updated: response.data.updated,
    }
  } catch (error) {
    logger.error('Error getting calendar event:', error)
    throw error
  }
}

/**
 * Subscribes to Google Calendar changes (webhook)
 * 
 * This tells Google: "Notify me at this URL when this calendar changes"
 * Google returns a channelId and expiration date.
 */
export async function subscribeToCalendar(
  accessToken: string,
  webhookUrl: string
): Promise<{
  channelId: string
  resourceId: string
  expiration: Date
}> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Create watch request
    const watchResponse = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: `channel-${Date.now()}`, // Unique channel ID
        type: 'web_hook',
        address: webhookUrl, // Your webhook URL (ngrok URL)
      },
    })

    const channelId = watchResponse.data.id
    const resourceId = watchResponse.data.resourceId
    const expiration = watchResponse.data.expiration
      ? new Date(parseInt(watchResponse.data.expiration))
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days

    if (!channelId || !resourceId) {
      throw new Error('Failed to get channel ID or resource ID from Google')
    }

    logger.info(`Subscribed to Google Calendar: channelId=${channelId}, resourceId=${resourceId}`)

    return {
      channelId,
      resourceId,
      expiration,
    }
  } catch (error) {
    logger.error('Error subscribing to calendar:', error)
    throw error
  }
}

/**
 * Unsubscribes from Google Calendar changes
 */
export async function unsubscribeFromCalendar(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    })

    logger.info(`Unsubscribed from Google Calendar: channelId=${channelId}`)
  } catch (error) {
    logger.error('Error unsubscribing from calendar:', error)
    throw error
  }
}

/**
 * Finds a Google Calendar event by title and time (within 5 minutes).
 * Used to prevent creating duplicates when syncing App → Google Calendar.
 */
export async function findCalendarEventByTitleAndTime(
  accessToken: string,
  title: string,
  startDate: Date,
  endDate: Date
): Promise<string | null> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Search for events around the same time (±30 minutes to catch events created recently)
    // Also search a wider range to catch events that might have been created
    const timeMin = new Date(startDate.getTime() - 30 * 60 * 1000).toISOString()
    const timeMax = new Date(startDate.getTime() + 30 * 60 * 1000).toISOString()

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100, // Increased to catch more events
    })

    const events = response.data.items || []
    
    // Find event with matching title (exact match or without emoji prefix for reminders)
    // Also check if times are close (±5 minutes)
    const matchingEvent = events.find((event) => {
      if (!event.summary || !event.start?.dateTime) return false
      
      const eventTitle = event.summary.trim()
      const searchTitle = title.trim()
      
      // Check title match
      let titleMatches = false
      if (eventTitle === searchTitle) {
        titleMatches = true
      } else if (eventTitle.startsWith('🔔 ')) {
        // Match for reminders (remove emoji prefix)
        const eventTitleWithoutEmoji = eventTitle.substring(2).trim()
        if (eventTitleWithoutEmoji === searchTitle) {
          titleMatches = true
        }
      }
      
      if (!titleMatches) return false
      
      // Check if times are close (±5 minutes)
      const eventStart = new Date(event.start.dateTime)
      const timeDiff = Math.abs(eventStart.getTime() - startDate.getTime())
      return timeDiff <= 5 * 60 * 1000 // 5 minutes
    })

    if (matchingEvent?.id) {
      logger.debug(`Found matching Google Calendar event: ${matchingEvent.id} for title "${title}"`)
    }

    return matchingEvent?.id || null
  } catch (error) {
    logger.error('Error finding calendar event by title and time:', error)
    return null
  }
}
