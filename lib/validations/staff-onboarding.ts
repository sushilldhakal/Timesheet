import { z } from 'zod'

const digitsOnly = (value: unknown) => String(value ?? '').replace(/\D/g, '')

// Step 1: Personal Details (all countries)
export const staffOnboardingStep1Schema = z.object({
  legalFirstName: z.string().min(1, 'Legal first name is required'),
  legalLastName: z.string().min(1, 'Legal last name is required'),
  legalMiddleNames: z.string().optional().or(z.literal('')),
  preferredName: z.string().optional().or(z.literal('')),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().optional().or(z.literal('')),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  country: z.string().min(1, 'Country is required'),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactRelationship: z.string().min(1, 'Emergency contact relationship is required'),
  emergencyContactPhone: z.string().min(1, 'Emergency contact phone is required'),
})

export type StaffOnboardingStep1Data = z.infer<typeof staffOnboardingStep1Schema>

// Step 2: Work Eligibility & Tax (merged — country-aware)
export const staffOnboardingStep2Schema = z.object({
  country: z.enum(['AU', 'NZ', 'IN', 'NP']),
  workRightsType: z.string().optional(),
  
  // AU citizen/PR fields
  australianIdType: z.enum(['drivers_licence', 'medicare', 'passport']).optional(),
  australianIdNumber: z.string().optional(),
  
  // AU visa holder fields
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  visaSubclass: z.string().optional(),
  visaGrantNumber: z.string().optional(),
  visaWorkConditions: z.string().optional(),
  maxHoursPerFortnight: z.number().optional(),
  
  // AU driver's licence extra fields
  licenceIssuedState: z.string().optional(),
  licenceExpiry: z.string().optional(),
  licenceCardNumber: z.string().optional(),
  
  // AU visa holder passport issuing country
  passportIssuingCountry: z.string().optional(),
  
  // NP citizen fields
  citizenshipCertNumber: z.string().optional(),
  citizenshipIssuedDistrict: z.string().optional(),
  citizenshipIssuedDate: z.string().optional(),
  nationalIdNumber: z.string().optional(),
  
  // NP foreign national fields
  workPermitNumber: z.string().optional(),
  workPermitExpiry: z.string().optional(),
  
  // IN fields (deferred)
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
  
  // NZ fields (deferred)
  nzWorkRightsType: z.string().optional(),

  // Tax fields (merged from old step 3)
  tfn: z.string().optional(),
  taxFreeThreshold: z.boolean().optional(),
  residencyStatusAU: z.string().optional(),
  hasHelpDebt: z.boolean().optional(),
  panNepal: z.string().optional(),
  irdNumber: z.string().optional(),
  taxCodeNZ: z.string().optional(),
  panForTax: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.country === 'AU') {
    if (!data.workRightsType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workRightsType'], message: 'Work rights type is required' })
    }
    if (data.workRightsType === 'au_citizen' || data.workRightsType === 'au_resident') {
      if (!data.australianIdType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['australianIdType'], message: 'ID type is required' })
      }
      if (!data.australianIdNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['australianIdNumber'], message: 'ID number is required' })
      }
      if (data.australianIdType === 'passport' && !data.passportExpiry) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passportExpiry'], message: 'Passport expiry is required' })
      }
    }
    if (data.workRightsType === 'visa_holder') {
      if (!data.passportNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passportNumber'], message: 'Passport number is required' })
      }
      if (!data.passportExpiry) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passportExpiry'], message: 'Passport expiry is required' })
      }
      if (!data.visaSubclass) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaSubclass'], message: 'Visa subclass is required' })
      }
      if (!data.visaGrantNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaGrantNumber'], message: 'Visa grant number is required' })
      }
    }
    if (data.tfn) {
      const tfnDigits = digitsOnly(data.tfn)
      if (!/^\d{8,9}$/.test(tfnDigits)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tfn'], message: 'TFN must be 8 or 9 digits' })
      }
    }
  }
  
  if (data.country === 'NP') {
    if (!data.workRightsType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workRightsType'], message: 'Citizenship type is required' })
    }
    if (data.workRightsType === 'nepali_citizen') {
      if (!data.citizenshipCertNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizenshipCertNumber'], message: 'Citizenship certificate number is required' })
      }
      if (!data.citizenshipIssuedDistrict) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizenshipIssuedDistrict'], message: 'Issued district is required' })
      }
      if (!data.citizenshipIssuedDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['citizenshipIssuedDate'], message: 'Issued date is required' })
      }
    }
    if (data.workRightsType === 'foreign_national') {
      if (!data.passportNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passportNumber'], message: 'Passport number is required' })
      }
      if (!data.workPermitNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workPermitNumber'], message: 'Work permit number is required' })
      }
    }
  }
})

export type StaffOnboardingStep2Data = z.infer<typeof staffOnboardingStep2Schema>

// Step 3: Banking & Super (country-aware) — was step 4
export const staffOnboardingStep3Schema = z.object({
  country: z.enum(['AU', 'NZ', 'IN', 'NP']),
  
  // AU banking fields
  bankName: z.string().optional(),
  bsbCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountType: z.enum(['savings', 'cheque']).optional(),
  superFundName: z.string().optional(),
  superUSI: z.string().optional(),
  superMemberNumber: z.string().optional(),
  
  // NP banking fields
  nepalBankName: z.string().optional(),
  nepalBranch: z.string().optional(),
  nepalAccountNumber: z.string().optional(),
  ssfNumber: z.string().optional(),
  
  // NZ banking fields (deferred)
  nzAccountNumber: z.string().optional(),
  kiwiSaverOptIn: z.boolean().optional(),
  kiwiSaverFund: z.string().optional(),
  kiwiSaverRate: z.number().optional(),
  
  // IN banking fields (deferred)
  ifscCode: z.string().optional(),
  indianAccountNumber: z.string().optional(),
  indianAccountName: z.string().optional(),
  uanNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.country === 'AU') {
    if (!data.bankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bankName'], message: 'Bank name is required' })
    }
    if (!data.bsbCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bsbCode'], message: 'BSB is required' })
    } else {
      const bsbDigits = digitsOnly(data.bsbCode)
      if (!/^\d{6}$/.test(bsbDigits)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bsbCode'], message: 'BSB must be 6 digits' })
      }
    }
    if (!data.accountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountNumber'], message: 'Account number is required' })
    } else {
      const accountDigits = digitsOnly(data.accountNumber)
      if (!/^\d{6,10}$/.test(accountDigits)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountNumber'], message: 'Account number must be 6-10 digits' })
      }
    }
    if (!data.accountHolderName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountHolderName'], message: 'Account holder name is required' })
    }
  }
  
  if (data.country === 'NP') {
    if (!data.nepalBankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nepalBankName'], message: 'Bank name is required' })
    }
    if (!data.nepalBranch) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nepalBranch'], message: 'Branch is required' })
    }
    if (!data.nepalAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nepalAccountNumber'], message: 'Account number is required' })
    }
  }
})

export type StaffOnboardingStep3Data = z.infer<typeof staffOnboardingStep3Schema>

// Step 4: Documents — was step 5
export const staffOnboardingStep4Schema = z.object({
  country: z.enum(['AU', 'NZ', 'IN', 'NP']),
  workRightsType: z.string().optional(),
  australianIdType: z.string().optional(),
  certifications: z.array(z.object({
    type: z.string(),
    label: z.string().optional(),
    required: z.boolean(),
    provided: z.boolean(),
    documentUrl: z.string().optional(),
    expiryDate: z.string().optional(),
  })),
  // Country-specific document uploads
  citizenshipDocFrontUrl: z.string().optional(),
  citizenshipDocBackUrl: z.string().optional(),
  passportDocUrl: z.string().optional(),
  visaDocUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate that all required certifications have documents
  for (let i = 0; i < data.certifications.length; i++) {
    const cert = data.certifications[i]
    if (cert.required && !cert.documentUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['certifications', i, 'documentUrl'],
        message: `Document required for ${cert.label || cert.type}`,
      })
    }
  }
  
  // Country-specific document requirements
  if (data.country === 'NP') {
    const hasNepalCitizenship = data.certifications.some(c => c.type === 'citizenship_cert')
    if (hasNepalCitizenship && !data.citizenshipDocFrontUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['citizenshipDocFrontUrl'],
        message: 'Citizenship certificate front image is required',
      })
    }
  }

  if (data.country === 'AU') {
    if ((data.workRightsType === 'au_citizen' || data.workRightsType === 'au_resident') && data.australianIdType === 'passport') {
      if (!data.passportDocUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passportDocUrl'], message: 'Upload of passport is required to verify your identity' })
      }
    }
    if (data.workRightsType === 'visa_holder') {
      if (!data.passportDocUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passportDocUrl'], message: 'Passport scan is required for visa holders' })
      }
      if (!data.visaDocUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['visaDocUrl'], message: 'Visa grant notice upload is required' })
      }
    }
  }
})

export type StaffOnboardingStep4Data = z.infer<typeof staffOnboardingStep4Schema>

// Step 5: Review & Submit — was step 6
export const staffOnboardingStep5Schema = z.object({
  consentGiven: z.boolean().refine(val => val === true, {
    message: 'You must consent to proceed',
  }),
})

export type StaffOnboardingStep5Data = z.infer<typeof staffOnboardingStep5Schema>

// Combined form schema (for final submission)
export const staffOnboardingFormSchema = z.object({
  // Step 1
  legalFirstName: z.string().min(1),
  legalLastName: z.string().min(1),
  legalMiddleNames: z.string().optional(),
  preferredName: z.string().optional(),
  dob: z.string().min(1),
  gender: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().min(1),
  emergencyContactName: z.string().min(1),
  emergencyContactRelationship: z.string().min(1),
  emergencyContactPhone: z.string().min(1),
  
  // Step 2 (work eligibility + tax — merged)
  workRightsType: z.string().optional(),
  australianIdType: z.string().optional(),
  australianIdNumber: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  visaSubclass: z.string().optional(),
  visaGrantNumber: z.string().optional(),
  visaWorkConditions: z.string().optional(),
  maxHoursPerFortnight: z.number().optional(),
  licenceIssuedState: z.string().optional(),
  licenceExpiry: z.string().optional(),
  licenceCardNumber: z.string().optional(),
  passportIssuingCountry: z.string().optional(),
  citizenshipCertNumber: z.string().optional(),
  citizenshipIssuedDistrict: z.string().optional(),
  citizenshipIssuedDate: z.string().optional(),
  nationalIdNumber: z.string().optional(),
  workPermitNumber: z.string().optional(),
  workPermitExpiry: z.string().optional(),
  tfn: z.string().optional(),
  taxFreeThreshold: z.boolean().optional(),
  residencyStatusAU: z.string().optional(),
  hasHelpDebt: z.boolean().optional(),
  panNepal: z.string().optional(),
  irdNumber: z.string().optional(),
  taxCodeNZ: z.string().optional(),
  panForTax: z.string().optional(),
  
  // Step 3 (banking)
  bankName: z.string().optional(),
  bsbCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountType: z.enum(['savings', 'cheque']).optional(),
  superFundName: z.string().optional(),
  superUSI: z.string().optional(),
  superMemberNumber: z.string().optional(),
  nepalBankName: z.string().optional(),
  nepalBranch: z.string().optional(),
  nepalAccountNumber: z.string().optional(),
  ssfNumber: z.string().optional(),
  nzAccountNumber: z.string().optional(),
  kiwiSaverOptIn: z.boolean().optional(),
  kiwiSaverFund: z.string().optional(),
  kiwiSaverRate: z.number().optional(),
  
  // Step 5 (review & submit)
  consentGiven: z.boolean(),
})

export type StaffOnboardingFormData = z.infer<typeof staffOnboardingFormSchema>
