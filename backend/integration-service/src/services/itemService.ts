import axios from 'axios'
import logger from '../utils/logger'

/**
 * Item Service Client
 * 
 * Communicates with item-service to update items when webhooks arrive.
 * When Google Calendar changes, we update the corresponding item in MongoDB.
 */

const ITEM_SERVICE_URL = process.env.ITEM_SERVICE_URL || 'http://localhost:3002'

/**
 * Updates an item in item-service
 * 
 * Called when webhook detects a change in Google Calendar.
 * We update the item in MongoDB to reflect the Google Calendar change.
 */
export async function updateItemFromCalendar(
  jwtToken: string,
  itemId: string,
  updates: {
    title?: string
    description?: string
    location?: string
    startDate?: string
    endDate?: string
  }
): Promise<void> {
  try {
    await axios.patch(
      `${ITEM_SERVICE_URL}/items/${itemId}`,
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    logger.info(`Updated item ${itemId} from Google Calendar`)
  } catch (error) {
    logger.error('Failed to update item from calendar:', error)
    throw error
  }
}

/**
 * Creates an item in item-service from Google Calendar event
 * 
 * Called when webhook detects a new event in Google Calendar
 * that doesn't exist in our app yet.
 */
export async function createItemFromCalendar(
  jwtToken: string,
  userId: string,
  eventData: {
    googleCalendarId: string
    title: string
    description?: string
    location?: string
    startDate: string
    endDate: string
  }
): Promise<string> {
  try {
    const response = await axios.post(
      `${ITEM_SERVICE_URL}/items`,
      {
        type: 'event',
        ...eventData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    logger.info(`Created item from Google Calendar event: ${eventData.googleCalendarId}`)
    return response.data._id
  } catch (error) {
    logger.error('Failed to create item from calendar:', error)
    throw error
  }
}

/**
 * Deletes an item in item-service
 * 
 * Called when webhook detects deletion in Google Calendar.
 */
export async function deleteItemFromCalendar(itemId: string): Promise<void> {
  try {
    await axios.delete(`${ITEM_SERVICE_URL}/items/${itemId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    logger.info(`Deleted item ${itemId} from Google Calendar`)
  } catch (error) {
    logger.error('Failed to delete item from calendar:', error)
    throw error
  }
}
