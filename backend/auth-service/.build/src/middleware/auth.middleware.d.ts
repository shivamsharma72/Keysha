import { Request, Response, NextFunction } from 'express';
/**
 * Authentication Middleware
 *
 * Middleware is like a "security checkpoint" that runs before your route handlers.
 * It checks if the user is authenticated before allowing them to proceed.
 *
 * How it works:
 * 1. Extract JWT from Authorization header
 * 2. Verify token signature and expiration
 * 3. Attach user info to request object
 * 4. Call next() to continue to route handler
 *
 * If token is invalid, it stops the request and returns 401.
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}
/**
 * Verifies JWT token and attaches user to request
 *
 * Use this for protected routes that require authentication
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional authentication - doesn't fail if token is missing/invalid
 *
 * Use this for routes that work with or without authentication
 * (e.g., public endpoints that show more data if authenticated)
 */
export declare function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void;
/**
 * Decodes token even if expired (for refresh endpoint)
 *
 * When refreshing, we want to get userId from expired token
 * but still verify it was signed by us.
 */
export declare function decodeExpiredToken(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.middleware.d.ts.map