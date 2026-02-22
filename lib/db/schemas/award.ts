import mongoose, { Schema, Document } from "mongoose";

// ─── Break Rule ───────────────────────────────────────────
export interface IBreakRule {
  label: string;
  minHours: number;
  maxHours: number | null; // null = no upper limit
  breakMinutes: number;
  paid: boolean;
}

// ─── Pay Rule ─────────────────────────────────────────────
export interface IPayRule {
  type: "hourly" | "salary";
  rate?: number; // for hourly
  annualAmount?: number; // for salary
  currency: string;
  hoursPerWeek?: number | null; // for salary
}

// ─── Penalty Rule ─────────────────────────────────────────
export interface IPenaltyRule {
  label: string;
  triggerType: "overtime_hours" | "time_of_day" | "day_of_week" | "public_holiday" | "custom";
  thresholdHours?: number | null;
  startHour?: number | null;
  endHour?: number | null;
  days?: string[] | null; // Changed to string array for day names
  rateType: "multiplier" | "flat_amount";
  rateValue: number;
  stackable: boolean;
}

// ─── Leave Entitlement ────────────────────────────────────
export interface ILeaveEntitlement {
  label: string;
  daysPerYear: number;
  accrual: "progressive" | "upfront";
  carriesOver: boolean;
  payRate: number; // Changed to number (percentage: 100 = normal, 117.5 = loading, 0 = none)
  loadingPercent: number | null;
}

// ─── TOIL Rule ────────────────────────────────────────────
export interface IToilRule {
  weeklyThresholdHours: number;
  accrualMultiplier: number;
  maxBalanceHours: number | null;
  expiryWeeks: number | null;
  payoutOnExpiry: boolean;
}

// ─── Condition Set ────────────────────────────────────────
export interface IConditionSet {
  employmentType: string;
  breakPolicy: "auto" | "always" | "never";
  breakRules: IBreakRule[];
  payRule: IPayRule | null;
  penaltyRules: IPenaltyRule[];
  leaveEntitlements: ILeaveEntitlement[];
  toilRule: IToilRule | null;
}

// ─── Award Level ──────────────────────────────────────────
export interface IAwardLevel {
  label: string;
  conditions: IConditionSet[];
}

// ─── Award ────────────────────────────────────────────────
export interface IAward extends Document {
  name: string;
  description: string | null;
  isActive: boolean;
  levels: IAwardLevel[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schemas ──────────────────────────────────────────────

const BreakRuleSchema = new Schema<IBreakRule>(
  {
    label: { type: String, required: true },
    minHours: { type: Number, required: true },
    maxHours: { type: Number, default: null }, // optional, nullable
    breakMinutes: { type: Number, required: true },
    paid: { type: Boolean, required: true },
  },
  { _id: false }
);

// Validation: minHours < maxHours when maxHours is not null
BreakRuleSchema.pre("validate", function (next) {
  if (this.maxHours !== null && this.minHours >= this.maxHours) {
    return next(new Error("minHours must be less than maxHours"));
  }
  return next();
});

const PayRuleSchema = new Schema<IPayRule>(
  {
    type: { type: String, enum: ["hourly", "salary"], required: true },
    rate: { type: Number },
    annualAmount: { type: Number },
    currency: { type: String, required: true, default: "AUD" },
    hoursPerWeek: { type: Number, default: null },
  },
  { _id: false }
);

// Mongoose custom validator for type-based validation
PayRuleSchema.pre("validate", function (next) {
  if (this.type === "hourly") {
    if (!this.rate || this.rate <= 0) {
      return next(new Error("For hourly type, rate must be present and positive"));
    }
  } else if (this.type === "salary") {
    if (!this.annualAmount || this.annualAmount <= 0) {
      return next(new Error("For salary type, annualAmount must be present and positive"));
    }
    if (!this.hoursPerWeek || this.hoursPerWeek <= 0) {
      return next(new Error("For salary type, hoursPerWeek must be present and positive"));
    }
  }
  return next();
});

const PenaltyRuleSchema = new Schema<IPenaltyRule>(
  {
    label: { type: String, required: true },
    triggerType: {
      type: String,
      enum: ["overtime_hours", "time_of_day", "day_of_week", "public_holiday", "custom"],
      required: true,
    },
    thresholdHours: { type: Number, default: null },
    startHour: { type: Number, default: null },
    endHour: { type: Number, default: null },
    days: { type: [String], default: null }, // Changed to string array for day names
    rateType: { type: String, enum: ["multiplier", "flat_amount"], required: true },
    rateValue: { type: Number, required: true },
    stackable: { type: Boolean, default: true }, // default: true
  },
  { _id: false }
);

// Validation: startHour < endHour for time_of_day penalties
PenaltyRuleSchema.pre("validate", function (next) {
  if (this.triggerType === "time_of_day") {
    if (this.startHour !== undefined && this.startHour !== null && 
        this.endHour !== undefined && this.endHour !== null && 
        this.startHour >= this.endHour) {
      return next(new Error("startHour must be less than endHour for time_of_day penalties"));
    }
  }
  return next();
});

const LeaveEntitlementSchema = new Schema<ILeaveEntitlement>(
  {
    label: { type: String, required: true },
    daysPerYear: { type: Number, required: true },
    accrual: { type: String, enum: ["progressive", "upfront"], required: true },
    carriesOver: { type: Boolean, default: true },
    payRate: { type: Number, required: true, default: 100 }, // Changed to number (percentage)
    loadingPercent: { type: Number, default: null },
  },
  { _id: false }
);

const ToilRuleSchema = new Schema<IToilRule>(
  {
    weeklyThresholdHours: { type: Number, required: true },
    accrualMultiplier: { type: Number, default: 1 },
    maxBalanceHours: { type: Number, default: null },
    expiryWeeks: { type: Number, default: null },
    payoutOnExpiry: { type: Boolean, default: false },
  },
  { _id: false }
);

const ConditionSetSchema = new Schema<IConditionSet>(
  {
    employmentType: { type: String, required: true },
    breakPolicy: { type: String, enum: ["auto", "always", "never"], default: "auto" },
    breakRules: { type: [BreakRuleSchema], default: [] },
    payRule: { type: PayRuleSchema, default: null },
    penaltyRules: { type: [PenaltyRuleSchema], default: [] },
    leaveEntitlements: { type: [LeaveEntitlementSchema], default: [] },
    toilRule: { type: ToilRuleSchema, default: null },
  },
  { _id: false }
);

const AwardLevelSchema = new Schema<IAwardLevel>(
  {
    label: { type: String, required: true },
    conditions: { type: [ConditionSetSchema], default: [] },
  },
  { _id: false }
);

const AwardSchema = new Schema<IAward>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    levels: { type: [AwardLevelSchema], default: [] },
  },
  { timestamps: true }
);

// Create unique index on name only (awards are globally unique)
AwardSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Award || mongoose.model<IAward>("Award", AwardSchema);
