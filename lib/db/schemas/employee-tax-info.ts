import mongoose from 'mongoose'

/**
 * Encrypted tax ID with masking support for display
 */
export interface ITaxId {
  type: 'tfn' | 'pan' | 'nric' | 'ird' | 'tax_code' | 'ssn' | 'sin'
  valueEncrypted: string
  last4?: string
}

/**
 * Bank routing info (standardised structure)
 */
export interface IBankRouting {
  type: 'bsb' | 'ifsc' | 'iban' | 'swift' | 'routing'
  valueEncrypted: string
  last4?: string
}

/**
 * Bank details with standardised model
 */
export interface IBankDetails {
  accountName: string
  accountNumberEncrypted: string
  accountLast4: string
  routing: IBankRouting
  bankName?: string
  swiftCode?: string
}

/**
 * Country-specific tax data (namespaced by country type)
 */
export interface ITaxData {
  type: 'AU' | 'IN' | 'NP' | 'UK' | 'SG' | 'NZ' | 'US' | 'CA'
  version: string
  data: Record<string, any>
}

/**
 * Access log for compliance & audit
 */
export interface IAccessLog {
  userId: mongoose.Types.ObjectId
  action: 'VIEW_TAX' | 'EDIT_TAX' | 'DELETE_TAX' | 'VIEW_BANK' | 'EDIT_BANK' | 'DELETE_BANK'
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * Employee Tax Information
 */
export interface IEmployeeTaxInfo {
  employeeId: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId

  countrySnapshot: 'AU' | 'IN' | 'NP' | 'UK' | 'SG' | 'NZ' | 'US' | 'CA'

  taxId: ITaxId

  tax: ITaxData

  bank: IBankDetails

  accessLogs?: IAccessLog[]

  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeTaxInfoDocument extends IEmployeeTaxInfo, mongoose.Document {}

// Schemas
const taxIdSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['tfn', 'pan', 'nric', 'ird', 'tax_code', 'ssn', 'sin'],
      required: true,
    },
    valueEncrypted: { type: String, required: true },
    last4: { type: String },
  },
  { _id: false }
)

const bankRoutingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['bsb', 'ifsc', 'iban', 'swift', 'routing'],
      required: true,
    },
    valueEncrypted: { type: String, required: true },
    last4: { type: String },
  },
  { _id: false }
)

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, required: true },
    accountNumberEncrypted: { type: String, required: true },
    accountLast4: { type: String, required: true },
    routing: { type: bankRoutingSchema, required: true },
    bankName: { type: String },
    swiftCode: { type: String },
  },
  { _id: false }
)

const taxDataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['AU', 'IN', 'NP', 'UK', 'SG', 'NZ', 'US', 'CA'],
      required: true,
    },
    version: { type: String, required: true, default: '2024' },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
)

const accessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['VIEW_TAX', 'EDIT_TAX', 'DELETE_TAX', 'VIEW_BANK', 'EDIT_BANK', 'DELETE_BANK'],
      required: true,
    },
    timestamp: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
)

const employeeTaxInfoSchema = new mongoose.Schema<IEmployeeTaxInfoDocument>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      required: true,
      index: true,
    },
    countrySnapshot: {
      type: String,
      enum: ['AU', 'IN', 'NP', 'UK', 'SG', 'NZ', 'US', 'CA'],
      required: true,
    },
    taxId: { type: taxIdSchema, required: true },
    tax: { type: taxDataSchema, required: true },
    bank: { type: bankDetailsSchema, required: true },
    accessLogs: [{ type: accessLogSchema }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'employee_tax_infos',
  }
)

employeeTaxInfoSchema.index({ employeeId: 1, tenantId: 1 }, { unique: true })
employeeTaxInfoSchema.index({ tenantId: 1, countrySnapshot: 1 })

export const EmployeeTaxInfo =
  (mongoose.models.EmployeeTaxInfo as mongoose.Model<IEmployeeTaxInfoDocument>) ??
  mongoose.model<IEmployeeTaxInfoDocument>('EmployeeTaxInfo', employeeTaxInfoSchema)

export default EmployeeTaxInfo
