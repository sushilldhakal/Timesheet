import mongoose from 'mongoose'

export interface IEmployeeContract {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  startDate: Date
  endDate?: Date | null
  contractType: 'permanent' | 'fixed-term' | 'casual' | 'contractor'
  noticePeriod?: number
  probationPeriodEnd?: Date
  contractTermsUrl?: string
  salary?: number
  wageType: 'salary' | 'hourly' | 'piecework'
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const employeeContractSchema = new mongoose.Schema<IEmployeeContract>(
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    contractType: {
      type: String,
      enum: ['permanent', 'fixed-term', 'casual', 'contractor'],
      required: true,
    },
    noticePeriod: {
      type: Number,
      default: 2,
    },
    probationPeriodEnd: Date,
    contractTermsUrl: String,
    salary: Number,
    wageType: {
      type: String,
      enum: ['salary', 'hourly', 'piecework'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'employee_contracts',
  }
)

employeeContractSchema.index({ isActive: 1, startDate: 1 })
// Contracts are scoped per tenant
employeeContractSchema.index({ tenantId: 1, employeeId: 1 })

export const EmployeeContract =
  (mongoose.models.EmployeeContract as mongoose.Model<IEmployeeContract>) ??
  mongoose.model<IEmployeeContract>('EmployeeContract', employeeContractSchema)

export default EmployeeContract
