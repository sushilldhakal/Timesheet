import { z } from 'zod'

export { employeeIdParamSchema } from './employee'

// ─── Shared helpers ──────────────────────────────────────
const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')

// ─── Tax Info ────────────────────────────────────────────
export const taxInfoBodySchema = z.object({
  tfn: z.string().regex(/^\d{8,9}$/, 'TFN must be 8 or 9 digits'),
  abn: z.string().regex(/^\d{11}$/, 'ABN must be 11 digits').optional(),
  superannuationFund: z.string().optional(),
  superannuationMemberNumber: z.string().optional(),
  taxWithholdingPercentage: z.number().min(0).max(100).optional(),
  helpDebt: z.boolean().optional(),
  salarySecureForm: z.object({
    url: z.string().url().optional(),
    signedDate: z.string().optional(),
  }).optional(),
})

export const taxInfoUpdateSchema = taxInfoBodySchema.partial()

export const taxInfoResponseSchema = z.object({
  taxInfo: z.object({
    id: z.string(),
    employeeId: z.string(),
    tfn: z.string(),
    abn: z.string().nullable().optional(),
    superannuationFund: z.string().nullable().optional(),
    superannuationMemberNumber: z.string().nullable().optional(),
    taxWithholdingPercentage: z.number().nullable().optional(),
    helpDebt: z.boolean().optional(),
    salarySecureForm: z.object({
      url: z.string().nullable().optional(),
      signedDate: z.string().nullable().optional(),
    }).nullable().optional(),
  }),
})

// ─── Bank Details ────────────────────────────────────────
export const bankDetailsBodySchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  bsbCode: z.string().regex(/^\d{3}-\d{3}$/, 'BSB must be in format 000-000'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  bankName: z.string().optional(),
  accountType: z.enum(['savings', 'cheque']).optional(),
})

export const bankDetailsUpdateSchema = bankDetailsBodySchema.partial()

export const bankDetailsResponseSchema = z.object({
  bankDetails: z.object({
    id: z.string(),
    employeeId: z.string(),
    accountNumber: z.string(),
    bsbCode: z.string(),
    accountHolderName: z.string(),
    bankName: z.string().nullable().optional(),
    accountType: z.string().nullable().optional(),
  }),
})

// ─── Contract ────────────────────────────────────────────
export const contractBodySchema = z.object({
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  endDate: z.string().nullable().optional(),
  contractType: z.enum(['permanent', 'fixed-term', 'casual', 'contractor']),
  noticePeriod: z.number().min(0).optional(),
  probationPeriodEnd: z.string().optional(),
  contractTermsUrl: z.string().url().optional(),
  salary: z.number().min(0).optional(),
  wageType: z.enum(['salary', 'hourly', 'piecework']),
  isActive: z.boolean().optional(),
})

export const contractUpdateSchema = contractBodySchema.partial()

export const contractResponseSchema = z.object({
  contract: z.object({
    id: z.string(),
    employeeId: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    contractType: z.string(),
    noticePeriod: z.number().nullable().optional(),
    probationPeriodEnd: z.string().nullable().optional(),
    contractTermsUrl: z.string().nullable().optional(),
    salary: z.number().nullable().optional(),
    wageType: z.string(),
    isActive: z.boolean(),
  }),
})

export const contractListResponseSchema = z.object({
  contracts: z.array(contractResponseSchema.shape.contract),
})

// ─── Qualification ───────────────────────────────────────
export const qualificationBodySchema = z.object({
  qualificationName: z.string().min(1),
  issuingBody: z.string().min(1),
  issueDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid issue date'),
  expiryDate: z.string().optional(),
  licenseNumber: z.string().optional(),
  status: z.enum(['current', 'expired', 'pending']).optional(),
  documentUrl: z.string().url().optional(),
})

export const qualificationUpdateSchema = qualificationBodySchema.partial()

export const qualificationIdParamSchema = z.object({
  id: objectIdString,
  qualificationId: objectIdString,
})

export const qualificationResponseSchema = z.object({
  qualification: z.object({
    id: z.string(),
    employeeId: z.string(),
    qualificationName: z.string(),
    issuingBody: z.string(),
    issueDate: z.string(),
    expiryDate: z.string().nullable().optional(),
    licenseNumber: z.string().nullable().optional(),
    status: z.string(),
    documentUrl: z.string().nullable().optional(),
  }),
})

export const qualificationListResponseSchema = z.object({
  qualifications: z.array(qualificationResponseSchema.shape.qualification),
})

// ─── Compliance ──────────────────────────────────────────
export const complianceUpdateSchema = z.object({
  wwcStatus: z.enum(['not_required', 'pending', 'active', 'expired']).optional(),
  wwcNumber: z.string().optional(),
  wwcExpiryDate: z.string().optional(),
  policeClearanceStatus: z.enum(['pending', 'active', 'expired']).optional(),
  policeClearanceNumber: z.string().optional(),
  policeClearanceExpiryDate: z.string().optional(),
  foodHandlingStatus: z.enum(['current', 'expired']).optional(),
  foodHandlingExpiryDate: z.string().optional(),
  healthSafetyCertifications: z.array(z.string()).optional(),
  inductionCompleted: z.boolean().optional(),
  inductionDate: z.string().optional(),
  inductionDocUrl: z.string().url().optional(),
  codeOfConductSigned: z.boolean().optional(),
  codeOfConductDate: z.string().optional(),
  codeOfConductDocUrl: z.string().url().optional(),
  lastComplianceCheckDate: z.string().optional(),
})

export const complianceResponseSchema = z.object({
  compliance: z.object({
    id: z.string(),
    employeeId: z.string(),
    wwcStatus: z.string().nullable().optional(),
    wwcNumber: z.string().nullable().optional(),
    wwcExpiryDate: z.string().nullable().optional(),
    policeClearanceStatus: z.string().nullable().optional(),
    policeClearanceNumber: z.string().nullable().optional(),
    policeClearanceExpiryDate: z.string().nullable().optional(),
    foodHandlingStatus: z.string().nullable().optional(),
    foodHandlingExpiryDate: z.string().nullable().optional(),
    healthSafetyCertifications: z.array(z.string()).optional(),
    inductionCompleted: z.boolean(),
    inductionDate: z.string().nullable().optional(),
    inductionDocUrl: z.string().nullable().optional(),
    codeOfConductSigned: z.boolean(),
    codeOfConductDate: z.string().nullable().optional(),
    codeOfConductDocUrl: z.string().nullable().optional(),
    lastComplianceCheckDate: z.string().nullable().optional(),
    alerts: z.array(z.object({
      type: z.string(),
      field: z.string(),
      message: z.string(),
      expiryDate: z.string().optional(),
    })).optional(),
  }),
})
