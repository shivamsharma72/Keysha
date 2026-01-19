import axios from 'axios'
import type { User } from '../types'

/**
 * Auth Service - Handles Authentication API Calls
 * 
 * This service is like a "concierge" that handles all authentication-related
 * communication with the backend. It doesn't manage state (that's the AuthContext's job),
 * it just makes the API calls and returns the data.
 * 
 * Separation of Concerns: Services = API calls, Context = State management
 * 
 * IMPORTANT: Uses its own axios instance because auth service runs on a different URL
 * than other services (could be AWS Lambda, different port, etc.)
 */

// Get auth service URL from environment (should be AWS Lambda URL in production)
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001/auth'

// Debug: Log the auth service URL (remove in production)
if (import.meta.env.DEV) {
  console.log('🔐 Auth Service URL:', AUTH_SERVICE_URL)
  console.log('🔐 VITE_AUTH_SERVICE_URL env var:', import.meta.env.VITE_AUTH_SERVICE_URL)
}

// Create dedicated axios instance for auth service (separate from apiClient)
const authApiClient = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for OAuth flows
})

// Add error interceptor for better error messages
authApiClient.interceptors.response.use(
  (response) => response,
  (error: any) => {
    // Enhanced error message for network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      error.message = `Cannot connect to auth service at ${AUTH_SERVICE_URL}. Please check your configuration.`
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. The auth service may be slow or unavailable.'
    } else if (!error.response) {
      error.message = `Network error: Unable to reach ${AUTH_SERVICE_URL}. Please check your connection.`
    }
    return Promise.reject(error)
  }
)

// Add auth token interceptor (for refresh/logout calls)
authApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export interface LoginResponse {
  token: string
  user: User
}

export interface OAuthInitResponse {
  authUrl: string
  codeVerifier: string
}

/**
 * Initiates OAuth Flow
 * 
 * This is Step 1 of OAuth: We ask our backend to generate an authorization URL.
 * The backend creates a "code verifier" (PKCE) and sends us the URL to redirect to.
 * 
 * PKCE (Proof Key for Code Exchange) = Like a secret handshake that proves
 * we're the same app that started the login process.
 */
export const initiateOAuth = async (): Promise<OAuthInitResponse> => {
  const response = await authApiClient.post('/initiate')
  return response.data
}

/**
 * Exchanges OAuth Code for Token
 * 
 * This is Step 2: After Google redirects back with a "code", we send it to our
 * backend along with the code verifier. The backend exchanges it with Google
 * for an access token and refresh token, then gives us a JWT.
 * 
 * Why not get the token directly from Google? Security! Our backend stores
 * the refresh token securely, and we only get a short-lived JWT for the frontend.
 */
export const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string
): Promise<LoginResponse> => {
  const response = await authApiClient.post('/callback', {
    code,
    codeVerifier,
  })
  return response.data
}

/**
 * Refreshes the JWT Token
 * 
 * JWTs expire for security. Instead of making the user log in again, we use
 * the refresh token (stored securely on the backend) to get a new JWT.
 * 
 * Think of it like a hotel key card: JWT = room key (expires), Refresh = your ID
 * (proves you can get a new key).
 */
export const refreshToken = async (): Promise<LoginResponse> => {
  const response = await authApiClient.post('/refresh')
  return response.data
}

/**
 * Logs out the user
 * 
 * This tells the backend to invalidate the refresh token, then clears
 * local storage. It's like checking out of the hotel - you return your key
 * and they deactivate it.
 */
export const logout = async (): Promise<void> => {
  try {
    await authApiClient.post('/logout')
  } finally {
    // Always clear local storage, even if API call fails
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }
}
