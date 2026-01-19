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
    authUrl: string;
    codeVerifier: string;
    codeChallenge: string;
}
export interface OAuthCallbackResult {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        picture?: string;
    };
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
export declare function initiateOAuth(): Promise<OAuthInitResult>;
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
export declare function handleOAuthCallback(code: string, codeVerifier: string): Promise<OAuthCallbackResult>;
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
export declare function refreshJWT(userId: string): Promise<OAuthCallbackResult>;
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
export declare function getGoogleAccessToken(userId: string): Promise<string>;
//# sourceMappingURL=oauthService.d.ts.map