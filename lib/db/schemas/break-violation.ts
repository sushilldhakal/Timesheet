import mongoose from "mongoose"

export interface IBreakViolation {
  tenantId: mongoose.Types.ObjectId
  shiftId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  ruleId: mongoose.Types.ObjectId
  missedBreakMinutes: number
  requiredBreakMinutes: number
  actualBreakMinutes: number
  detectedAt: Date
  isResolved: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IBreakViolationDocument extends IBreakViolation, mongoose.Document {}

const breakViolationSchema = new mongoose.Schema<IBreakViolationDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyShift",
      required: true,
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
    missedBreakMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    requiredBreakMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    actualBreakMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    detectedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "break_violations",
  }
)

breakViolationSchema.index({ tenantId: 1, shiftId: 1 })
breakViolationSchema.index({ tenantId: 1, employeeId: 1, detectedAt: -1 })

export const BreakViolation =
  (mongoose.models.BreakViolation as mongoose.Model<IBreakViolationDocument>) ??
  mongoose.model<IBreakViolationDocument>("BreakViolation", breakViolationSchema)
