import mongoose from 'mongoose'

export interface IPayrollMapping {
  tenantId: mongoose.Types.ObjectId
  payrollSystemType: 'xero' | 'myob' | 'apa' | 'custom'

  ruleMapping: Array<{
    exportName: string
    payrollCode: string
    description: string
  }>

  payItemMapping: Array<{
    type: 'pay' | 'deduction' | 'leave_accrual'
    exportName: string
    payrollCode: string
    description: string
  }>

  breakMapping: Array<{
    breakType: string
    exportName: string
    payrollCode: string
  }>

  isDefault?: boolean
  notes?: string

  createdAt?: Date
  updatedAt?: Date
}

export interface IPayrollMappingDocument extends IPayrollMapping, mongoose.Document {}

const payrollMappingSchema = new mongoose.Schema<IPayrollMappingDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      required: true,
      index: true
    },
    payrollSystemType: {
      type: String,
      enum: ['xero', 'myob', 'apa', 'custom'],
      required: true
    },
    ruleMapping: [
      {
        exportName: { type: String, required: true },
        payrollCode: { type: String, required: true },
        description: String
      }
    ],
    payItemMapping: [
      {
        type: {
          type: String,
          enum: ['pay', 'deduction', 'leave_accrual'],
          required: true
        },
        exportName: { type: String, required: true },
        payrollCode: { type: String, required: true },
        description: String
      }
    ],
    breakMapping: [
      {
        breakType: { type: String, required: true },
        exportName: { type: String, required: true },
        payrollCode: { type: String, required: true }
      }
    ],
    isDefault: { type: Boolean, default: false },
    notes: String
  },
  {
    timestamps: true,
    collection: 'payroll_mappings'
  }
)

payrollMappingSchema.index({ tenantId: 1, payrollSystemType: 1, isDefault: 1 })

export const PayrollMapping =
  (mongoose.models.PayrollMapping as mongoose.Model<IPayrollMappingDocument>) ??
  mongoose.model<IPayrollMappingDocument>('PayrollMapping', payrollMappingSchema)
