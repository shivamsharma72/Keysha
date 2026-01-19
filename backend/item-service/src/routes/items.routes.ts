import { Router, Request, Response } from 'express'
import { z } from 'zod'
import {
  getItems,
  getItemsForCalendar,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleComplete,
} from '../services/itemService'
import {
  syncEventToCalendar,
  syncEventUpdateToCalendar,
  syncEventDeleteToCalendar,
} from '../services/integrationService'
import { authenticate } from '../middleware/auth.middleware'
import { createError } from '../middleware/error.middleware'
import logger from '../utils/logger'

const router = Router()

// Validation schemas
const createItemSchema = z.object({
  type: z.enum(['action', 'reminder', 'event']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  subtasks: z.array(z.string()).optional(),
  executionMode: z.enum(['Focus', 'Flow', 'Admin']).optional(),
  priority: z.enum(['One', 'Two', 'Three']).optional(),
  category: z.enum(['Work', 'Personal', 'Health']).optional(),
  duration: z.number().optional(),
  // Accept ISO string, transform to Date object
  dueDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    try {
      return new Date(val)
    } catch {
      return undefined
    }
  }),
  reminderTime: z.string().optional().transform((val) => {
    if (!val) return undefined
    try {
      return new Date(val)
    } catch {
      return undefined
    }
  }),
  startDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    try {
      return new Date(val)
    } catch {
      return undefined
    }
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    try {
      return new Date(val)
    } catch {
      return undefined
    }
  }),
  googleCalendarId: z.string().optional(), // Allow this for inbound syncs from Google Calendar
})

const updateItemSchema = createItemSchema.partial().extend({
  completed: z.boolean().optional(),
})

/**
 * GET /items
 * Get all items for the authenticated user
 */
router.get('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const items = await getItems(req.user.userId)
    res.json(items)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /items/calendar
 * Get items for calendar view (date range)
 * Query params: start, end (ISO date strings)
 */
router.get('/calendar', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const startDate = req.query.start ? new Date(req.query.start as string) : new Date()
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: 30 days

    const items = await getItemsForCalendar(req.user.userId, startDate, endDate)
    res.json(items)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /items/:id
 * Get a single item by ID
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const item = await getItemById(req.params.id, req.user.userId)

    if (!item) {
      throw createError('Item not found', 404)
    }

    res.json(item)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /items
 * Create a new item
 */
router.post('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    logger.debug('Creating item with data:', req.body)

    const validationResult = createItemSchema.safeParse(req.body)

    if (!validationResult.success) {
      logger.error('Validation error:', validationResult.error.errors)
      throw createError(
        `Invalid request data: ${validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      )
    }

    logger.debug('Validation passed, creating item...')

    const item = await createItem(req.user.userId, validationResult.data)

    // If type is 'event', sync to Google Calendar
    if (item.type === 'event' && item.startDate && item.endDate) {
      try {
        const authHeader = req.headers.authorization
        const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

        const googleCalendarId = await syncEventToCalendar(jwtToken, item._id.toString(), {
          title: item.title,
          description: item.description,
          location: item.location,
          startDate: item.startDate,
          endDate: item.endDate,
        })

        if (googleCalendarId) {
          // Update item with googleCalendarId
          await updateItem(item._id.toString(), req.user.userId, {
            googleCalendarId,
          } as any)
          item.googleCalendarId = googleCalendarId
          logger.info(`Synced event to Google Calendar: ${googleCalendarId}`)
        }
      } catch (error) {
        logger.error('Failed to sync event to calendar (non-fatal):', error)
        // Don't fail the request - item is created even if calendar sync fails
      }
    }

    // If type is 'reminder', sync to Google Calendar as an event
    // Convert reminderTime to startDate/endDate (15-minute duration)
    if (item.type === 'reminder' && item.reminderTime) {
      try {
        const authHeader = req.headers.authorization
        const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

        const startDate = new Date(item.reminderTime)
        const endDate = new Date(startDate.getTime() + 15 * 60 * 1000) // 15 minutes later

        const googleCalendarId = await syncEventToCalendar(jwtToken, item._id.toString(), {
          title: `🔔 ${item.title}`, // Add reminder emoji prefix
          description: item.description,
          location: item.location,
          startDate,
          endDate,
        })

        if (googleCalendarId) {
          // Update item with googleCalendarId
          await updateItem(item._id.toString(), req.user.userId, {
            googleCalendarId,
          } as any)
          item.googleCalendarId = googleCalendarId
          logger.info(`Synced reminder to Google Calendar: ${googleCalendarId}`)
        }
      } catch (error) {
        logger.error('Failed to sync reminder to calendar (non-fatal):', error)
        // Don't fail the request - item is created even if calendar sync fails
      }
    }

    logger.info(`Item created successfully: ${item._id}`)
    res.status(201).json(item)
  } catch (error) {
    logger.error('Error creating item:', error)
    next(error)
  }
})

/**
 * PATCH /items/:id
 * Update an item
 */
router.patch('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const validationResult = updateItemSchema.safeParse(req.body)

    if (!validationResult.success) {
      logger.error('Validation error:', validationResult.error.errors)
      throw createError(
        `Invalid request data: ${validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      )
    }

    const item = await updateItem(req.params.id, req.user.userId, validationResult.data)

    if (!item) {
      throw createError('Item not found', 404)
    }

    // If type is 'event' and has googleCalendarId, sync update to Google Calendar
    if (item.type === 'event' && item.googleCalendarId) {
      try {
        const authHeader = req.headers.authorization
        const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

        await syncEventUpdateToCalendar(jwtToken, item._id.toString(), item.googleCalendarId, {
          title: validationResult.data.title,
          description: validationResult.data.description,
          location: validationResult.data.location,
          startDate: validationResult.data.startDate,
          endDate: validationResult.data.endDate,
        })

        logger.info(`Synced event update to Google Calendar: ${item.googleCalendarId}`)
      } catch (error) {
        logger.error('Failed to sync event update to calendar (non-fatal):', error)
        // Don't fail the request - item is updated even if calendar sync fails
      }
    }

    // If type is 'reminder' and has googleCalendarId, sync update to Google Calendar
    if (item.type === 'reminder' && item.googleCalendarId && item.reminderTime) {
      try {
        const authHeader = req.headers.authorization
        const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

        const startDate = validationResult.data.reminderTime 
          ? new Date(validationResult.data.reminderTime)
          : new Date(item.reminderTime)
        const endDate = new Date(startDate.getTime() + 15 * 60 * 1000) // 15 minutes later

        await syncEventUpdateToCalendar(jwtToken, item._id.toString(), item.googleCalendarId, {
          title: `🔔 ${validationResult.data.title || item.title}`,
          description: validationResult.data.description !== undefined ? validationResult.data.description : item.description,
          location: validationResult.data.location !== undefined ? validationResult.data.location : item.location,
          startDate,
          endDate,
        })
        logger.info(`Synced reminder update to Google Calendar: ${item.googleCalendarId}`)
      } catch (error) {
        logger.error('Failed to sync reminder update to calendar (non-fatal):', error)
        // Don't fail the request - item is updated even if calendar sync fails
      }
    }

    res.json(item)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /items/:id
 * Delete an item
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const item = await getItemById(req.params.id, req.user.userId)

    if (!item) {
      throw createError('Item not found', 404)
    }

    // If type is 'event' and has googleCalendarId, sync deletion to Google Calendar
    if (item.type === 'event' && item.googleCalendarId) {
      try {
        const authHeader = req.headers.authorization
        const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : ''

        await syncEventDeleteToCalendar(jwtToken, item.googleCalendarId)

        logger.info(`Synced event deletion to Google Calendar: ${item.googleCalendarId}`)
      } catch (error) {
        logger.error('Failed to sync event deletion to calendar (non-fatal):', error)
        // Don't fail the request - item is deleted even if calendar sync fails
      }
    }

    const deleted = await deleteItem(req.params.id, req.user.userId)

    if (!deleted) {
      throw createError('Failed to delete item', 500)
    }

    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /items/:id/complete
 * Toggle item completion status
 */
router.post('/:id/complete', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw createError('User not found', 401)
    }

    const { completed } = req.body

    if (typeof completed !== 'boolean') {
      throw createError('completed must be a boolean', 400)
    }

    const item = await toggleComplete(req.params.id, req.user.userId, completed)

    if (!item) {
      throw createError('Item not found', 404)
    }

    res.json(item)
  } catch (error) {
    next(error)
  }
})

export default router
