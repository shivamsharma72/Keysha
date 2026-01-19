// ============================================
// CRITICAL: Load environment variables FIRST
// ============================================
// Using 'dotenv/config' imports and immediately loads .env file
// This MUST be the very first import - it executes immediately
import 'dotenv/config'

// Now import everything else
import express, { Express } from 'express'
import cors from 'cors'
import { connectDatabase } from './config/database'
import { validateOAuthConfig } from './config/googleOAuth'
import { validateJWTConfig } from './config/jwt'
import { corsOptions } from './middleware/cors.middleware'
import { errorHandler } from './middleware/error.middleware'
import authRoutes from './routes/auth.routes'
import logger from './utils/logger'

/**
 * Auth Service - Main Entry Point
 * 
 * This is where everything comes together. Think of it as the "main stage"
 * where all the actors (routes, middleware, services) perform.
 * 
 * Express.js is our web framework - it handles HTTP requests and responses.
 * It's like a restaurant: routes are the menu, middleware are the waiters,
 * and services are the kitchen.
 */

const app: Express = express()
const PORT = process.env.PORT || 3001

/**
 * Middleware Setup
 * 
 * Middleware runs in order, so we set it up before routes.
 * Think of it like an assembly line - each middleware processes
 * the request before it reaches the route handler.
 */

// CORS - Allow frontend to make requests
app.use(cors(corsOptions))

// Body Parser - Parse JSON request bodies
app.use(express.json())

// Request Logging (optional - for debugging)
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`)
  next()
})

/**
 * Health Check Endpoint
 * 
 * Useful for:
 * - Load balancers to check if service is alive
 * - Monitoring tools
 * - Quick verification that server is running
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  })
})

/**
 * API Routes
 * 
 * All authentication endpoints are under /auth
 */
app.use('/auth', authRoutes)

/**
 * 404 Handler
 * 
 * Catches any requests to routes that don't exist
 */
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
  })
})

/**
 * Error Handler
 * 
 * Must be last middleware - catches all errors from routes
 */
app.use(errorHandler)

/**
 * Server Startup
 * 
 * This is where we:
 * 1. Validate configuration
 * 2. Connect to database
 * 3. Start listening for requests
 */
async function startServer() {
  try {
    // Validate configuration
    logger.info('Validating configuration...')
    validateOAuthConfig()
    validateJWTConfig()

    // Connect to database
    logger.info('Connecting to database...')
    await connectDatabase()

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Auth Service running on port ${PORT}`)
      logger.info(`📍 Health check: http://localhost:${PORT}/health`)
      logger.info(`📍 Auth endpoints: http://localhost:${PORT}/auth/*`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
  process.exit(1)
})

// Start the server
startServer()
