import mongoose, { Schema, Document } from "mongoose";

// ─── Award Level Rate Interface ──────────────────────────
export interface IAwardLevelRate {
  level: string; // e.g., 'level_1', 'level_2', etc.
  employmentType: string; // 'casual', 'part_time', 'full_time'
  hourlyRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date; // null for current rates
}

// ─── Award Tag Interface (Simple) ─────────────────────────
export interface IAwardTag {
  _id?: string;
  name: string;
}

// ─── Rule Conditions Interface (Enhanced) ─────────────────
export interface IRuleConditions {
  // Time-based conditions
  daysOfWeek?: string[];
  timeRange?: {
    start: number;
    end: number;
  };
  
  // Hours-based conditions
  minHoursWorked?: number;
  afterHoursWorked?: number;
  afterOvertimeHours?: number;
  weeklyHoursThreshold?: number;
  
  // Roster-based conditions
  outsideRoster?: boolean;
  rosterVariance?: {
    maxMinutesEarly?: number;
    maxMinutesLate?: number;
  };
  
  // Employment conditions
  employmentTypes?: string[];
  
  // Award tag conditions (CRITICAL)
  requiredTags?: string[];
  excludedTags?: string[];
  
  // Special conditions
  isPublicHoliday?: boolean;
  isFirstShift?: boolean;
  isConsecutiveShift?: boolean;
  
  // Custom conditions
  customConditions?: Record<string, any>;
}

// ─── Rule Outcome Interfaces (Updated with exportName) ────
export interface IOrdinaryOutcome {
  type: "ordinary";
  multiplier: number;
  exportName: string;
  description?: string;
}

export interface IOvertimeOutcome {
  type: "overtime";
  multiplier: number;
  exportName: string;
  description?: string;
}

export interface IAllowanceOutcome {
  type: "allowance";
  flatRate: number;
  currency: string;
  exportName: string;
  description?: string;
}

export interface IToilOutcome {
  type: "toil";
  accrualMultiplier: number;
  maxBalance?: number;
  expiryDays?: number;
  exportName: string;
  description?: string;
}

export interface IBreakOutcome {
  type: "break";
  durationMinutes: number;
  isPaid: boolean;
  isAutomatic: boolean;
  exportName: string;
  description?: string;
}

export interface ILeaveOutcome {
  type: "leave";
  accrualRate: number;
  leaveType: string;
  exportName: string;
  description?: string;
}

export type IRuleOutcome = IOrdinaryOutcome | IOvertimeOutcome | IAllowanceOutcome | IToilOutcome | IBreakOutcome | ILeaveOutcome;

// ─── Award Rule Interface (Enhanced) ──────────────────────
export interface IAwardRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  canStack: boolean;
  conditions: IRuleConditions;
  outcome: IRuleOutcome;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Time Segment Interface ───────────────────────────────
export interface ITimeSegment {
  startTime: Date;
  endTime: Date;
  ruleId: string;
  ruleName: string;
  outcome: IRuleOutcome;
  durationMinutes: number;
}

// ─── Award Interface (Enhanced) ───────────────────────────
export interface IAward extends Document {
  name: string;
  description?: string;
  rules: IAwardRule[];
  /** New tag reference list (preferred). */
  awardTagIds?: mongoose.Types.ObjectId[];
  /** Legacy embedded tags (kept for backward compatibility / migration). */
  availableTags?: IAwardTag[];
  levelRates: IAwardLevelRate[];
  isActive: boolean;

  // Versioning fields
  version: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  changelog?: string;

  // Audit trail
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  evaluateRules(context: {
    employeeId: string;
    employmentType: string;
    startTime: Date;
    endTime: Date;
    awardTags: string[];
    rosteredStart?: Date;
    rosteredEnd?: Date;
    isPublicHoliday: boolean;
    weeklyHoursWorked: number;
    dailyHoursWorked: number;
    consecutiveShifts: number;
  }): IAwardRule[];
}

// ─── Schemas ──────────────────────────────────────────────

const AwardTagSchema = new Schema<IAwardTag>(
  {
    name: { 
      type: String, 
      required: true
    },
  },
  { _id: false }
);

const AwardLevelRateSchema = new Schema<IAwardLevelRate>(
  {
    level: { type: String, required: true },
    employmentType: { 
      type: String, 
      enum: ['casual', 'part_time', 'full_time'], 
      required: true 
    },
    hourlyRate: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
  },
  { _id: false }
);

const RuleConditionsSchema = new Schema<IRuleConditions>(
  {
    // Time-based conditions
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeRange: {
      start: { type: Number, min: 0, max: 23 },
      end: { type: Number, min: 0, max: 23 },
    },
    
    // Hours-based conditions
    minHoursWorked: { type: Number, min: 0 },
    afterHoursWorked: { type: Number, min: 0 },
    afterOvertimeHours: { type: Number, min: 0 },
    weeklyHoursThreshold: { type: Number, min: 0 },
    
    // Roster-based conditions
    outsideRoster: { type: Boolean },
    rosterVariance: {
      maxMinutesEarly: { type: Number, min: 0 },
      maxMinutesLate: { type: Number, min: 0 },
    },
    
    // Employment conditions
    employmentTypes: [{ type: String }],
    
    // Award tag conditions
    requiredTags: [{ type: String }],
    excludedTags: [{ type: String }],
    
    // Special conditions
    isPublicHoliday: { type: Boolean },
    isFirstShift: { type: Boolean },
    isConsecutiveShift: { type: Boolean },
    
    // Custom conditions
    customConditions: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const RuleOutcomeSchema = new Schema<IRuleOutcome>(
  {
    type: { 
      type: String, 
      enum: ['ordinary', 'overtime', 'allowance', 'toil', 'break', 'leave'], 
      required: true 
    },
    // Fields for different outcome types (discriminated union in TypeScript)
    multiplier: { type: Number, min: 0 },
    flatRate: { type: Number, min: 0 },
    currency: { type: String, default: 'AUD' },
    accrualMultiplier: { type: Number, min: 0 },
    maxBalance: { type: Number, min: 0 },
    expiryDays: { type: Number, min: 0 },
    durationMinutes: { type: Number, min: 0 },
    isPaid: { type: Boolean },
    isAutomatic: { type: Boolean, default: true },
    accrualRate: { type: Number, min: 0 },
    leaveType: { type: String },
    exportName: { type: String, required: true }, // Required for all outcomes
    description: { type: String },
  },
  { _id: false }
);

const AwardRuleSchema = new Schema<IAwardRule>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    canStack: { type: Boolean, default: false },
    conditions: { type: RuleConditionsSchema, required: true },
    outcome: { type: RuleOutcomeSchema, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AwardSchema = new Schema<IAward>(
  {
    name: { type: String, required: true },
    description: { type: String },
    rules: [AwardRuleSchema],
    awardTagIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "AwardTag",
      },
    ],
    // Legacy embedded tags (migration source)
    availableTags: { type: [AwardTagSchema], default: undefined },
    levelRates: [AwardLevelRateSchema],
    isActive: { type: Boolean, default: true },

    // Versioning
    version: { type: String, required: true, default: '1.0.0' },
    effectiveFrom: { type: Date, required: true, default: () => new Date() },
    effectiveTo: { type: Date, default: null },
    changelog: { type: String },

    // Audit trail
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Create indexes for efficient querying
AwardSchema.index({ name: 1 }, { unique: true });
AwardSchema.index({ isActive: 1 });
AwardSchema.index({ "rules.conditions.daysOfWeek": 1 });
AwardSchema.index({ "rules.conditions.employmentTypes": 1 });
AwardSchema.index({ "rules.priority": -1 });
AwardSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
AwardSchema.index({ awardTagIds: 1 });

// Instance method for rule evaluation (basic version - full logic in AwardEngine)
AwardSchema.methods.evaluateRules = function(context: {
  employeeId: string;
  employmentType: string;
  startTime: Date;
  endTime: Date;
  awardTags: string[];
  rosteredStart?: Date;
  rosteredEnd?: Date;
  isPublicHoliday: boolean;
  weeklyHoursWorked: number;
  dailyHoursWorked: number;
  consecutiveShifts: number;
}) {
  // Basic filtering - full logic should use AwardEngine class
  return this.rules.filter((rule: IAwardRule) => {
    if (!rule.isActive) return false;
    
    // Basic employment type check
    if (rule.conditions.employmentTypes && 
        !rule.conditions.employmentTypes.includes(context.employmentType)) {
      return false;
    }
    
    // Basic tag checks
    if (rule.conditions.requiredTags) {
      const hasAllRequired = rule.conditions.requiredTags.every(tag => 
        context.awardTags.includes(tag)
      );
      if (!hasAllRequired) return false;
    }
    
    if (rule.conditions.excludedTags) {
      const hasExcluded = rule.conditions.excludedTags.some(tag => 
        context.awardTags.includes(tag)
      );
      if (hasExcluded) return false;
    }
    
    return true;
  }).sort((a: IAwardRule, b: IAwardRule) => b.priority - a.priority);
};

export const Award =
  (mongoose.models.Award as mongoose.Model<IAward> | undefined) ??
  mongoose.model<IAward>("Award", AwardSchema);

export default Award;
