/**
 * AWS Lambda Handler for Auth Service
 * 
 * This file wraps the Express app to work with AWS Lambda + API Gateway.
 * 
 * Why serverless-http?
 * - Converts Express requests/responses to Lambda event/context format
 * - Handles API Gateway proxy integration automatically
 * - Reuses the same Express app instance across Lambda invocations (warm starts)
 * 
 * Lambda Cold Start vs Warm Start:
 * - Cold Start: First invocation after idle period (slower, ~1-3 seconds)
 * - Warm Start: Lambda container reused (fast, ~50-200ms)
 * 
 * Connection Pooling:
 * - MongoDB connection is cached in the Lambda container
 * - Reused across warm invocations (saves ~500ms per request)
 * - Only reconnects on cold starts
 */

import serverlessHttp from 'serverless-http'
import express, { Express } from 'express'
import cors from 'cors'
import { connectDatabase } from './config/database'
import { validateOAuthConfig } from './config/googleOAuth'
import { validateJWTConfig } from './config/jwt'
import { corsOptions } from './middleware/cors.middleware'
import { errorHandler } from './middleware/error.middleware'
import authRoutes from './routes/auth.routes'
import logger from './utils/logger'

// Create Express app (same as index.ts, but without server.listen)
const app: Express = express()

// Middleware Setup
app.use(cors(corsOptions))
app.use(express.json())

// Request Logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`)
  next()
})

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
  })
})

// API Routes
app.use('/auth', authRoutes)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
  })
})

// Error Handler (must be last)
app.use(errorHandler)

/**
 * Lambda Handler Function
 * 
 * This is the entry point for AWS Lambda.
 * API Gateway sends events here, and serverless-http converts them to Express requests.
 * 
 * Connection Initialization:
 * - On cold start: Connects to MongoDB (takes ~500ms)
 * - On warm start: Reuses existing connection (instant)
 * - Connection is cached in the Lambda container's memory
 */
let isInitialized = false

async function initialize() {
  if (isInitialized) {
    return
  }

  try {
    // Validate configuration
    logger.info('Validating configuration...')
    validateOAuthConfig()
    validateJWTConfig()

    // Connect to database (cached for warm starts)
    logger.info('Connecting to database...')
    await connectDatabase()

    isInitialized = true
    logger.info('✅ Auth Service initialized for Lambda')
  } catch (error) {
    logger.error('Failed to initialize:', error)
    // Don't throw - let Lambda retry on next invocation
    isInitialized = false
  }
}

// Wrap Express app with serverless-http
const serverlessHandler = serverlessHttp(app, {
  // Binary media types (for file uploads if needed later)
  binary: ['image/*', 'application/pdf'],
})

/**
 * Lambda Handler Export
 * 
 * This function is called by AWS Lambda for each API Gateway request.
 * 
 * Flow:
 * 1. API Gateway receives HTTP request
 * 2. Converts to Lambda event
 * 3. Calls this handler function
 * 4. serverless-http converts event to Express request
 * 5. Express processes request through middleware/routes
 * 6. Response converted back to Lambda format
 * 7. API Gateway returns HTTP response
 */
export const handler = async (event: any, context: any) => {
  // Initialize on first invocation (cold start)
  if (!isInitialized) {
    await initialize()
  }

  // Add context to request for logging (optional)
  context.callbackWaitsForEmptyEventLoop = false // Don't wait for event loop to empty (faster)

  // Process request through Express app
  return serverlessHandler(event, context)
}
