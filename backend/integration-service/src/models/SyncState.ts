import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Sync State Model
 * 
 * Prevents infinite loops in two-way sync.
 * Stores the lastModified timestamp from Google Calendar for each event.
 * 
 * How it works:
 * - When we update Google Calendar, we store the timestamp
 * - When webhook arrives, we check if Google's timestamp is newer
 * - If same or older, ignore (we already have this change)
 * - If newer, update our database
 */
export interface ISyncState extends Document {
  itemId: mongoose.Types.ObjectId // Reference to Item
  googleCalendarId: string // Google Calendar event ID
  lastGoogleModified: Date // Last time Google modified this event
  lastAppModified: Date // Last time our app modified this event
  syncing: boolean // Flag to prevent concurrent syncs
  createdAt: Date
  updatedAt: Date
}

const SyncStateSchema: Schema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
      ref: 'Item',
    },
    googleCalendarId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastGoogleModified: {
      type: Date,
      required: true,
    },
    lastAppModified: {
      type: Date,
      required: true,
    },
    syncing: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

const SyncState: Model<ISyncState> = mongoose.model<ISyncState>('SyncState', SyncStateSchema)

export default SyncState
