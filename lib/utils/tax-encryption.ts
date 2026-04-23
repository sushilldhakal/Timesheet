import crypto from 'crypto'

const RAW_KEY = process.env.TAX_ENCRYPTION_KEY || 'dev-key-32-chars-placeholder-only!'
const ALGORITHM = 'aes-256-gcm'

// Derive a fixed 32-byte key regardless of the raw key length
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest()

/**
 * Encrypt sensitive tax/bank data
 */
export function encryptTaxData(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

/**
 * Decrypt sensitive tax/bank data
 */
export function decryptTaxData(encrypted: string): string {
  const [ivHex, ciphertext, authTagHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}

/**
 * Extract last 4 characters for display masking
 */
export function extractLast4(plaintext: string): string {
  return plaintext.slice(-4)
}

// Masking formats by country & field type

export const TAX_MASKING_FORMATS: Record<string, (last4: string) => string> = {
  tfn: (last4) => `***-***-${last4}`,
  pan: (last4) => `${last4.slice(0, 2)}****${last4.slice(2)}`,
  nric: (last4) => `S****${last4}`,
  ird: (last4) => `****${last4}`,
  tax_code: (last4) => `1****${last4}`,
  ssn: (last4) => `***-**-${last4}`,
  sin: (last4) => `***-***-${last4}`,
}

export const BANK_MASKING_FORMATS: Record<string, (last4: string) => string> = {
  bsb: (last4) => `${last4}-***`,
  ifsc: (last4) => `${last4}****`,
  iban: (last4) => `GB82****`,
  routing: (last4) => `***${last4}`,
}

/**
 * Get masked tax ID for display
 */
export function getMaskedTaxId(taxIdType: string, last4: string): string {
  const formatter = TAX_MASKING_FORMATS[taxIdType]
  return formatter ? formatter(last4) : `****${last4}`
}

/**
 * Get masked bank routing for display
 */
export function getMaskedBankRouting(routingType: string, last4: string): string {
  const formatter = BANK_MASKING_FORMATS[routingType]
  return formatter ? formatter(last4) : `••••${last4}`
}

/**
 * Get masked account number
 */
export function getMaskedAccountNumber(accountNumber: string): string {
  const last4 = accountNumber.slice(-4)
  return `••••${last4}`
}
