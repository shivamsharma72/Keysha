import { getOAuth2Client, GOOGLE_SCOPES } from '../config/googleOAuth'
import {
  generateCodeVerifier,
  generateCodeChallenge,
} from '../utils/pkce'
import {
  findUserByGoogleId,
  createUser,
  updateUser,
  getUserRefreshToken,
} from './userService'
import { generateToken } from './jwtService'
import logger from '../utils/logger'

/**
 * OAuth Service - Handles Google OAuth 2.0 Flow
 * 
 * This service orchestrates the entire OAuth dance:
 * 1. Initiates OAuth (generates PKCE, creates URL)
 * 2. Exchanges code for tokens
 * 3. Gets user info from Google
 * 4. Creates/updates user in database
 * 5. Issues JWT to frontend
 * 
 * Think of it as the "concierge" that handles the entire check-in process.
 */

export interface OAuthInitResult {
  authUrl: string
  codeVerifier: string
  codeChallenge: string
}

export interface OAuthCallbackResult {
  token: string // JWT
  user: {
    id: string
    email: string
    name: string
    picture?: string
  }
}

/**
 * Initiates OAuth Flow - Step 1
 * 
 * This is called when user clicks "Sign in with Google"
 * 
 * Process:
 * 1. Generate PKCE code verifier (random secret)
 * 2. Generate code challenge (hash of verifier)
 * 3. Build Google OAuth URL with all parameters
 * 4. Return URL + verifier to frontend
 * 
 * The frontend will redirect to the URL, and we'll need the verifier
 * later to complete the flow.
 */
export async function initiateOAuth(): Promise<OAuthInitResult> {
  try {
    const oauth2Client = getOAuth2Client()

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Generate Google OAuth authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: GOOGLE_SCOPES,
      prompt: 'consent', // Force consent screen (ensures refresh token)
      code_challenge: codeChallenge,
      // @ts-ignore - Type definition issue with googleapis, 'S256' is valid
      code_challenge_method: 'S256', // SHA256
    })

    logger.info('Generated OAuth authorization URL')

    // Return URL and verifier
    // Note: We return verifier to frontend, but in production you might
    // want to store it server-side (Redis) and return a session ID instead
    return {
      authUrl,
      codeVerifier,
      codeChallenge,
    }
  } catch (error) {
    logger.error('Error initiating OAuth:', error)
    throw new Error('Failed to initiate OAuth flow')
  }
}

/**
 * Handles OAuth Callback - Step 2
 * 
 * This is called after Google redirects back with authorization code
 * 
 * Process:
 * 1. Verify code verifier matches challenge
 * 2. Exchange authorization code with Google for tokens
 * 3. Get user info from Google using access token
 * 4. Create or update user in database
 * 5. Generate JWT for frontend
 * 
 * This is the "check-in" moment - user is authenticated, now we issue
 * them a "room key" (JWT) to access the app.
 */
export async function handleOAuthCallback(
  code: string,
  codeVerifier: string
): Promise<OAuthCallbackResult> {
  try {
    const oauth2Client = getOAuth2Client()

    // Step 1: Exchange authorization code for tokens
    // This is where we use the code verifier - Google verifies it matches
    // the challenge we sent earlier
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier,
    })

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens from Google')
    }

    logger.info('Successfully exchanged code for tokens')

    // Step 2: Set credentials on OAuth client
    oauth2Client.setCredentials(tokens)

    // Step 3: Get user info from Google
    const { google } = await import('googleapis')
    const oauth2 = google.oauth2('v2')
    const userInfoResponse = await oauth2.userinfo.get({
      auth: oauth2Client,
    })

    const googleUser = userInfoResponse.data

    if (!googleUser.id || !googleUser.email) {
      throw new Error('Invalid user data from Google')
    }

    logger.info(`Retrieved user info for: ${googleUser.email}`)

    // Step 4: Create or update user in database
    let user = await findUserByGoogleId(googleUser.id)

    if (user) {
      // User exists - update refresh token (in case it was rotated)
      user = await updateUser(user._id.toString(), {
        name: googleUser.name || user.name,
        picture: googleUser.picture || user.picture,
        refreshToken: tokens.refresh_token,
      })
    } else {
      // New user - create account
      user = await createUser({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name || 'User',
        picture: googleUser.picture || undefined,
        refreshToken: tokens.refresh_token,
      })
    }

    if (!user) {
      throw new Error('Failed to create/update user')
    }

    // Step 5: Generate JWT for frontend
    const jwtToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
    })

    logger.info(`Generated JWT for user: ${user.email}`)

    return {
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    }
  } catch (error) {
    logger.error('Error handling OAuth callback:', error)
    throw error
  }
}

/**
 * Refreshes JWT Token
 * 
 * When JWT expires, frontend calls this to get a new one.
 * 
 * Process:
 * 1. Decode expired JWT to get userId
 * 2. Get user's refresh token from database
 * 3. Use refresh token to get new Google access token
 * 4. Generate new JWT
 * 
 * Why refresh Google token? In case we need to call Google APIs,
 * we want a fresh access token. But mostly we just need a new JWT.
 */
export async function refreshJWT(userId: string): Promise<OAuthCallbackResult> {
  try {
    // Get user's refresh token
    const refreshToken = await getUserRefreshToken(userId)

    if (!refreshToken) {
      throw new Error('No refresh token found for user')
    }

    // Use refresh token to get new Google access token
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google access token')
    }

    // Get user from database
    const User = (await import('../models/User')).default
    const user = await User.findById(userId)

    if (!user) {
      throw new Error('User not found')
    }

    // Generate new JWT
    const jwtToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
    })

    logger.info(`Refreshed JWT for user: ${user.email}`)

    return {
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    }
  } catch (error) {
    logger.error('Error refreshing JWT:', error)
    throw error
  }
}

/**
 * Gets Google access token for a user
 * 
 * Used by integration-service to make Google Calendar API calls.
 * 
 * Process:
 * 1. Get user's refresh token from database
 * 2. Use refresh token to get new Google access token
 * 3. Return access token
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  try {
    // Get user's refresh token
    const refreshToken = await getUserRefreshToken(userId)

    if (!refreshToken) {
      throw new Error('No refresh token found for user')
    }

    // Use refresh token to get new Google access token
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google access token')
    }

    logger.debug(`Got Google access token for user: ${userId}`)

    return credentials.access_token
  } catch (error) {
    logger.error('Error getting Google access token:', error)
    throw error
  }
}
