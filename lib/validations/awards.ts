import { z } from 'zod';

// ─── Award Tags Schema (Simple) ───────────────────────────
export const awardTagSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1), // Simple string name, no enum restrictions
  description: z.string().optional(),
  overridesBehavior: z.enum(['modify', 'override', 'stack']).optional(),
})

export type AwardTag = z.infer<typeof awardTagSchema>

// ─── Rule Conditions Schema (Enhanced for Specificity) ────
export const ruleConditionsSchema = z.object({
  // Time-based conditions (more specific = higher priority)
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  timeRange: z.object({
    start: z.number().min(0).max(23),
    end: z.number().min(0).max(23),
  }).optional(),
  
  // Hours-based conditions (cumulative specificity)
  minHoursWorked: z.number().min(0).optional(), // Daily minimum
  afterHoursWorked: z.number().min(0).optional(), // Daily threshold (e.g., after 8 hours)
  afterOvertimeHours: z.number().min(0).optional(), // Overtime threshold (e.g., after 3 hours of OT)
  weeklyHoursThreshold: z.number().min(0).optional(), // Weekly threshold (e.g., after 38 hours)
  
  // Roster-based conditions
  outsideRoster: z.boolean().optional(), // Working outside rostered hours
  rosterVariance: z.object({
    maxMinutesEarly: z.number().optional(),
    maxMinutesLate: z.number().optional(),
  }).optional(),
  
  // Employment conditions
  employmentTypes: z.array(z.string()).optional(), // ['casual', 'full_time', 'part_time']
  
  // Award tag conditions (CRITICAL for overrides)
  requiredTags: z.array(z.string()).optional(), // Rule only applies if these tags present
  excludedTags: z.array(z.string()).optional(), // Rule doesn't apply if these tags present
  
  // Special conditions
  isPublicHoliday: z.boolean().optional(),
  isFirstShift: z.boolean().optional(), // First shift of day/week
  isConsecutiveShift: z.boolean().optional(), // Back-to-back shifts
  
  // Custom conditions for extensibility
  customConditions: z.record(z.string(), z.any()).optional(),
});

export type RuleConditions = z.infer<typeof ruleConditionsSchema>;

// ─── Rule Outcomes Schema ─────────────────────────────────
export const ruleOutcomeSchema = z.discriminatedUnion('type', [
  // Ordinary time
  z.object({
    type: z.literal('ordinary'),
    multiplier: z.number().min(0).default(1.0),
    exportName: z.string().min(1), // e.g. "ORD 1x"
    description: z.string().optional(),
  }),
  
  // Overtime rates
  z.object({
    type: z.literal('overtime'),
    multiplier: z.number().min(1.0), // Must be >= 1.0 for overtime
    exportName: z.string().min(1), // e.g. "OT 1.5x", "OT 2x"
    description: z.string().optional(),
  }),
  
  // Allowances (flat rates)
  z.object({
    type: z.literal('allowance'),
    flatRate: z.number().min(0),
    currency: z.string().default('AUD'),
    exportName: z.string().min(1), // e.g. "ALLOW-NIGHT", "ALLOW-SHIFT"
    description: z.string().optional(),
  }),
  
  // TOIL accrual
  z.object({
    type: z.literal('toil'),
    accrualMultiplier: z.number().min(0).default(1.0), // 1.0 = 1:1, 1.5 = 1.5 hours TOIL per hour worked
    maxBalance: z.number().min(0).optional(),
    expiryDays: z.number().min(0).optional(),
    exportName: z.string().min(1), // e.g. "TOIL 1.5x"
    description: z.string().optional(),
  }),
  
  // Break entitlements
  z.object({
    type: z.literal('break'),
    durationMinutes: z.number().min(0),
    isPaid: z.boolean(),
    isAutomatic: z.boolean().default(true),
    exportName: z.string().min(1), // e.g. "BREAK-MEAL", "BREAK-REST"
    description: z.string().optional(),
  }),
  
  // Leave accrual
  z.object({
    type: z.literal('leave'),
    accrualRate: z.number().min(0), // Hours of leave per hour worked
    leaveType: z.string(), // 'annual', 'sick', 'personal'
    exportName: z.string().min(1), // e.g. "LEAVE-ANNUAL", "LEAVE-SICK"
    description: z.string().optional(),
  }),
]);

export type RuleOutcome = z.infer<typeof ruleOutcomeSchema>;

// ─── Award Rule Schema (Enhanced) ─────────────────────────
export const awardRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  
  // Rule priority (higher = more important, but specificity trumps priority)
  priority: z.number().default(0),
  
  // Rule behavior
  isActive: z.boolean().default(true),
  canStack: z.boolean().default(false), // Can this rule apply alongside others?
  
  // When this rule applies (the more conditions, the more specific)
  conditions: ruleConditionsSchema,
  
  // What this rule does
  outcome: ruleOutcomeSchema,
  
  // Metadata
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AwardRule = z.infer<typeof awardRuleSchema>;

// ─── Award Level Rate Schema ───────────────────────────────
export const awardLevelRateSchema = z.object({
  level: z.string().min(1, 'Level name is required'),
  employmentType: z.enum(['casual', 'part_time', 'full_time']),
  hourlyRate: z.number().min(0, 'Rate must be positive'),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
});

export type AwardLevelRate = z.infer<typeof awardLevelRateSchema>;

// ─── Award Schema (Proper Structure) ──────────────────────
export const awardSchema = z.object({
  name: z.string().min(1, 'Award name is required'),
  description: z.string().optional(),
  
  // Foundation: base hourly rates per level and employment type
  levelRates: z.array(awardLevelRateSchema).default([]),
  
  // The rule engine
  rules: z.array(awardRuleSchema).default([]),
  
  // Available award tags for this award
  availableTags: z.array(awardTagSchema).default([]),
  
  // Award metadata
  isActive: z.boolean().default(true),
  version: z.string().default('1.0.0'),
  
  // Timestamps
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Award = z.infer<typeof awardSchema>;

// ─── Time Segment Schema (For Pay Calculation) ────────────
export const timeSegmentSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  ruleId: z.string(),
  ruleName: z.string(),
  outcome: ruleOutcomeSchema,
  durationMinutes: z.number().min(0),
});

export type TimeSegment = z.infer<typeof timeSegmentSchema>;

// ─── Shift Processing Context ─────────────────────────────
export const shiftContextSchema = z.object({
  employeeId: z.string(),
  employmentType: z.string(), // 'casual', 'full_time', 'part_time'
  baseRate: z.number().min(0), // Employee's hourly rate for cost calculation
  startTime: z.date(),
  endTime: z.date(),
  // Calendar date of the shift (YYYY-MM-DD string). Used for timezone-safe
  // day-of-week and time-range evaluation. When absent, falls back to startTime.
  shiftDate: z.string().optional(),

  // Award tags applied to this shift (CRITICAL)
  awardTags: z.array(z.string()).default([]),

  // Roster information
  rosteredStart: z.date().optional(),
  rosteredEnd: z.date().optional(),

  // Context for rule evaluation
  isPublicHoliday: z.boolean().default(false),
  weeklyHoursWorked: z.number().min(0).default(0), // Hours worked this week so far
  dailyHoursWorked: z.number().min(0).default(0), // Hours worked today so far
  consecutiveShifts: z.number().min(0).default(0), // Number of consecutive shifts

  // Break information
  breaks: z.array(z.object({
    startTime: z.date(),
    endTime: z.date(),
    isPaid: z.boolean(),
  })).default([]),
});

export type ShiftContext = z.infer<typeof shiftContextSchema>;

// ─── Award Engine Result (Tanda-style line items) ─────────
export const payLineItemSchema = z.object({
  units: z.number(), // Hours worked for this line item
  from: z.date(), // Start time of this segment
  to: z.date(), // End time of this segment
  name: z.string(), // Human readable name (e.g. "Daily Overtime")
  exportName: z.string(), // Export code for payroll (e.g. "OT 1.5x")
  ordinaryHours: z.number(), // Ordinary hours component
  cost: z.number(), // Dollar amount (units * rate * multiplier)
  baseRate: z.number(), // Base hourly rate used
  multiplier: z.number().optional(), // Rate multiplier (1.5, 2.0, etc.)
  ruleId: z.string().optional(), // Which rule generated this line
})

export type PayLineItem = z.infer<typeof payLineItemSchema>

export const awardEngineResultSchema = z.object({
  payLines: z.array(payLineItemSchema), // Per-line-item output matching Tanda
  totalCost: z.number(), // Sum of all line item costs
  totalHours: z.number(), // Sum of all line item units
  breakEntitlements: z.array(z.object({
    startTime: z.date(),
    durationMinutes: z.number(),
    isPaid: z.boolean(),
    name: z.string(),
    exportName: z.string(),
  })),
  leaveAccruals: z.array(z.object({
    type: z.string(),
    hoursAccrued: z.number(),
    exportName: z.string(),
  })),
});

export type AwardEngineResult = z.infer<typeof awardEngineResultSchema>;

// ─── Legacy Schemas (Backward Compatibility) ──────────────
export const breakRuleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  minHours: z.number().min(0, 'Min hours must be positive'),
  maxHours: z.number().min(0, 'Max hours must be positive'),
  breakDurationMinutes: z.number().min(0, 'Break duration must be positive'),
  isPaid: z.boolean(),
});

export const payRuleSchema = z.object({
  type: z.enum(['hourly', 'salary']),
  hourlyRate: z.number().optional(),
  annualSalary: z.number().optional(),
  standardHoursPerWeek: z.number().optional(),
  currency: z.string(),
});

export const penaltyRuleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  triggerType: z.enum(['overtime_hours', 'time_of_day', 'day_of_week', 'public_holiday']),
  thresholdHours: z.number().optional(),
  startHour: z.number().min(0).max(23).optional(),
  endHour: z.number().min(0).max(23).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  rateType: z.enum(['multiplier', 'flat_amount']),
  rateValue: z.number().min(0, 'Rate value must be positive'),
  isStackable: z.boolean(),
});

export const leaveEntitlementSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  daysPerYear: z.number().min(0, 'Days per year must be positive'),
  accrualMethod: z.enum(['progressive', 'upfront']),
  carryOver: z.boolean(),
  loadingPercentage: z.number().min(0),
  payRate: z.number().min(0).max(200),
});

export const toilConfigSchema = z.object({
  weeklyThresholdHours: z.number().optional(),
  accrualMultiplier: z.number().optional(),
  maxBalanceHours: z.number().optional(),
  expiryWeeks: z.number().optional(),
  isPaidOut: z.boolean(),
});

// Legacy type exports
export type BreakRule = z.infer<typeof breakRuleSchema>;
export type PayRule = z.infer<typeof payRuleSchema>;
export type PenaltyRule = z.infer<typeof penaltyRuleSchema>;
export type LeaveEntitlement = z.infer<typeof leaveEntitlementSchema>;
export type TOILConfig = z.infer<typeof toilConfigSchema>;

// ─── Form Schemas (for dialog components) ─────────────────
export const employmentTypeFormSchema = z.object({
  employmentType: z.string().min(1, "Employment type is required"),
});

export const levelFormSchema = z.object({
  label: z.string().min(1, "Level label is required"),
});

export type EmploymentTypeFormData = z.infer<typeof employmentTypeFormSchema>;
export type LevelFormData = z.infer<typeof levelFormSchema>;
