import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Item Model - MongoDB Schema
 * 
 * Unified schema for Actions, Reminders, and Events.
 * Uses a discriminated union pattern - the 'type' field determines
 * which additional fields are relevant.
 */

export type ItemType = 'action' | 'reminder' | 'event'
export type ExecutionMode = 'Focus' | 'Flow' | 'Admin'
export type Priority = 'One' | 'Two' | 'Three'
export type Category = 'Work' | 'Personal' | 'Health'

export interface IItem extends Document {
  userId: mongoose.Types.ObjectId
  type: ItemType
  
  // Common fields
  title: string
  description?: string
  location?: string
  subtasks?: string[]
  executionMode: ExecutionMode
  priority: Priority
  category: Category
  completed: boolean
  
  // Type-specific fields (only one set populated based on type)
  // ACTION fields
  duration?: number // minutes
  dueDate?: Date
  
  // REMINDER fields
  reminderTime?: Date
  
  // EVENT fields
  startDate?: Date
  endDate?: Date
  googleCalendarId?: string
  
  createdAt: Date
  updatedAt: Date
}

const ItemSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true, // Index for fast user queries
      ref: 'User',
    },
    type: {
      type: String,
      required: true,
      enum: ['action', 'reminder', 'event'],
      index: true,
    },
    
    // Common fields
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    subtasks: {
      type: [String],
      default: [],
    },
    executionMode: {
      type: String,
      enum: ['Focus', 'Flow', 'Admin'],
      default: 'Flow',
    },
    priority: {
      type: String,
      enum: ['One', 'Two', 'Three'],
      default: 'Two',
    },
    category: {
      type: String,
      enum: ['Work', 'Personal', 'Health'],
      default: 'Personal',
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Type-specific fields
    duration: Number, // ACTION: minutes
    dueDate: Date,    // ACTION: optional due date
    
    reminderTime: Date, // REMINDER: when to remind
    
    startDate: Date,    // EVENT: start time
    endDate: Date,      // EVENT: end time
    googleCalendarId: String, // EVENT: Google Calendar sync ID
  },
  {
    timestamps: true,
  }
)

// Compound indexes for common queries
ItemSchema.index({ userId: 1, type: 1 })
ItemSchema.index({ userId: 1, completed: 1 })
ItemSchema.index({ userId: 1, startDate: 1 }) // For calendar view
ItemSchema.index({ userId: 1, dueDate: 1 })     // For actions
ItemSchema.index({ userId: 1, reminderTime: 1 }) // For reminders

const Item: Model<IItem> = mongoose.model<IItem>('Item', ItemSchema)

export default Item
