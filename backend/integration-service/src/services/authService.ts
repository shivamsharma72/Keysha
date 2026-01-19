import axios from 'axios'
import logger from '../utils/logger'

/**
 * Auth Service Client
 * 
 * Communicates with auth-service to get user's Google OAuth tokens.
 * Think of this as asking the "front desk" (auth-service) for the user's
 * Google credentials so we can talk to Google Calendar on their behalf.
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001'

/**
 * Gets user's Google access token from auth-service
 * 
 * This is called when we need to make Google Calendar API calls.
 * The auth-service stores the refresh token securely and can provide
 * us with a fresh access token.
 * 
 * @param userId - The user ID
 * @param jwtToken - The JWT token from the request (needed to authenticate with auth-service)
 *                   OR a SERVICE_TOKEN for service-to-service calls (e.g., webhooks)
 */
export async function getGoogleAccessToken(userId: string, jwtToken: string): Promise<string> {
  try {
    const SERVICE_TOKEN = process.env.SERVICE_TOKEN
    
    // Determine which auth method to use
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // If jwtToken is the SERVICE_TOKEN, use service-to-service auth
    if (SERVICE_TOKEN && jwtToken === SERVICE_TOKEN) {
      headers['x-service-token'] = SERVICE_TOKEN
    } else {
      // Otherwise, use JWT Bearer token
      if (!jwtToken) {
        throw new Error('JWT token or SERVICE_TOKEN is required')
      }
      headers['Authorization'] = `Bearer ${jwtToken}`
    }
    
    const response = await axios.get(`${AUTH_SERVICE_URL}/auth/tokens/${userId}`, {
      headers,
    })

    return response.data.accessToken
  } catch (error) {
    logger.error('Failed to get Google access token:', error)
    throw new Error('Failed to get Google access token')
  }
}
