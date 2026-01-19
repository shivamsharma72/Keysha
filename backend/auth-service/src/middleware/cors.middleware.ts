import cors from 'cors'

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
// Support multiple frontend URLs (local dev + Vercel production)
const allowedOrigins = [
  frontendUrl,
  process.env.VERCEL_FRONTEND_URL, // Vercel deployment URL
].filter(Boolean) // Remove undefined values

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // Allow configured frontend URLs
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    // In development, allow all origins (for testing)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    // In production, reject unknown origins
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-token'],
}
