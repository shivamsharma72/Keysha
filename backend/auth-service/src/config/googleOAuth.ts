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

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

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
 */
export function getOAuth2Client() {
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
