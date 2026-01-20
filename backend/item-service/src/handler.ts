/**
 * AWS Lambda Handler for Item Service
 * 
 * Wraps the Express app to work with AWS Lambda + API Gateway.
 * Similar to auth-service handler.
 */

import 'dotenv/config'
import serverlessHttp from 'serverless-http'
import express, { Express } from 'express'
import cors from 'cors'
import { connectDatabase } from './config/database'
import { corsOptions } from './middleware/cors.middleware'
import { errorHandler } from './middleware/error.middleware'
import itemsRoutes from './routes/items.routes'
import logger from './utils/logger'

// Create Express app
const app: Express = express()

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
    service: 'item-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
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

// Lambda initialization
let isInitialized = false

async function initialize() {
  if (isInitialized) {
    return
  }

  try {
    logger.info('Connecting to database...')
    await connectDatabase()
    isInitialized = true
    logger.info('✅ Item Service initialized for Lambda')
  } catch (error) {
    logger.error('Failed to initialize:', error)
    isInitialized = false
  }
}

// Wrap Express app with serverless-http
const serverlessHandler = serverlessHttp(app, {
  binary: ['image/*', 'application/pdf'],
})

// Lambda handler export
export const handler = async (event: any, context: any) => {
  if (!isInitialized) {
    await initialize()
  }

  context.callbackWaitsForEmptyEventLoop = false
  return serverlessHandler(event, context)
}
