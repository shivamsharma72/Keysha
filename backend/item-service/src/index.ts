// ============================================
// CRITICAL: Load environment variables FIRST
// ============================================
import 'dotenv/config'

import express, { Express } from 'express'
import cors from 'cors'
import { connectDatabase } from './config/database'
import { corsOptions } from './middleware/cors.middleware'
import { errorHandler } from './middleware/error.middleware'
import itemsRoutes from './routes/items.routes'
import logger from './utils/logger'

/**
 * Item Service - Main Entry Point
 * 
 * Handles CRUD operations for Actions, Reminders, and Events.
 * Independent service, deployable to Lambda separately from auth-service.
 */

const app: Express = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'item-service',
    timestamp: new Date().toISOString(),
  })
})

// API routes
app.use('/items', itemsRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
  })
})

// Error handler
app.use(errorHandler)

// Server startup
async function startServer() {
  try {
    logger.info('Connecting to database...')
    await connectDatabase()

    app.listen(PORT, () => {
      logger.info(`🚀 Item Service running on port ${PORT}`)
      logger.info(`📍 Health check: http://localhost:${PORT}/health`)
      logger.info(`📍 Items endpoints: http://localhost:${PORT}/items/*`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
  process.exit(1)
})

startServer()
