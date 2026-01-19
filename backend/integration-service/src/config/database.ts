import mongoose from 'mongoose'
import logger from '../utils/logger'

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
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    isConnected = true
    logger.info('✅ Connected to MongoDB Atlas')

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
      isConnected = false
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
      isConnected = false
    })

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
