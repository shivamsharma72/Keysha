// ============================================
// CRITICAL: Load environment variables FIRST
// ============================================
import 'dotenv/config'

import express, { Express } from 'express'
import cors from 'cors'
import { connectDatabase } from './config/database'
import { corsOptions } from './middleware/cors.middleware'
import { errorHandler } from './middleware/error.middleware'
import webhooksRoutes from './routes/webhooks.routes'
import syncRoutes from './routes/sync.routes'
import subscriptionsRoutes from './routes/subscriptions.routes'
import logger from './utils/logger'

/**
 * Integration Service - Main Entry Point
 * 
 * Handles two-way sync between Keysha app and Google Calendar.
 * - Outbound: App → Google Calendar (via /sync endpoints)
 * - Inbound: Google Calendar → App (via /webhooks endpoints)
 */

const app: Express = express()
const PORT = process.env.PORT || 3003

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'integration-service',
    timestamp: new Date().toISOString(),
  })
})

// API routes
app.use('/webhooks', webhooksRoutes)
app.use('/sync', syncRoutes)
app.use('/subscriptions', subscriptionsRoutes)

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
      logger.info(`🚀 Integration Service running on port ${PORT}`)
      logger.info(`📍 Health check: http://localhost:${PORT}/health`)
      logger.info(`📍 Webhooks: http://localhost:${PORT}/webhooks/google/calendar`)
      logger.info(`📍 Sync endpoints: http://localhost:${PORT}/sync/*`)
      logger.info(`📍 Subscriptions: http://localhost:${PORT}/subscriptions/*`)
      logger.info(`\n⚠️  For webhooks to work, expose this service with ngrok:`)
      logger.info(`   ngrok http ${PORT}`)
      logger.info(`   Then set WEBHOOK_BASE_URL in .env to the ngrok URL`)
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
