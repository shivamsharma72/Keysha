import axios, { AxiosInstance } from 'axios'
import type { Item, CreateItemDto, UpdateItemDto } from '../types'

/**
 * Item Service - CRUD Operations for Actions, Reminders, Events
 * 
 * This service handles all operations related to productivity items.
 * It's like a "personal assistant" that knows how to talk to the backend
 * about your tasks, reminders, and calendar events.
 * 
 * Note: Uses a separate axios instance because item-service runs on a different
 * port (3002) than auth-service (3001).
 */

// Item service base URL - should NOT include /items (routes are mounted at /items in Express)
const ITEM_SERVICE_BASE_URL = import.meta.env.VITE_ITEM_SERVICE_URL || 'http://localhost:3002'

// Create separate axios instance for item-service
const itemApiClient: AxiosInstance = axios.create({
  baseURL: ITEM_SERVICE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Add auth token interceptor
itemApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Fetches all items for the authenticated user
 * 
 * The backend uses the JWT token (sent automatically via interceptor) to
 * identify which user's items to return. No need to pass userId explicitly!
 */
export const getItems = async (): Promise<Item[]> => {
  const response = await itemApiClient.get('/items')
  return response.data
}

/**
 * Fetches items for calendar view (date range)
 * 
 * Used for the calendar/dashboard view to show items within a date range.
 */
export const getItemsForCalendar = async (
  startDate: Date,
  endDate: Date
): Promise<Item[]> => {
  const response = await itemApiClient.get('/items/calendar', {
    params: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  })
  return response.data
}

/**
 * Fetches a single item by ID
 */
export const getItem = async (id: string): Promise<Item> => {
  const response = await itemApiClient.get(`/items/${id}`)
  return response.data
}

/**
 * Creates a new item
 * 
 * The backend automatically:
 * 1. Links it to the authenticated user (from JWT)
 * 2. Creates a corresponding Google Calendar event (if type is 'event')
 * 3. Returns the created item with Google Calendar ID
 */
export const createItem = async (data: CreateItemDto): Promise<Item> => {
  const response = await itemApiClient.post('/items', data)
  return response.data
}

/**
 * Toggles item completion status
 */
export const toggleComplete = async (
  id: string,
  completed: boolean
): Promise<Item> => {
  const response = await itemApiClient.post(`/items/${id}/complete`, {
    completed,
  })
  return response.data
}

/**
 * Syncs all events between Google Calendar and the app
 * 
 * Performs a full two-way sync:
 * - Fetches Google Calendar events and creates/updates items
 * - Creates/updates Google Calendar events for app items
 */
export const syncCalendar = async (
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean
  stats: {
    googleToApp: { created: number; updated: number }
    appToGoogle: { created: number; updated: number }
  }
}> => {
  const INTEGRATION_SERVICE_URL = import.meta.env.VITE_INTEGRATION_SERVICE_URL
  
  // Debug logging
  console.log('🔍 Sync Calendar Debug:', {
    INTEGRATION_SERVICE_URL,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  })
  
  if (!INTEGRATION_SERVICE_URL) {
    const error = new Error('VITE_INTEGRATION_SERVICE_URL is not configured. Please set it in your Vercel environment variables.')
    console.error('❌ Missing environment variable:', error.message)
    throw error
  }
  
  // Use axios directly since integration-service is on a different port
  const token = localStorage.getItem('auth_token')
  
  if (!token) {
    throw new Error('Not authenticated. Please log in again.')
  }
  
  console.log('📤 Sending sync request to:', `${INTEGRATION_SERVICE_URL}/sync/full`)
  
  try {
    const response = await axios.post(
      `${INTEGRATION_SERVICE_URL}/sync/full`,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 60000, // 60 seconds timeout for sync operations
      }
    )
    
    console.log('✅ Sync response:', response.data)
    return response.data
  } catch (error: any) {
    console.error('❌ Sync error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    })
    throw error
  }
}

/**
 * Updates an item and syncs with Google Calendar
 * 
 * This is the "two-way sync" magic: When you update an item, the backend:
 * 1. Updates MongoDB
 * 2. Immediately calls Google Calendar API to update the event
 * 
 * Why PATCH not PUT? PATCH = partial update (only send changed fields),
 * PUT = full replacement (must send all fields). PATCH is more efficient.
 */
export const updateItem = async (id: string, data: UpdateItemDto): Promise<Item> => {
  const response = await itemApiClient.patch(`/items/${id}`, data)
  return response.data
}

/**
 * Deletes an item
 * 
 * The backend will also delete the corresponding Google Calendar event
 * if one exists.
 */
export const deleteItem = async (id: string): Promise<void> => {
  await itemApiClient.delete(`/items/${id}`)
}
