/**
 * Authentication Token Utilities
 * 
 * Handles generation and hashing of tokens for:
 * - Password reset
 * - Password setup (first time)
 * - Email verification
 */

import crypto from "crypto"

/**
 * Generate a secure random token
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex string token
 */
export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex")
}

/**
 * Hash a token for secure storage in database
 * @param token - Plain text token
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Generate token with expiry
 * @param expiryHours - Hours until expiry (default: 24)
 * @returns Object with plain token, hashed token, and expiry date
 */
export function generateTokenWithExpiry(expiryHours: number = 24) {
  const token = generateToken()
  const hashedToken = hashToken(token)
  const expiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
  
  return {
    token, // Send this in email
    hashedToken, // Store this in database
    expiry,
  }
}

/**
 * Verify if a token is still valid
 * @param expiry - Token expiry date
 * @returns True if token is still valid
 */
export function isTokenValid(expiry: Date | null | undefined): boolean {
  if (!expiry) return false
  return new Date() < new Date(expiry)
}
