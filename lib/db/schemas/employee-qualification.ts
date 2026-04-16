import mongoose from 'mongoose'

export interface IEmployeeQualification {
  employeeId: mongoose.Types.ObjectId
  /** New ref to master Qualification (preferred). */
  qualificationId?: mongoose.Types.ObjectId
  /** Legacy field (kept for backward compatibility). */
  qualificationName: string
  issuingBody: string
  issueDate: Date
  expiryDate?: Date
  licenseNumber?: string
  status: 'current' | 'expired' | 'pending'
  documentUrl?: string
  createdAt?: Date
  updatedAt?: Date
}

const employeeQualificationSchema = new mongoose.Schema<IEmployeeQualification>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    qualificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Qualification',
      default: undefined,
      index: true,
    },
    qualificationName: {
      type: String,
      required: function (this: IEmployeeQualification) {
        return !this.qualificationId
      },
    },
    issuingBody: {
      type: String,
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: Date,
    licenseNumber: String,
    status: {
      type: String,
      enum: ['current', 'expired', 'pending'],
      default: 'current',
    },
    documentUrl: String,
  },
  {
    timestamps: true,
    collection: 'employee_qualifications',
  }
)

employeeQualificationSchema.index({ expiryDate: 1 }, { sparse: true })
employeeQualificationSchema.index(
  { employeeId: 1, qualificationId: 1 },
  { unique: true, sparse: true }
)

export const EmployeeQualification =
  (mongoose.models.EmployeeQualification as mongoose.Model<IEmployeeQualification>) ??
  mongoose.model<IEmployeeQualification>('EmployeeQualification', employeeQualificationSchema)

export default EmployeeQualification
