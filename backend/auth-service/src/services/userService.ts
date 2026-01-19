import User, { IUser } from '../models/User'
import { encryptRefreshToken, decryptRefreshToken } from '../utils/encryption'
import logger from '../utils/logger'

/**
 * User Service - User CRUD Operations
 * 
 * This service handles all database operations related to users.
 * It's like a "file clerk" that knows how to find, create, and update
 * user records in the database.
 */

export interface CreateUserData {
  googleId: string
  email: string
  name: string
  picture?: string
  refreshToken: string // Plain refresh token (will be encrypted)
}

export interface UpdateUserData {
  name?: string
  picture?: string
  refreshToken?: string
}

/**
 * Finds a user by Google ID
 * 
 * Why Google ID? It's unique and provided by Google, so we can
 * identify users even if they change their email.
 */
export async function findUserByGoogleId(googleId: string): Promise<IUser | null> {
  try {
    const user = await User.findOne({ googleId })
    return user
  } catch (error) {
    logger.error('Error finding user by Google ID:', error)
    throw error
  }
}

/**
 * Finds a user by email
 */
export async function findUserByEmail(email: string): Promise<IUser | null> {
  try {
    const user = await User.findOne({ email: email.toLowerCase() })
    return user
  } catch (error) {
    logger.error('Error finding user by email:', error)
    throw error
  }
}

/**
 * Creates a new user
 * 
 * Process:
 * 1. Encrypt refresh token before storing
 * 2. Create user document
 * 3. Save to database
 */
export async function createUser(data: CreateUserData): Promise<IUser> {
  try {
    // Encrypt refresh token before storing
    const encryptedToken = encryptRefreshToken(data.refreshToken)

    const user = new User({
      googleId: data.googleId,
      email: data.email.toLowerCase(),
      name: data.name,
      picture: data.picture,
      refreshToken: encryptedToken,
    })

    await user.save()
    logger.info(`Created new user: ${user.email}`)
    return user
  } catch (error) {
    logger.error('Error creating user:', error)
    throw error
  }
}

/**
 * Updates an existing user
 * 
 * Handles:
 * - Updating user info (name, picture)
 * - Updating refresh token (when it's rotated)
 */
export async function updateUser(
  userId: string,
  data: UpdateUserData
): Promise<IUser | null> {
  try {
    const updateData: any = {}

    if (data.name) updateData.name = data.name
    if (data.picture) updateData.picture = data.picture

    // Encrypt refresh token if provided
    if (data.refreshToken) {
      updateData.refreshToken = encryptRefreshToken(data.refreshToken)
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (user) {
      logger.debug(`Updated user: ${user.email}`)
    }

    return user
  } catch (error) {
    logger.error('Error updating user:', error)
    throw error
  }
}

/**
 * Gets a user's refresh token (decrypted)
 * 
 * This is used when we need to refresh Google access tokens.
 * We decrypt the stored token and use it to get new tokens.
 */
export async function getUserRefreshToken(userId: string): Promise<string | null> {
  try {
    // Use select to explicitly get refreshToken (normally excluded)
    const user = await User.findById(userId).select('+refreshToken')

    if (!user || !user.refreshToken) {
      return null
    }

    // Decrypt the token
    return decryptRefreshToken(user.refreshToken)
  } catch (error) {
    logger.error('Error getting user refresh token:', error)
    throw error
  }
}

/**
 * Invalidates a user's refresh token
 * 
 * Used during logout - we set refreshToken to empty string.
 * This prevents the token from being used again.
 */
export async function invalidateUserRefreshToken(userId: string): Promise<void> {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: { refreshToken: '' },
    })

    logger.info(`Invalidated refresh token for user: ${userId}`)
  } catch (error) {
    logger.error('Error invalidating refresh token:', error)
    throw error
  }
}
