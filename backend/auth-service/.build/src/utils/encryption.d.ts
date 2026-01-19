/**
 * Encrypts a refresh token
 *
 * Process:
 * 1. Generate random IV (initialization vector) - makes same plaintext produce different ciphertext
 * 2. Derive encryption key from master key + salt
 * 3. Encrypt token using AES-256-GCM (authenticated encryption)
 * 4. Return: salt + iv + tag + ciphertext (all base64 encoded)
 */
export declare function encryptRefreshToken(token: string): string;
/**
 * Decrypts a refresh token
 *
 * Reverse process:
 * 1. Decode base64
 * 2. Extract salt, IV, tag, and ciphertext
 * 3. Derive same key using salt
 * 4. Decrypt and verify tag
 */
export declare function decryptRefreshToken(encryptedToken: string): string;
//# sourceMappingURL=encryption.d.ts.map