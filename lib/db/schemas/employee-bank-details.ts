import mongoose from 'mongoose'

export interface IEmployeeBankDetails {
  employeeId: mongoose.Types.ObjectId
  accountNumber: string
  bsbCode: string
  accountHolderName: string
  bankName?: string
  accountType?: 'savings' | 'cheque'
  createdAt?: Date
  updatedAt?: Date
}

const employeeBankDetailsSchema = new mongoose.Schema<IEmployeeBankDetails>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    bsbCode: {
      type: String,
      required: true,
      match: /^\d{3}-\d{3}$/,
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

export const EmployeeBankDetails =
  (mongoose.models.EmployeeBankDetails as mongoose.Model<IEmployeeBankDetails>) ??
  mongoose.model<IEmployeeBankDetails>('EmployeeBankDetails', employeeBankDetailsSchema)

export default EmployeeBankDetails
