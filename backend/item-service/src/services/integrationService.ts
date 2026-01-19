import axios from 'axios'
import logger from '../utils/logger'

/**
 * Integration Service Client
 * 
 * Communicates with integration-service to sync events with Google Calendar.
 * This is called when user creates/updates/deletes EVENT items.
 */

const INTEGRATION_SERVICE_URL = process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3003'

/**
 * Syncs an event to Google Calendar (create)
 */
export async function syncEventToCalendar(
  jwtToken: string,
  itemId: string,
  eventData: {
    title: string
    description?: string
    location?: string
    startDate: Date
    endDate: Date
  }
): Promise<string | null> {
  try {
    if (!jwtToken) {
      logger.warn('No JWT token provided for calendar sync')
      return null
    }
    
    const response = await axios.post(
      `${INTEGRATION_SERVICE_URL}/sync/calendar/create`,
      {
        itemId,
        ...eventData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    return response.data.googleCalendarId
  } catch (error) {
    logger.error('Error syncing event to calendar:', error)
    // Don't throw - if calendar sync fails, item should still be created
    return null
  }
}

/**
 * Syncs an event update to Google Calendar
 */
export async function syncEventUpdateToCalendar(
  jwtToken: string,
  itemId: string,
  googleCalendarId: string,
  eventData: {
    title?: string
    description?: string
    location?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<boolean> {
  try {
    await axios.post(
      `${INTEGRATION_SERVICE_URL}/sync/calendar/update`,
      {
        itemId,
        googleCalendarId,
        ...eventData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    return true
  } catch (error) {
    logger.error('Error syncing event update to calendar:', error)
    return false
  }
}

/**
 * Syncs an event deletion to Google Calendar
 */
export async function syncEventDeleteToCalendar(
  jwtToken: string,
  googleCalendarId: string
): Promise<boolean> {
  try {
    await axios.post(
      `${INTEGRATION_SERVICE_URL}/sync/calendar/delete`,
      {
        googleCalendarId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    return true
  } catch (error) {
    logger.error('Error syncing event delete to calendar:', error)
    return false
  }
}
