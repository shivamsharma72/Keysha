import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Calendar Subscription Model
 * 
 * Stores Google Calendar webhook subscriptions.
 * Maps resourceId (from Google) to userId (our app).
 * 
 * Why needed? When Google sends a webhook, it only gives us resourceId.
 * We need to look up which user this belongs to.
 */
export interface ICalendarSubscription extends Document {
  userId: mongoose.Types.ObjectId
  resourceId: string // Google's calendar resource ID
  channelId: string // Google's channel ID (subscription ID)
  expiration: Date // When subscription expires (Google webhooks expire)
  calendarId: string // Usually 'primary'
  createdAt: Date
  updatedAt: Date
}

const CalendarSubscriptionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: 'User',
    },
    resourceId: {
      type: String,
      required: true,
      unique: true, // One subscription per resource
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
    },
    expiration: {
      type: Date,
      required: true,
      index: true, // For finding expired subscriptions
    },
    calendarId: {
      type: String,
      default: 'primary',
    },
  },
  {
    timestamps: true,
  }
)

const CalendarSubscription: Model<ICalendarSubscription> = mongoose.model<ICalendarSubscription>(
  'CalendarSubscription',
  CalendarSubscriptionSchema
)

export default CalendarSubscription
