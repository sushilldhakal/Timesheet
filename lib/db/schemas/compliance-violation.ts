import mongoose from "mongoose"

export type ResolutionAction = "manual_override" | "shift_edited" | "auto_resolved"

export interface IComplianceViolation {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  ruleId: mongoose.Types.ObjectId
  shiftId?: mongoose.Types.ObjectId
  rosterShiftId?: string
  severity: "warning" | "breach"
  ruleType: string
  message: string
  detectedAt: Date
  resolvedAt?: Date
  resolutionAction?: ResolutionAction
  resolvedBy?: mongoose.Types.ObjectId
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IComplianceViolationDocument extends IComplianceViolation, mongoose.Document {}

const complianceViolationSchema = new mongoose.Schema<IComplianceViolationDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceRule",
      required: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyShift",
    },
    rosterShiftId: {
      type: String,
    },
    severity: {
      type: String,
      enum: ["warning", "breach"],
      required: true,
    },
    ruleType: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    detectedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    resolvedAt: {
      type: Date,
    },
    resolutionAction: {
      type: String,
      enum: ["manual_override", "shift_edited", "auto_resolved"],
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "compliance_violations",
  }
)

complianceViolationSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 })
complianceViolationSchema.index({ tenantId: 1, shiftId: 1 })
complianceViolationSchema.index({ tenantId: 1, detectedAt: -1 })
complianceViolationSchema.index({ tenantId: 1, ruleId: 1, isActive: 1 })

export const ComplianceViolation =
  (mongoose.models.ComplianceViolation as mongoose.Model<IComplianceViolationDocument>) ??
  mongoose.model<IComplianceViolationDocument>("ComplianceViolation", complianceViolationSchema)
