import apiClient from './api'
import type { User } from '../types'

/**
 * Auth Service - Handles Authentication API Calls
 * 
 * This service is like a "concierge" that handles all authentication-related
 * communication with the backend. It doesn't manage state (that's the AuthContext's job),
 * it just makes the API calls and returns the data.
 * 
 * Separation of Concerns: Services = API calls, Context = State management
 */

const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001/auth'

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
  const response = await apiClient.post(`${AUTH_SERVICE_URL}/initiate`)
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
  const response = await apiClient.post(`${AUTH_SERVICE_URL}/callback`, {
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
  const response = await apiClient.post(`${AUTH_SERVICE_URL}/refresh`)
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
    await apiClient.post(`${AUTH_SERVICE_URL}/logout`)
  } finally {
    // Always clear local storage, even if API call fails
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }
}
