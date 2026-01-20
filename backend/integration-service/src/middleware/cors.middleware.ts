import cors from 'cors'

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
const vercelFrontendUrl = process.env.VERCEL_FRONTEND_URL

// Support multiple frontend URLs (local dev + Vercel production)
const allowedOrigins = [
  frontendUrl,
  vercelFrontendUrl,
].filter(Boolean) // Remove undefined values

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // Allow configured frontend URLs
    if (allowedOrigins.includes(origin) || origin.includes('ngrok')) {
      return callback(null, true)
    }

    // In development, allow all origins (for testing)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    // In production, reject unknown origins
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-token'],
}
