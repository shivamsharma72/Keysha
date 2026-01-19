import Item, { IItem, ItemType } from '../models/Item'
import mongoose from 'mongoose'
import logger from '../utils/logger'

/**
 * Item Service - Business Logic for Items
 * 
 * Handles all database operations for Actions, Reminders, and Events.
 */

export interface CreateItemDto {
  type: ItemType
  title: string
  description?: string
  location?: string
  subtasks?: string[]
  executionMode?: 'Focus' | 'Flow' | 'Admin'
  priority?: 'One' | 'Two' | 'Three'
  category?: 'Work' | 'Personal' | 'Health'
  
  // Type-specific fields
  duration?: number // ACTION
  dueDate?: Date    // ACTION
  reminderTime?: Date // REMINDER
  startDate?: Date   // EVENT
  endDate?: Date     // EVENT
}

export interface UpdateItemDto {
  title?: string
  description?: string
  location?: string
  subtasks?: string[]
  executionMode?: 'Focus' | 'Flow' | 'Admin'
  priority?: 'One' | 'Two' | 'Three'
  category?: 'Work' | 'Personal' | 'Health'
  completed?: boolean
  
  // Type-specific fields
  duration?: number
  dueDate?: Date
  reminderTime?: Date
  startDate?: Date
  endDate?: Date
}

/**
 * Gets all items for a user
 */
export async function getItems(userId: string): Promise<IItem[]> {
  try {
    const items = await Item.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
    
    return items
  } catch (error) {
    logger.error('Error getting items:', error)
    throw error
  }
}

/**
 * Gets items for calendar view (date range)
 */
export async function getItemsForCalendar(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<IItem[]> {
  try {
    const items = await Item.find({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        // Events with startDate in range
        { type: 'event', startDate: { $gte: startDate, $lte: endDate } },
        // Actions with dueDate in range
        { type: 'action', dueDate: { $gte: startDate, $lte: endDate } },
        // Reminders with reminderTime in range
        { type: 'reminder', reminderTime: { $gte: startDate, $lte: endDate } },
      ],
    }).sort({ startDate: 1, dueDate: 1, reminderTime: 1 })
    
    return items
  } catch (error) {
    logger.error('Error getting calendar items:', error)
    throw error
  }
}

/**
 * Gets a single item by ID
 */
export async function getItemById(
  itemId: string,
  userId: string
): Promise<IItem | null> {
  try {
    const item = await Item.findOne({
      _id: itemId,
      userId: new mongoose.Types.ObjectId(userId),
    })
    
    return item
  } catch (error) {
    logger.error('Error getting item:', error)
    throw error
  }
}

/**
 * Creates a new item
 */
export async function createItem(
  userId: string,
  data: CreateItemDto
): Promise<IItem> {
  try {
    const item = new Item({
      userId: new mongoose.Types.ObjectId(userId),
      ...data,
    })
    
    await item.save()
    logger.info(`Created ${data.type}: ${item.title}`)
    return item
  } catch (error) {
    logger.error('Error creating item:', error)
    throw error
  }
}

/**
 * Updates an item
 */
export async function updateItem(
  itemId: string,
  userId: string,
  data: UpdateItemDto
): Promise<IItem | null> {
  try {
    const item = await Item.findOneAndUpdate(
      {
        _id: itemId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: data },
      { new: true, runValidators: true }
    )
    
    if (item) {
      logger.info(`Updated item: ${item.title}`)
    }
    
    return item
  } catch (error) {
    logger.error('Error updating item:', error)
    throw error
  }
}

/**
 * Deletes an item
 */
export async function deleteItem(
  itemId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await Item.findOneAndDelete({
      _id: itemId,
      userId: new mongoose.Types.ObjectId(userId),
    })
    
    if (result) {
      logger.info(`Deleted item: ${result.title}`)
      return true
    }
    
    return false
  } catch (error) {
    logger.error('Error deleting item:', error)
    throw error
  }
}

/**
 * Marks an item as complete/incomplete
 */
export async function toggleComplete(
  itemId: string,
  userId: string,
  completed: boolean
): Promise<IItem | null> {
  try {
    const item = await Item.findOneAndUpdate(
      {
        _id: itemId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: { completed } },
      { new: true }
    )
    
    if (item) {
      logger.info(`Marked item as ${completed ? 'complete' : 'incomplete'}: ${item.title}`)
    }
    
    return item
  } catch (error) {
    logger.error('Error toggling complete:', error)
    throw error
  }
}
