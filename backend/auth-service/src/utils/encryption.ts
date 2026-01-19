import crypto from 'crypto'

/**
 * Encryption Utility for Refresh Tokens
 * 
 * Why encrypt refresh tokens? They're long-lived credentials that can
 * be used to impersonate a user. If someone steals our database, encrypted
 * tokens are useless without the encryption key.
 * 
 * Think of it like a safe: even if someone breaks into your house (database),
 * they can't open the safe (decrypt tokens) without the combination (key).
 * 
 * Note: In production, consider using AWS KMS or similar for key management.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 64 // 64 bytes for key derivation
const TAG_LENGTH = 16 // 16 bytes for authentication tag

/**
 * Encrypts a refresh token
 * 
 * Process:
 * 1. Generate random IV (initialization vector) - makes same plaintext produce different ciphertext
 * 2. Derive encryption key from master key + salt
 * 3. Encrypt token using AES-256-GCM (authenticated encryption)
 * 4. Return: salt + iv + tag + ciphertext (all base64 encoded)
 */
export function encryptRefreshToken(token: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY
  
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // Derive key from master key + salt (PBKDF2 with 100k iterations)
  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256')

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt
  let encrypted = cipher.update(token, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // Get authentication tag (proves data wasn't tampered)
  const tag = cipher.getAuthTag()

  // Combine: salt + iv + tag + encrypted data
  const combined = Buffer.concat([salt, iv, tag, encrypted])

  // Return as base64 string
  return combined.toString('base64')
}

/**
 * Decrypts a refresh token
 * 
 * Reverse process:
 * 1. Decode base64
 * 2. Extract salt, IV, tag, and ciphertext
 * 3. Derive same key using salt
 * 4. Decrypt and verify tag
 */
export function decryptRefreshToken(encryptedToken: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured')
  }

  // Decode base64
  const combined = Buffer.from(encryptedToken, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  )
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  // Derive same key
  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256')

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  // Decrypt
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}
