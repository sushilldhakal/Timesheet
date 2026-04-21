import mongoose from 'mongoose'

export interface IEmployeeBankDetails {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  accountNumber: string
  accountNumberLast4?: string   // last 4 digits, stored at save time
  bsbCode: string
  bsbLast3?: string             // last 3 digits of BSB
  accountHolderName: string
  bankName?: string
  accountType?: 'savings' | 'cheque'
  createdAt?: Date
  updatedAt?: Date
}

const employeeBankDetailsSchema = new mongoose.Schema<IEmployeeBankDetails>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountNumberLast4: {
      type: String,
    },
    bsbCode: {
      type: String,
      required: true,
      match: /^\d{3}-\d{3}$/,
    },
    bsbLast3: {
      type: String,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    bankName: String,
    accountType: {
      type: String,
      enum: ['savings', 'cheque'],
      default: 'savings',
    },
  },
  {
    timestamps: true,
    collection: 'employee_bank_details',
  }
)

// One bank details record per employee per tenant
employeeBankDetailsSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true })

export const EmployeeBankDetails =
  (mongoose.models.EmployeeBankDetails as mongoose.Model<IEmployeeBankDetails>) ??
  mongoose.model<IEmployeeBankDetails>('EmployeeBankDetails', employeeBankDetailsSchema)

export default EmployeeBankDetails
