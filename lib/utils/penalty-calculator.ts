import { IPenaltyRule } from "@/lib/db/schemas/award";
import { ResolvedConditions } from "./award-resolver";

export interface ApplicablePenalty {
  label: string;
  triggerReason: string;
  rateType: "multiplier" | "flat_addition";
  rateValue: number;
  stackable: boolean;
  amount: number;
}

/**
 * Calculate applicable penalties for a shift
 */
export function calculateApplicablePenalties(
  conditions: ResolvedConditions | null,
  date: Date,
  startTime: string,
  endTime: string,
  hoursWorked: number,
  isPublicHoliday: boolean = false
): ApplicablePenalty[] {
  if (!conditions || !conditions.penaltyRules || conditions.penaltyRules.length === 0) {
    return [];
  }

  const applicablePenalties: ApplicablePenalty[] = [];
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const startHour = parseInt(startTime.split(":")[0]);
  const endHour = parseInt(endTime.split(":")[0]);

  for (const rule of conditions.penaltyRules) {
    let applies = false;
    let triggerReason = "";

    switch (rule.triggerType) {
      case "overtime":
        if (rule.thresholdHours !== undefined && rule.thresholdHours !== null && hoursWorked > rule.thresholdHours) {
          applies = true;
          triggerReason = `Overtime after ${rule.thresholdHours} hours`;
        }
        break;

      case "time_of_day":
        if (
          rule.startHour !== undefined &&
          rule.startHour !== null &&
          rule.endHour !== undefined &&
          rule.endHour !== null &&
          ((startHour >= rule.startHour && startHour < rule.endHour) ||
            (endHour > rule.startHour && endHour <= rule.endHour))
        ) {
          applies = true;
          triggerReason = `Time of day: ${rule.startHour}:00 - ${rule.endHour}:00`;
        }
        break;

      case "day_of_week":
        if (rule.days && rule.days.includes(dayOfWeek)) {
          applies = true;
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          triggerReason = `Day of week: ${dayNames[dayOfWeek]}`;
        }
        break;

      case "public_holiday":
        if (isPublicHoliday) {
          applies = true;
          triggerReason = "Public holiday";
        }
        break;

      case "custom":
        // Custom penalties would need additional logic
        break;
    }

    if (applies) {
      const baseRate = conditions.payRule?.rate || 0;
      const amount = calculatePenaltyAmount(rule, baseRate, hoursWorked);

      applicablePenalties.push({
        label: rule.label,
        triggerReason,
        rateType: rule.rateType,
        rateValue: rule.rateValue,
        stackable: rule.stackable,
        amount,
      });
    }
  }

  // Handle non-stackable penalties - keep only the highest
  const stackablePenalties = applicablePenalties.filter((p) => p.stackable);
  const nonStackablePenalties = applicablePenalties.filter((p) => !p.stackable);

  if (nonStackablePenalties.length > 0) {
    // Find the highest non-stackable penalty
    const highestNonStackable = nonStackablePenalties.reduce((prev, current) =>
      current.amount > prev.amount ? current : prev
    );

    return [...stackablePenalties, highestNonStackable];
  }

  return applicablePenalties;
}

/**
 * Calculate the penalty amount based on rate type
 */
function calculatePenaltyAmount(
  rule: IPenaltyRule,
  baseRate: number,
  hoursWorked: number
): number {
  if (rule.rateType === "multiplier") {
    // Multiplier: e.g., 1.5x base rate
    return baseRate * rule.rateValue * hoursWorked;
  } else {
    // Flat addition: e.g., +$2.00 per hour
    return rule.rateValue * hoursWorked;
  }
}
