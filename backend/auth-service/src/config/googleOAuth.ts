import { google } from 'googleapis'
import logger from '../utils/logger'

/**
 * Google OAuth 2.0 Client Configuration
 * 
 * This sets up the Google OAuth client using the `googleapis` library.
 * Think of it as configuring a "passport" that allows our app to
 * authenticate users with Google.
 * 
 * The OAuth2Client handles:
 * - Generating authorization URLs
 * - Exchanging codes for tokens
 * - Refreshing access tokens
 * - Managing token lifecycle
 */

// Create OAuth2Client - but we'll recreate it if env vars change
// This ensures we always use the latest redirect URI
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth configuration')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

// Create singleton instance
let oauth2Client = createOAuth2Client()

/**
 * Validates that all required OAuth environment variables are set
 */
export function validateOAuthConfig(): void {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required OAuth environment variables: ${missing.join(', ')}`
    )
  }

  logger.info('✅ Google OAuth configuration validated')
}

/**
 * Gets the configured OAuth2 client
 * 
 * Recreates the client if environment variables have changed
 * (important for Lambda where env vars might be updated)
 */
export function getOAuth2Client() {
  // Recreate client to ensure we have latest redirect URI
  // This is important because Lambda containers can persist across deployments
  oauth2Client = createOAuth2Client()
  return oauth2Client
}

/**
 * Google OAuth Scopes (CASA Compliant - Least Privilege)
 * 
 * We only request the minimum scopes needed:
 * - email, profile: Basic user info
 * - calendar: Read/write calendar events
 * - gmail.readonly: Read emails (for AI features)
 * 
 * Why not request more? Security principle: "Least Privilege"
 * Only ask for what you need, nothing more.
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
]
