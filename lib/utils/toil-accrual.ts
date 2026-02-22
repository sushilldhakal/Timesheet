import TOILBalance from "@/lib/db/schemas/toil-balance";
import { ResolvedConditions } from "./award-resolver";
import mongoose from "mongoose";

export interface ToilAccrualResult {
  success: boolean;
  hoursAccrued: number;
  newBalance: number;
  message: string;
  atMaximum: boolean;
}

/**
 * Accrue TOIL for an employee based on hours worked
 */
export async function accrueToil(
  employeeId: string,
  pin: string,
  organisationId: string,
  weeklyHours: number,
  conditions: ResolvedConditions | null,
  accrualDate: Date = new Date()
): Promise<ToilAccrualResult> {
  // Check if TOIL rules are configured
  if (!conditions || !conditions.toilRule) {
    return {
      success: false,
      hoursAccrued: 0,
      newBalance: 0,
      message: "No TOIL rules configured for this employee",
      atMaximum: false,
    };
  }

  const toilRule = conditions.toilRule;

  // Fix: Check if weeklyThresholdHours === undefined (not just falsy) to correctly handle threshold of zero
  if (toilRule.weeklyThresholdHours === undefined) {
    return {
      success: false,
      hoursAccrued: 0,
      newBalance: 0,
      message: "TOIL threshold not configured",
      atMaximum: false,
    };
  }

  // Check if hours exceed threshold
  if (weeklyHours <= toilRule.weeklyThresholdHours) {
    return {
      success: false,
      hoursAccrued: 0,
      newBalance: 0,
      message: `Hours (${weeklyHours}) do not exceed threshold (${toilRule.weeklyThresholdHours})`,
      atMaximum: false,
    };
  }

  // Calculate TOIL hours with multiplier
  const overtimeHours = weeklyHours - toilRule.weeklyThresholdHours;
  const hoursAccrued = overtimeHours * toilRule.accrualMultiplier;

  // Get or create TOIL balance document
  const year = accrualDate.getFullYear();
  let toilBalance = await TOILBalance.findOne({
    employeeId: new mongoose.Types.ObjectId(employeeId),
    year,
  });

  if (!toilBalance) {
    toilBalance = new TOILBalance({
      organisationId: new mongoose.Types.ObjectId(organisationId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      pin,
      year,
      entries: [],
      totalBalance: 0,
    });
  }

  // Check maximum balance limit
  if (
    toilRule.maxBalanceHours !== null &&
    toilBalance.totalBalance >= toilRule.maxBalanceHours
  ) {
    return {
      success: false,
      hoursAccrued: 0,
      newBalance: toilBalance.totalBalance,
      message: `Maximum TOIL balance of ${toilRule.maxBalanceHours} hours reached`,
      atMaximum: true,
    };
  }

  // Calculate expiry date
  let expiryDate: Date | null = null;
  if (toilRule.expiryWeeks !== null) {
    expiryDate = new Date(accrualDate);
    expiryDate.setDate(expiryDate.getDate() + toilRule.expiryWeeks * 7);
  }

  // Add TOIL entry
  toilBalance.entries.push({
    accrualDate,
    hoursAccrued,
    hoursUsed: 0,
    hoursExpired: 0,
    expiryDate,
    status: "active",
  });

  // Update total balance
  toilBalance.totalBalance += hoursAccrued;

  // Cap at maximum if specified
  if (
    toilRule.maxBalanceHours !== null &&
    toilBalance.totalBalance > toilRule.maxBalanceHours
  ) {
    const excess = toilBalance.totalBalance - toilRule.maxBalanceHours;
    toilBalance.totalBalance = toilRule.maxBalanceHours;
    // Adjust the last entry
    const lastEntry = toilBalance.entries[toilBalance.entries.length - 1];
    lastEntry.hoursAccrued -= excess;
  }

  await toilBalance.save();

  return {
    success: true,
    hoursAccrued,
    newBalance: toilBalance.totalBalance,
    message: `Accrued ${hoursAccrued.toFixed(2)} hours of TOIL`,
    atMaximum:
      toilRule.maxBalanceHours !== null &&
      toilBalance.totalBalance >= toilRule.maxBalanceHours,
  };
}
