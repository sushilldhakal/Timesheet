import { z } from 'zod';

// Break Rule Schema
export const breakRuleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  minHours: z.number().min(0, 'Min hours must be positive'),
  maxHours: z.number().min(0, 'Max hours must be positive'),
  breakDurationMinutes: z.number().min(0, 'Break duration must be positive'),
  isPaid: z.boolean(),
});

export type BreakRule = z.infer<typeof breakRuleSchema>;

// Pay Rule Schema
export const payRuleSchema = z.object({
  type: z.enum(['hourly', 'salary']),
  hourlyRate: z.number().optional(),
  annualSalary: z.number().optional(),
  standardHoursPerWeek: z.number().optional(),
  currency: z.string(),
});

export type PayRule = z.infer<typeof payRuleSchema>;

// Penalty Rule Schema with transform to strip irrelevant fields
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
}).transform((data) => {
  // Strip fields not relevant to the trigger type
  const base = {
    id: data.id,
    label: data.label,
    triggerType: data.triggerType,
    rateType: data.rateType,
    rateValue: data.rateValue,
    isStackable: data.isStackable,
  };

  if (data.triggerType === 'overtime_hours') {
    return { ...base, thresholdHours: data.thresholdHours };
  } else if (data.triggerType === 'time_of_day') {
    return { ...base, startHour: data.startHour, endHour: data.endHour };
  } else if (data.triggerType === 'day_of_week') {
    return { ...base, daysOfWeek: data.daysOfWeek };
  } else if (data.triggerType === 'public_holiday') {
    return base;
  }

  return data;
});

export type PenaltyRule = z.infer<typeof penaltyRuleSchema>;

// Leave Entitlement Schema
export const leaveEntitlementSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  daysPerYear: z.number().min(0, 'Days per year must be positive'),
  accrualMethod: z.enum(['progressive', 'upfront']),
  carryOver: z.boolean(),
  loadingPercentage: z.number().min(0),
  payRate: z.number().min(0).max(200),
});

export type LeaveEntitlement = z.infer<typeof leaveEntitlementSchema>;

// TOIL Config Schema
export const toilConfigSchema = z.object({
  weeklyThresholdHours: z.number().optional(),
  accrualMultiplier: z.number().optional(),
  maxBalanceHours: z.number().optional(),
  expiryWeeks: z.number().optional(),
  isPaidOut: z.boolean(),
});

export type TOILConfig = z.infer<typeof toilConfigSchema>;
