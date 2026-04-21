import { z } from 'zod'

const digitsOnly = (value: unknown) => String(value ?? '').replace(/\D/g, '')

// Step 1: Personal Information & Legal Details (combined)
export const staffOnboardingStep1Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Suburb/City is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(3, 'Postcode is required'),
  country: z.string().min(1, 'Country is required'),
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalMiddleNames: z.string().optional().or(z.literal('')),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  preferredName: z.string().optional().or(z.literal('')),
  nationality: z.string().min(1, 'Nationality is required'),
  timeZone: z.string(),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(1, 'Emergency contact phone is required'),

  // If Australian nationality: one of these IDs is required
  australianIdType: z.enum(['drivers_licence', 'medicare', 'passport']).optional(),
  australianIdNumber: z.string().optional().or(z.literal('')),

  // If not Australian: visa details required
  visaType: z.string().optional().or(z.literal('')),
  visaNumber: z.string().optional().or(z.literal('')),
  maxHoursPerFortnight: z.number().optional().or(z.literal(0)),
}).superRefine((data, ctx) => {
  const isAustralian = String(data.nationality).toLowerCase().includes('austral')
  if (isAustralian) {
    if (!data.australianIdType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['australianIdType'], message: 'Select an ID type' })
    }
    if (!String(data.australianIdNumber || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['australianIdNumber'], message: 'ID number is required' })
    }
  } else {
    if (!String(data.visaType || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaType'], message: 'Visa type is required' })
    }
    if (!String(data.visaNumber || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaNumber'], message: 'Visa number is required' })
    }
  }
})

export type StaffOnboardingStep1Data = z.infer<typeof staffOnboardingStep1Schema>

// Step 2: Tax & Banking (combined)
export const staffOnboardingStep2Schema = z.object({
  // Tax & Super
  tfn: z.string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{8,9}$/.test(v), { message: 'TFN must be 8 or 9 digits' }),
  taxFreeThreshold: z.boolean(),
  hasHelpDebt: z.boolean(),
  superannuationFund: z.string().min(1, 'Super fund name is required'),
  superannuationMemberNumber: z.string().min(1, 'Super member number is required'),

  // Banking
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{6,10}$/.test(v), { message: 'Account number must be 6-10 digits' }),
  bsbCode: z.string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{6}$/.test(v), { message: 'BSB must be 6 digits' }),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountType: z.enum(['savings', 'cheque']),
})

export type StaffOnboardingStep2Data = z.infer<typeof staffOnboardingStep2Schema>

// Step 3: Compliance & Certifications (optional — only shown if requiresCompliance is true)
export const staffOnboardingStep3Schema = z.object({
  wwcStatus: z.enum(['not_required', 'pending', 'active', 'expired']),
  wwcExpiryDate: z.string().optional().or(z.literal('')),
  policeClearanceStatus: z.enum(['pending', 'active', 'expired']),
  policeClearanceExpiryDate: z.string().optional().or(z.literal('')),
  foodHandlingStatus: z.enum(['current', 'expired']),
  foodHandlingExpiryDate: z.string().optional().or(z.literal('')),
})

export type StaffOnboardingStep3Data = z.infer<typeof staffOnboardingStep3Schema>

// Combined onboarding form schema
export const staffOnboardingFormSchema = z.object({
  // Step 1
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Suburb/City is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(3, 'Postcode is required'),
  country: z.string().min(1, 'Country is required'),
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalMiddleNames: z.string().optional().or(z.literal('')),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  preferredName: z.string().optional().or(z.literal('')),
  nationality: z.string().min(1, 'Nationality is required'),
  timeZone: z.string(),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(1, 'Emergency contact phone is required'),
  australianIdType: z.enum(['drivers_licence', 'medicare', 'passport']).optional(),
  australianIdNumber: z.string().optional().or(z.literal('')),
  visaType: z.string().optional().or(z.literal('')),
  visaNumber: z.string().optional().or(z.literal('')),
  maxHoursPerFortnight: z.number().optional().or(z.literal(0)),

  // Step 2
  tfn: z.string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{8,9}$/.test(v), { message: 'TFN must be 8 or 9 digits' }),
  taxFreeThreshold: z.boolean(),
  hasHelpDebt: z.boolean(),
  superannuationFund: z.string().min(1, 'Super fund name is required'),
  superannuationMemberNumber: z.string().min(1, 'Super member number is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{6,10}$/.test(v), { message: 'Account number must be 6-10 digits' }),
  bsbCode: z.string()
    .transform((v) => digitsOnly(v))
    .refine((v) => /^\d{6}$/.test(v), { message: 'BSB must be 6 digits' }),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountType: z.enum(['savings', 'cheque']),

  // Step 3 (optional)
  wwcStatus: z.enum(['not_required', 'pending', 'active', 'expired']).optional(),
  wwcExpiryDate: z.string().optional().or(z.literal('')),
  policeClearanceStatus: z.enum(['pending', 'active', 'expired']).optional(),
  policeClearanceExpiryDate: z.string().optional().or(z.literal('')),
  foodHandlingStatus: z.enum(['current', 'expired']).optional(),
  foodHandlingExpiryDate: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const isAustralian = String(data.nationality).toLowerCase().includes('austral')
  if (isAustralian) {
    if (!data.australianIdType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['australianIdType'], message: 'Select an ID type' })
    }
    if (!String(data.australianIdNumber || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['australianIdNumber'], message: 'ID number is required' })
    }
  } else {
    if (!String(data.visaType || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaType'], message: 'Visa type is required' })
    }
    if (!String(data.visaNumber || '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaNumber'], message: 'Visa number is required' })
    }
  }
})

export type StaffOnboardingFormData = z.infer<typeof staffOnboardingFormSchema>
