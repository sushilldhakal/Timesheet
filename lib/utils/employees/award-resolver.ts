import Award, { IConditionSet } from "@/lib/db/schemas/award";
import { Employee } from "@/lib/db/schemas/employee";
import mongoose from "mongoose";

export interface ResolvedConditions extends IConditionSet {
  awardId: string;
  awardName: string;
  awardLevel: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  overridingRate: number | null;
}

// Simple in-memory cache for awards
const awardCache = new Map<string, { award: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get employee conditions for a specific date
 * Returns the active employment conditions including breaks, pay, penalties, leave, and TOIL rules
 */
export async function getEmployeeConditions(
  employeeId: string,
  date: Date = new Date()
): Promise<ResolvedConditions | null> {
  try {
    // Find employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return null;
    }

    // Find active pay condition for the given date
    const activeCondition = employee.payConditions?.find((pc) => {
      const effectiveFrom = new Date(pc.effectiveFrom);
      const effectiveTo = pc.effectiveTo ? new Date(pc.effectiveTo) : null;

      return (
        effectiveFrom <= date && (effectiveTo === null || effectiveTo >= date)
      );
    });

    if (!activeCondition) {
      return null;
    }

    // Get award from cache or database
    const awardId = activeCondition.awardId.toString();
    let award;

    const cached = awardCache.get(awardId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      award = cached.award;
    } else {
      award = await Award.findById(awardId);
      if (award) {
        awardCache.set(awardId, { award, timestamp: Date.now() });
      }
    }

    if (!award) {
      return null;
    }

    // Find the level
    const level = award.levels.find(
      (l: any) => l.label === activeCondition.awardLevel
    );
    if (!level) {
      return null;
    }

    // Find the employment type conditions
    const conditions = level.conditions.find(
      (c: any) => c.employmentType === activeCondition.employmentType
    );
    if (!conditions) {
      return null;
    }

    // Return flattened conditions with metadata
    const resolved: ResolvedConditions = {
      ...conditions.toObject(),
      awardId: award._id.toString(),
      awardName: award.name,
      awardLevel: activeCondition.awardLevel,
      effectiveFrom: activeCondition.effectiveFrom,
      effectiveTo: activeCondition.effectiveTo,
      overridingRate: activeCondition.overridingRate,
    };

    // Apply overriding rate if present
    if (activeCondition.overridingRate && resolved.payRule) {
      if (resolved.payRule.type === "hourly") {
        resolved.payRule.rate = activeCondition.overridingRate;
      } else if (resolved.payRule.type === "salary") {
        resolved.payRule.annualAmount = activeCondition.overridingRate;
      }
    }

    return resolved;
  } catch (error) {
    console.error("Error resolving employee conditions:", error);
    return null;
  }
}

/**
 * Clear the award cache (useful for testing or when awards are updated)
 */
export function clearAwardCache() {
  awardCache.clear();
}
