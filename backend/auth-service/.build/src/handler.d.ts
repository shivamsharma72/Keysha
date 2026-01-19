/**
 * AWS Lambda Handler for Auth Service
 *
 * This file wraps the Express app to work with AWS Lambda + API Gateway.
 *
 * Why serverless-http?
 * - Converts Express requests/responses to Lambda event/context format
 * - Handles API Gateway proxy integration automatically
 * - Reuses the same Express app instance across Lambda invocations (warm starts)
 *
 * Lambda Cold Start vs Warm Start:
 * - Cold Start: First invocation after idle period (slower, ~1-3 seconds)
 * - Warm Start: Lambda container reused (fast, ~50-200ms)
 *
 * Connection Pooling:
 * - MongoDB connection is cached in the Lambda container
 * - Reused across warm invocations (saves ~500ms per request)
 * - Only reconnects on cold starts
 */
/**
 * Lambda Handler Export
 *
 * This function is called by AWS Lambda for each API Gateway request.
 *
 * Flow:
 * 1. API Gateway receives HTTP request
 * 2. Converts to Lambda event
 * 3. Calls this handler function
 * 4. serverless-http converts event to Express request
 * 5. Express processes request through middleware/routes
 * 6. Response converted back to Lambda format
 * 7. API Gateway returns HTTP response
 */
export declare const handler: (event: any, context: any) => Promise<Object>;
//# sourceMappingURL=handler.d.ts.map