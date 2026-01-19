import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Item Model Reference
 * 
 * This is a reference to the Item model from item-service.
 * We need this to query items by googleCalendarId when webhooks arrive.
 * 
 * Note: In a microservices architecture, you might use a shared models package
 * or duplicate the schema. For simplicity, we duplicate the key fields we need.
 */

export interface IItem extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: 'action' | 'reminder' | 'event'
  title: string
  description?: string
  location?: string
  googleCalendarId?: string
  startDate?: Date
  endDate?: Date
}

// Create schema with only fields we need for webhook processing
const ItemSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['action', 'reminder', 'event'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    location: String,
    googleCalendarId: {
      type: String,
      index: true, // Important for webhook lookups
    },
    startDate: Date,
    endDate: Date,
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Only create model if it doesn't exist (might be created by item-service)
const Item: Model<IItem> = mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema)

export default Item
