import { google } from 'googleapis'
import Item, { IItem } from '../models/Item'
import logger from '../utils/logger'

/**
 * Calendar Service - Google Calendar Integration
 * 
 * Handles syncing Events with Google Calendar.
 * Note: This requires the user's Google OAuth tokens from auth-service.
 * For MVP, we'll implement the structure but full integration requires
 * fetching tokens from auth-service or a shared token store.
 */

/**
 * Creates a Google Calendar event for an Item
 * 
 * TODO: This requires fetching the user's Google OAuth tokens.
 * In production, tokens would be stored in auth-service and fetched here.
 */
export async function createCalendarEvent(
  item: IItem,
  accessToken: string
): Promise<string | null> {
  try {
    if (item.type !== 'event' || !item.startDate || !item.endDate) {
      return null
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: item.title,
      description: item.description || '',
      location: item.location || '',
      start: {
        dateTime: item.startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: item.endDate.toISOString(),
        timeZone: 'UTC',
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    logger.info(`Created Google Calendar event: ${response.data.id}`)
    return response.data.id || null
  } catch (error) {
    logger.error('Error creating calendar event:', error)
    return null
  }
}

/**
 * Updates a Google Calendar event
 */
export async function updateCalendarEvent(
  item: IItem,
  accessToken: string
): Promise<boolean> {
  try {
    if (item.type !== 'event' || !item.googleCalendarId || !item.startDate || !item.endDate) {
      return false
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const event = {
      summary: item.title,
      description: item.description || '',
      location: item.location || '',
      start: {
        dateTime: item.startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: item.endDate.toISOString(),
        timeZone: 'UTC',
      },
    }

    await calendar.events.update({
      calendarId: 'primary',
      eventId: item.googleCalendarId,
      requestBody: event,
    })

    logger.info(`Updated Google Calendar event: ${item.googleCalendarId}`)
    return true
  } catch (error) {
    logger.error('Error updating calendar event:', error)
    return false
  }
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteCalendarEvent(
  googleCalendarId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleCalendarId,
    })

    logger.info(`Deleted Google Calendar event: ${googleCalendarId}`)
    return true
  } catch (error) {
    logger.error('Error deleting calendar event:', error)
    return false
  }
}
