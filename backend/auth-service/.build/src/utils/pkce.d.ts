/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * PKCE is like a "secret handshake" that proves you're the same app
 * that started the OAuth flow. Here's how it works:
 *
 * 1. Generate a random "code verifier" (secret only you know)
 * 2. Hash it to create a "code challenge" (safe to send publicly)
 * 3. Send challenge to Google when initiating OAuth
 * 4. When Google redirects back, send the original verifier
 * 5. Google hashes your verifier and checks it matches the challenge
 *
 * Why this matters? Prevents "authorization code interception" attacks.
 * Even if someone steals the code from the redirect URL, they can't
 * exchange it for tokens without the code verifier.
 */
/**
 * Generates a cryptographically secure random code verifier
 *
 * RFC 7636 requires:
 * - Length: 43-128 characters
 * - Characters: A-Z, a-z, 0-9, -, ., _, ~
 *
 * We generate 43 characters (minimum secure length)
 */
export declare function generateCodeVerifier(): string;
/**
 * Generates code challenge from code verifier
 *
 * Uses SHA256 hash (as required by PKCE spec)
 * Then base64url encodes the hash
 *
 * This is what we send to Google - it's safe because:
 * - It's a one-way hash (can't reverse to get verifier)
 * - Google will verify it matches when we send the verifier later
 */
export declare function generateCodeChallenge(verifier: string): string;
/**
 * Validates that a code verifier matches a code challenge
 *
 * This is what Google does internally, but we verify it too
 * to ensure the frontend sent the correct verifier.
 */
export declare function verifyCodeChallenge(verifier: string, challenge: string): boolean;
//# sourceMappingURL=pkce.d.ts.map