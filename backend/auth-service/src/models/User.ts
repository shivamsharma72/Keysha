import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * User Model - MongoDB Schema
 * 
 * This defines the structure of user documents in MongoDB.
 * Think of it like a blueprint for a house - it specifies what
 * rooms (fields) exist and what they can contain.
 * 
 * Why store refresh token? It's long-lived and needed to get new
 * Google access tokens. We encrypt it before storing (see encryption.ts).
 */

export interface IUser extends Document {
  googleId: string // Google's unique user ID
  email: string
  name: string
  picture?: string // Profile picture URL
  refreshToken: string // Encrypted Google refresh token
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true, // No two users can have same Google ID
      index: true, // Create index for fast lookups
    },
    email: {
      type: String,
      required: true,
      lowercase: true, // Store emails in lowercase for consistency
      trim: true, // Remove whitespace
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    picture: {
      type: String,
      required: false,
    },
    refreshToken: {
      type: String,
      required: true,
      // Don't select by default (security - don't accidentally expose)
      select: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
)

// Create index on email for fast lookups
UserSchema.index({ email: 1 })

// Create User model
// Mongoose will create a "users" collection (pluralizes "User")
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema)

export default User
