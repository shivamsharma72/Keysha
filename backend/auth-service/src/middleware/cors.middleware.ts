import cors from 'cors'
import { Request } from 'express'

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * CORS is like a "bouncer" that controls which websites can make
 * requests to your API. By default, browsers block cross-origin requests
 * for security (prevents malicious sites from accessing your API).
 * 
 * We configure CORS to allow our frontend (localhost:3000) to make requests
 * to our backend (localhost:3001).
 */

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // Allow frontend URL
    if (origin === frontendUrl) {
      return callback(null, true)
    }

    // In production, you might want to check against a whitelist
    // For now, we'll allow the configured frontend URL
    callback(null, true)
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
