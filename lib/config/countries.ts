import { z } from 'zod'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** ISO 3166-1 alpha-2 country codes */
export type CountryCode = 'AU' | 'IN' | 'NP' | 'UK' | 'SG' | 'NZ' | 'US' | 'CA'

export type TaxIdType = 'tfn' | 'pan' | 'nric' | 'ird' | 'tax_code' | 'ssn' | 'sin'
export type BankRoutingType = 'bsb' | 'ifsc' | 'iban' | 'swift' | 'routing'

// ============================================================================
// COUNTRY-SPECIFIC SCHEMAS (Single Source of Truth)
// ============================================================================

// AUSTRALIA (TFN + BSB)
const auTaxSchema = z.object({
  taxId: z
    .string()
    .regex(/^\d{8,9}$/, 'TFN must be 8 or 9 digits')
    .describe('Tax File Number'),
  taxFreeThreshold: z.boolean().describe('Claim tax-free threshold'),
  seniorTaxOffset: z.boolean().optional().describe('Eligible for senior Australian resident offset'),
  studentLoan: z.boolean().optional().describe('Has HECS/HELP debt'),
  superannuationFund: z.string().optional().describe('Superannuation fund name'),
  superannuationMemberNumber: z.string().optional().describe('Member number in fund'),
})

const auBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  accountNumber: z
    .string()
    .regex(/^\d{6,10}$/, 'Account number must be 6-10 digits'),
  bsb: z
    .string()
    .regex(/^\d{6}$/, 'BSB must be exactly 6 digits')
    .describe('Bank State Branch code'),
  bankName: z.string().optional(),
  accountType: z.enum(['savings', 'cheque']).optional(),
})

// INDIA & NEPAL (PAN + IFSC)
const inNpTaxSchema = z.object({
  taxId: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .toUpperCase()
    .describe('Permanent Account Number'),
  taxIdName: z.string().min(1).describe('PAN Cardholder Name'),
  uanNumber: z.string().optional().describe('UAN (India) or Citizenship Number (Nepal)'),
})

const inNpBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  accountNumber: z
    .string()
    .regex(/^\d{9,18}$/, 'Account number must be 9-18 digits'),
  ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format')
    .toUpperCase()
    .describe('IFSC Code'),
  bankName: z.string().describe('Bank name'),
})

// UK (Tax Code + IBAN)
const ukTaxSchema = z.object({
  taxCode: z
    .string()
    .regex(/^\d{1,2}[A-Z]{1}$/, 'Invalid UK tax code')
    .describe('Tax code from HMRC'),
  studentLoan: z.boolean().optional().describe('Has student loan debt'),
  ukTaxYearStatus: z.enum(['resident', 'non_resident']).describe('Tax residency status'),
})

const ukBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  iban: z
    .string()
    .regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, 'Invalid IBAN format')
    .toUpperCase(),
  swiftCode: z.string().optional().describe('SWIFT/BIC code'),
  bankName: z.string().optional().describe('Bank name'),
})

// SINGAPORE (NRIC + Bank account)
const sgTaxSchema = z.object({
  nric: z
    .string()
    .regex(/^[SFG]\d{7}[A-Z]$/, 'Invalid NRIC/FIN format')
    .toUpperCase()
    .describe('National Registration ID or FIN'),
  nricType: z.enum(['nric', 'fin', 'other']).describe('Type of ID'),
  legalStatus: z.enum(['citizen', 'pr', 'foreigner']).describe('Legal status in Singapore'),
  nationality: z.string().optional().describe('Nationality'),
  race: z.string().optional().describe('Race'),
  religion: z.string().optional().describe('Religion'),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  nricIssueDate: z.string().optional().describe('NRIC issue date'),
  nricExpiryDate: z.string().optional().describe('NRIC expiry date'),
})

const sgBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  accountNumber: z
    .string()
    .regex(/^\d{10,}$/, 'Account number must be at least 10 digits'),
  bankName: z.string().min(1).describe('Bank name'),
  swiftCode: z.string().optional().describe('SWIFT code'),
})

// NEW ZEALAND (IRD + IBAN)
const nzTaxSchema = z.object({
  irdNumber: z
    .string()
    .regex(/^\d{8,9}$/, 'IRD must be 8-9 digits')
    .describe('Inland Revenue Department number'),
  nzTaxCode: z
    .enum(['ME', 'MD', 'MI', 'SB', 'SR', 'ST', 'AE', 'CM'])
    .describe('PAYE tax code'),
  esctRate: z.enum(['0%', '5%', '10%', '15%', '20%', '25%']).optional().describe('ESCT rate'),
})

const nzBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  iban: z
    .string()
    .regex(/^NZ\d{2}[A-Z0-9]{14}$/, 'Invalid NZ IBAN format')
    .toUpperCase(),
  swiftCode: z.string().optional(),
  bankName: z.string().optional(),
})

// USA (SSN + Routing Number)
const usTaxSchema = z.object({
  ssn: z
    .string()
    .regex(/^\d{9}$/, 'SSN must be exactly 9 digits')
    .describe('Social Security Number'),
  w4FilingStatus: z
    .enum(['single', 'married', 'head_of_household', 'other'])
    .describe('W4 filing status'),
})

const usBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  accountNumber: z
    .string()
    .regex(/^\d{8,17}$/, 'Account number must be 8-17 digits'),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, 'Routing number must be exactly 9 digits')
    .describe('ABA routing number'),
  bankName: z.string().optional(),
})

// CANADA (SIN + Transit Number)
const caTaxSchema = z.object({
  sin: z
    .string()
    .regex(/^\d{9}$/, 'SIN must be exactly 9 digits')
    .describe('Social Insurance Number'),
  province: z
    .enum(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'])
    .describe('Province of residence'),
  td1OnFile: z.boolean().optional().describe('TD1 form on file'),
})

const caBankSchema = z.object({
  accountName: z.string().min(1, 'Account name required'),
  accountNumber: z
    .string()
    .regex(/^\d{7,12}$/, 'Account number must be 7-12 digits'),
  transitNumber: z
    .string()
    .regex(/^\d{5}$/, 'Transit number must be exactly 5 digits'),
  institutionNumber: z
    .string()
    .regex(/^\d{3}$/, 'Institution number must be exactly 3 digits'),
  bankName: z.string().optional(),
})

// ============================================================================
// COUNTRY CONFIGURATION (Config drives validation)
// ============================================================================

export interface CountryConfig {
  code: CountryCode
  name: string
  currency: string
  taxIdType: TaxIdType
  taxIdLabel: string
  bankRoutingTypes: BankRoutingType[]
  taxSchema: z.ZodSchema
  bankSchema: z.ZodSchema
  timezone: string
  locale: string
  isoCode: string
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  AU: {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    taxIdType: 'tfn',
    taxIdLabel: 'Tax File Number (TFN)',
    bankRoutingTypes: ['bsb'],
    taxSchema: auTaxSchema,
    bankSchema: auBankSchema,
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
    isoCode: 'AU',
  },

  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    taxIdType: 'pan',
    taxIdLabel: 'Permanent Account Number (PAN)',
    bankRoutingTypes: ['ifsc'],
    taxSchema: inNpTaxSchema,
    bankSchema: inNpBankSchema,
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    isoCode: 'IN',
  },

  NP: {
    code: 'NP',
    name: 'Nepal',
    currency: 'NPR',
    taxIdType: 'pan',
    taxIdLabel: 'Permanent Account Number (PAN)',
    bankRoutingTypes: ['ifsc'],
    taxSchema: inNpTaxSchema,
    bankSchema: inNpBankSchema,
    timezone: 'Asia/Kathmandu',
    locale: 'en-NP',
    isoCode: 'NP',
  },

  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    taxIdType: 'tax_code',
    taxIdLabel: 'Tax Code (HMRC)',
    bankRoutingTypes: ['iban', 'swift'],
    taxSchema: ukTaxSchema,
    bankSchema: ukBankSchema,
    timezone: 'Europe/London',
    locale: 'en-GB',
    isoCode: 'GB',
  },

  SG: {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    taxIdType: 'nric',
    taxIdLabel: 'National Registration ID (NRIC)',
    bankRoutingTypes: [],
    taxSchema: sgTaxSchema,
    bankSchema: sgBankSchema,
    timezone: 'Asia/Singapore',
    locale: 'en-SG',
    isoCode: 'SG',
  },

  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZD',
    taxIdType: 'ird',
    taxIdLabel: 'IRD Number',
    bankRoutingTypes: ['iban', 'swift'],
    taxSchema: nzTaxSchema,
    bankSchema: nzBankSchema,
    timezone: 'Pacific/Auckland',
    locale: 'en-NZ',
    isoCode: 'NZ',
  },

  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    taxIdType: 'ssn',
    taxIdLabel: 'Social Security Number (SSN)',
    bankRoutingTypes: ['routing'],
    taxSchema: usTaxSchema,
    bankSchema: usBankSchema,
    timezone: 'America/New_York',
    locale: 'en-US',
    isoCode: 'US',
  },

  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    taxIdType: 'sin',
    taxIdLabel: 'Social Insurance Number (SIN)',
    bankRoutingTypes: [],
    taxSchema: caTaxSchema,
    bankSchema: caBankSchema,
    timezone: 'America/Toronto',
    locale: 'en-CA',
    isoCode: 'CA',
  },
}

// ============================================================================
// HELPER FUNCTIONS (Single Source of Truth)
// ============================================================================

export function getCountryConfig(code: CountryCode): CountryConfig {
  const config = COUNTRIES[code]
  if (!config) {
    throw new Error(`Unknown country code: ${code}`)
  }
  return config
}

export function getTaxSchema(code: CountryCode) {
  return getCountryConfig(code).taxSchema
}

export function getBankSchema(code: CountryCode) {
  return getCountryConfig(code).bankSchema
}

export function getAllCountries(): CountryConfig[] {
  return Object.values(COUNTRIES)
}
