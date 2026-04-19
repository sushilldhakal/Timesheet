import { z } from 'zod'

// Step 1: Personal Information
export const step1Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
})

export type Step1Data = z.infer<typeof step1Schema>

// Step 2: Legal Information
export const step2Schema = z.object({
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalMiddleNames: z.string().optional().or(z.literal('')),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  preferredName: z.string().optional().or(z.literal('')),
  nationality: z.string().min(1, 'Nationality is required'),
  timeZone: z.string(),
  locale: z.string(),
})

export type Step2Data = z.infer<typeof step2Schema>

// Step 3: Tax & Superannuation
export const step3Schema = z.object({
  tfn: z.string().max(11).optional().or(z.literal('')),
  abn: z.string().max(11).optional().or(z.literal('')),
  superannuationFund: z.string().optional().or(z.literal('')),
  superannuationMemberNumber: z.string().optional().or(z.literal('')),
  taxWithholdingPercentage: z.number().min(0).max(100),
  hasHelpDebt: z.boolean(),
})

export type Step3Data = z.infer<typeof step3Schema>

// Step 4: Bank Details
export const step4Schema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(6, 'Account number must be at least 6 digits'),
  bsbCode: z.string().regex(/^\d{3}-\d{3}$/, 'BSB must be in format XXX-XXX'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountType: z.enum(['savings', 'cheque']),
})

export type Step4Data = z.infer<typeof step4Schema>

// Step 5: Employment Details
export const step5Schema = z.object({
  contractType: z.enum(['permanent', 'fixed-term', 'casual', 'contractor']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  wageType: z.enum(['salary', 'hourly', 'piecework']),
  salary: z.number().min(0, 'Salary must be 0 or greater'),
  noticePeriod: z.number().min(0).max(365),
  probationPeriodEnd: z.string().optional().or(z.literal('')),
})

export type Step5Data = z.infer<typeof step5Schema>

// Step 6: Compliance & Certifications
export const step6Schema = z.object({
  wwcStatus: z.enum(['not_required', 'pending', 'active', 'expired']),
  wwcExpiryDate: z.string().optional().or(z.literal('')),
  policeClearanceStatus: z.enum(['pending', 'active', 'expired']),
  policeClearanceExpiryDate: z.string().optional().or(z.literal('')),
  foodHandlingStatus: z.enum(['current', 'expired']),
  foodHandlingExpiryDate: z.string().optional().or(z.literal('')),
})

export type Step6Data = z.infer<typeof step6Schema>

// Combined onboarding form schema
export const onboardingFormSchema = z.object({
  // Step 1
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  
  // Step 2
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalMiddleNames: z.string().optional().or(z.literal('')),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  preferredName: z.string().optional().or(z.literal('')),
  nationality: z.string().min(1, 'Nationality is required'),
  timeZone: z.string(),
  locale: z.string(),
  
  // Step 3
  tfn: z.string().max(11).optional().or(z.literal('')),
  abn: z.string().max(11).optional().or(z.literal('')),
  superannuationFund: z.string().optional().or(z.literal('')),
  superannuationMemberNumber: z.string().optional().or(z.literal('')),
  taxWithholdingPercentage: z.number().min(0).max(100),
  hasHelpDebt: z.boolean(),
  
  // Step 4
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(6, 'Account number must be at least 6 digits'),
  bsbCode: z.string().regex(/^\d{3}-\d{3}$/, 'BSB must be in format XXX-XXX'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountType: z.enum(['savings', 'cheque']),
  
  // Step 5
  contractType: z.enum(['permanent', 'fixed-term', 'casual', 'contractor']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  wageType: z.enum(['salary', 'hourly', 'piecework']),
  salary: z.number().min(0, 'Salary must be 0 or greater'),
  noticePeriod: z.number().min(0).max(365),
  probationPeriodEnd: z.string().optional().or(z.literal('')),
  
  // Step 6
  wwcStatus: z.enum(['not_required', 'pending', 'active', 'expired']),
  wwcExpiryDate: z.string().optional().or(z.literal('')),
  policeClearanceStatus: z.enum(['pending', 'active', 'expired']),
  policeClearanceExpiryDate: z.string().optional().or(z.literal('')),
  foodHandlingStatus: z.enum(['current', 'expired']),
  foodHandlingExpiryDate: z.string().optional().or(z.literal('')),
})

export type OnboardingFormData = z.infer<typeof onboardingFormSchema>
