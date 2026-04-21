import mongoose from 'mongoose'

export interface IEmployeeCompliance {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  workRightsType?: 'au_citizen' | 'au_resident' | 'visa_holder' | 'unknown'
  australianIdType?: 'drivers_licence' | 'medicare' | 'passport' | null
  australianIdNumber?: string | null
  visaType?: string | null
  visaNumber?: string | null
  maxHoursPerFortnight?: number | null  // for student visa rostering limits
  workRightsStatus?: 'unverified' | 'verified' | 'failed'
  workRightsLastCheckedAt?: Date | null
  wwcStatus?: 'not_required' | 'pending' | 'active' | 'expired'
  wwcNumber?: string
  wwcExpiryDate?: Date
  policeClearanceStatus?: 'pending' | 'active' | 'expired'
  policeClearanceNumber?: string
  policeClearanceExpiryDate?: Date
  foodHandlingStatus?: 'current' | 'expired'
  foodHandlingExpiryDate?: Date
  healthSafetyCertifications?: string[]
  inductionCompleted: boolean
  inductionDate?: Date
  inductionDocUrl?: string
  codeOfConductSigned: boolean
  codeOfConductDate?: Date
  codeOfConductDocUrl?: string
  lastComplianceCheckDate?: Date
  createdAt?: Date
  updatedAt?: Date
}

const employeeComplianceSchema = new mongoose.Schema<IEmployeeCompliance>(
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
    workRightsType: {
      type: String,
      enum: ['au_citizen', 'au_resident', 'visa_holder', 'unknown'],
      default: 'unknown',
    },
    australianIdType: {
      type: String,
      enum: ['drivers_licence', 'medicare', 'passport'],
      default: null,
    },
    australianIdNumber: { type: String, default: null },
    visaType: { type: String, default: null },
    visaNumber: { type: String, default: null },
    maxHoursPerFortnight: { type: Number, default: null },
    workRightsStatus: {
      type: String,
      enum: ['unverified', 'verified', 'failed'],
      default: 'unverified',
    },
    workRightsLastCheckedAt: { type: Date, default: null },
    wwcStatus: {
      type: String,
      enum: ['not_required', 'pending', 'active', 'expired'],
      default: 'not_required',
    },
    wwcNumber: String,
    wwcExpiryDate: Date,
    policeClearanceStatus: {
      type: String,
      enum: ['pending', 'active', 'expired'],
    },
    policeClearanceNumber: String,
    policeClearanceExpiryDate: Date,
    foodHandlingStatus: {
      type: String,
      enum: ['current', 'expired'],
    },
    foodHandlingExpiryDate: Date,
    healthSafetyCertifications: [String],
    inductionCompleted: {
      type: Boolean,
      default: false,
    },
    inductionDate: Date,
    inductionDocUrl: String,
    codeOfConductSigned: {
      type: Boolean,
      default: false,
    },
    codeOfConductDate: Date,
    codeOfConductDocUrl: String,
    lastComplianceCheckDate: Date,
  },
  {
    timestamps: true,
    collection: 'employee_compliance',
  }
)

employeeComplianceSchema.index({ wwcStatus: 1 })
employeeComplianceSchema.index({ wwcExpiryDate: 1 }, { sparse: true })
employeeComplianceSchema.index({ policeClearanceExpiryDate: 1 }, { sparse: true })
// One compliance record per employee per tenant
employeeComplianceSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true })

export const EmployeeCompliance =
  (mongoose.models.EmployeeCompliance as mongoose.Model<IEmployeeCompliance>) ??
  mongoose.model<IEmployeeCompliance>('EmployeeCompliance', employeeComplianceSchema)

export default EmployeeCompliance
