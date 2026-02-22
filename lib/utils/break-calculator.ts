import { IBreakRule } from "@/lib/db/schemas/award";
import { ResolvedConditions } from "./award-resolver";

export interface BreakCalculationResult {
  applicableBreaks: IBreakRule[];
  totalBreakMinutes: number;
  paidBreakMinutes: number;
  unpaidBreakMinutes: number;
  shouldApplyBreaks: boolean;
}

/**
 * Calculate required breaks for a shift based on hours worked and break policy
 */
export function calculateRequiredBreaks(
  conditions: ResolvedConditions | null,
  hoursWorked: number,
  hasPunchedBreaks: boolean = false
): BreakCalculationResult {
  const emptyResult: BreakCalculationResult = {
    applicableBreaks: [],
    totalBreakMinutes: 0,
    paidBreakMinutes: 0,
    unpaidBreakMinutes: 0,
    shouldApplyBreaks: false,
  };

  if (!conditions || !conditions.breakRules || conditions.breakRules.length === 0) {
    return emptyResult;
  }

  const breakPolicy = conditions.breakPolicy || "auto";

  // Handle breakPolicy 'never' - no automatic break calculation
  if (breakPolicy === "never") {
    return emptyResult;
  }

  // Handle breakPolicy 'auto' - only apply if employee didn't punch breaks
  if (breakPolicy === "auto" && hasPunchedBreaks) {
    return emptyResult;
  }

  // Handle breakPolicy 'always' - apply breaks regardless of punched breaks
  // (or 'auto' without punched breaks)

  // Filter break rules by minHours and maxHours
  const applicableBreaks = conditions.breakRules.filter((rule) => {
    // Must meet minimum hours
    if (hoursWorked < rule.minHours) {
      return false;
    }

    // If maxHours is null, no upper limit - rule applies to all shifts above minHours
    if (rule.maxHours === null) {
      return true;
    }

    // If maxHours is specified, must be within range
    return hoursWorked <= rule.maxHours;
  });

  // Calculate totals
  let totalBreakMinutes = 0;
  let paidBreakMinutes = 0;
  let unpaidBreakMinutes = 0;

  for (const breakRule of applicableBreaks) {
    totalBreakMinutes += breakRule.breakMinutes;
    if (breakRule.paid) {
      paidBreakMinutes += breakRule.breakMinutes;
    } else {
      unpaidBreakMinutes += breakRule.breakMinutes;
    }
  }

  return {
    applicableBreaks,
    totalBreakMinutes,
    paidBreakMinutes,
    unpaidBreakMinutes,
    shouldApplyBreaks: applicableBreaks.length > 0,
  };
}
