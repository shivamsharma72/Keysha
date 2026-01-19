import mongoose from 'mongoose'
import logger from '../utils/logger'

/**
 * MongoDB Connection Setup
 * 
 * Why Mongoose? It's an ODM (Object Document Mapper) that:
 * 1. Provides schemas (structure for documents)
 * 2. Validates data before saving
 * 3. Provides easy query methods
 * 4. Handles connection pooling automatically
 * 
 * Connection pooling: Instead of opening/closing connections for each request,
 * Mongoose maintains a pool of connections and reuses them. Like a taxi service
 * that keeps cars ready instead of building new ones each time.
 */

let isConnected = false

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Database already connected')
    return
  }

  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  try {
    // Connect to MongoDB Atlas
    // Options explained:
    // - bufferCommands: false = fail fast if not connected (good for Lambda)
    // - serverSelectionTimeoutMS: 5000 = timeout after 5 seconds
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    isConnected = true
    logger.info('✅ Connected to MongoDB Atlas')

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
      isConnected = false
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
      isConnected = false
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed due to app termination')
      process.exit(0)
    })
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error)
    isConnected = false
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isConnected) {
    await mongoose.connection.close()
    isConnected = false
    logger.info('Disconnected from MongoDB')
  }
}
