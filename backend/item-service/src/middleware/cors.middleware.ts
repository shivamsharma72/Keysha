import cors from 'cors'

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true)
    }

    if (origin === frontendUrl) {
      return callback(null, true)
    }

    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
