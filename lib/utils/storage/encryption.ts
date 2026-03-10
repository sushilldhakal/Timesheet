import crypto from "crypto"

/**
 * Simple encryption/decryption utilities for storing sensitive data
 * Uses AES-256-GCM encryption
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

// Get encryption key from environment or generate a default
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || "timesheet-encryption-key-2024"
  return crypto.scryptSync(key, "salt", KEY_LENGTH)
}

/**
 * Encrypt a string value
 * Returns base64 encoded string with format: salt:iv:tag:encrypted
 */
export function encrypt(text: string): string {
  if (!text) return ""
  
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const tag = cipher.getAuthTag()
  
  // Combine iv, tag, and encrypted data
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:tag:encrypted
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ""
  
  try {
    const key = getEncryptionKey()
    const parts = encryptedText.split(":")
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format")
    }
    
    const iv = Buffer.from(parts[0], "hex")
    const tag = Buffer.from(parts[1], "hex")
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Decryption failed:", error)
    return ""
  }
}

/**
 * Mask a secret for display (show first 4 and last 4 characters)
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return "••••••••"
  return `${secret.slice(0, 4)}${"•".repeat(secret.length - 8)}${secret.slice(-4)}`
}
