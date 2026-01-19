/**
 * Validates that all required OAuth environment variables are set
 */
export declare function validateOAuthConfig(): void;
/**
 * Gets the configured OAuth2 client
 */
export declare function getOAuth2Client(): import("google-auth-library").OAuth2Client;
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
export declare const GOOGLE_SCOPES: string[];
//# sourceMappingURL=googleOAuth.d.ts.map