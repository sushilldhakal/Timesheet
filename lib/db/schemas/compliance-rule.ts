import mongoose from "mongoose"

export type ComplianceRuleType = "REST_PERIOD" | "CONSECUTIVE_DAYS" | "MAX_HOURS" | "BREAK_REQUIREMENT"

export interface IComplianceBreakRule {
  minShiftHours: number
  requiredBreakMinutes: number
}

export interface IComplianceRule {
  _id: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  name: string
  ruleType: ComplianceRuleType
  
  // Rest period rules
  minRestHoursBetweenShifts?: number | null
  
  // Consecutive days rules
  maxConsecutiveDays?: number | null
  
  // Hours limits
  maxHoursPerWeek?: number | null
  maxHoursPerFortnight?: number | null
  
  // Break requirements
  breakRules: IComplianceBreakRule[]
  
  // Enforcement
  blockPublishOnViolation: boolean
  isActive: boolean
  
  createdAt: Date
  updatedAt: Date
}

export interface IComplianceRuleDocument extends IComplianceRule, mongoose.Document {}

const BreakRuleSchema = new mongoose.Schema<IComplianceBreakRule>(
  {
    minShiftHours: { type: Number, required: true, min: 0 },
    requiredBreakMinutes: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const complianceRuleSchema = new mongoose.Schema<IComplianceRuleDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ruleType: {
      type: String,
      enum: ["REST_PERIOD", "CONSECUTIVE_DAYS", "MAX_HOURS", "BREAK_REQUIREMENT"],
      required: true,
    },
    minRestHoursBetweenShifts: {
      type: Number,
      default: null,
      min: 0,
    },
    maxConsecutiveDays: {
      type: Number,
      default: null,
      min: 1,
    },
    maxHoursPerWeek: {
      type: Number,
      default: null,
      min: 0,
    },
    maxHoursPerFortnight: {
      type: Number,
      default: null,
      min: 0,
    },
    breakRules: {
      type: [BreakRuleSchema],
      default: [],
    },
    blockPublishOnViolation: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "compliance_rules",
  }
)

// Indexes
complianceRuleSchema.index({ tenantId: 1, ruleType: 1 })
complianceRuleSchema.index({ tenantId: 1, isActive: 1 })

export const ComplianceRule =
  (mongoose.models.ComplianceRule as mongoose.Model<IComplianceRuleDocument>) ??
  mongoose.model<IComplianceRuleDocument>("ComplianceRule", complianceRuleSchema)
