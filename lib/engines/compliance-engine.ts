import { IComplianceRule } from "@/lib/db/schemas/compliance-rule"
import { complianceWindowResolver, PayPeriodConfig } from "./compliance-window-resolver"

export interface ShiftWindow {
  employeeId: string
  shiftStart: Date
  shiftEnd: Date
  shiftId?: string
  breakMinutes: number
}

interface Violation {
  ruleId: string
  ruleType: string
  severity: "warning" | "breach"
  message: string
  shiftId?: string
}

export interface ComplianceResult {
  violations: Violation[]
  isBlocking: boolean
}

const DEFAULT_PAY_PERIOD_CONFIG: PayPeriodConfig = {
  windowType: 'weekly',
  periodStartDayOfWeek: 1, // Monday
}

/**
 * Stateless compliance evaluation engine.
 * Receives shifts + rules + pay period config, evaluates them, returns violations.
 * Does NOT write to DB — the caller (ComplianceService) decides whether to persist.
 */
export class ComplianceEngine {
  /**
   * Evaluate a set of shifts for a single employee against all active rules.
   * Pass in the last N shifts (14 days lookback is safe).
   * payPeriodConfig controls how MAX_HOURS windows are resolved.
   */
  evaluate(
    shifts: ShiftWindow[],
    rules: IComplianceRule[],
    payPeriodConfig: PayPeriodConfig = DEFAULT_PAY_PERIOD_CONFIG
  ): ComplianceResult {
    const violations: Violation[] = []

    for (const rule of rules) {
      if (!rule.isActive) continue

      let ruleViolations: Violation[] = []

      switch (rule.ruleType) {
        case "REST_PERIOD":
          ruleViolations = this.checkRestPeriod(shifts, rule)
          break
        case "CONSECUTIVE_DAYS":
          ruleViolations = this.checkConsecutiveDays(shifts, rule)
          break
        case "MAX_HOURS":
          ruleViolations = this.checkMaxHours(shifts, rule, payPeriodConfig)
          break
        case "BREAK_REQUIREMENT":
          ruleViolations = this.checkBreakRequirement(shifts, rule)
          break
      }

      violations.push(...ruleViolations)
    }

    const isBlocking = violations.some((v) => {
      const rule = rules.find((r) => r._id.toString() === v.ruleId)
      return rule?.blockPublishOnViolation === true
    })

    return { violations, isBlocking }
  }

  /**
   * REST_PERIOD: Check minimum rest hours between consecutive shifts.
   */
  private checkRestPeriod(shifts: ShiftWindow[], rule: IComplianceRule): Violation[] {
    if (!rule.minRestHoursBetweenShifts) return []

    const sorted = [...shifts].sort((a, b) => a.shiftStart.getTime() - b.shiftStart.getTime())
    const violations: Violation[] = []

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const gapHours =
        (curr.shiftStart.getTime() - prev.shiftEnd.getTime()) / (1000 * 60 * 60)

      if (gapHours < rule.minRestHoursBetweenShifts) {
        const actualHours = Math.round(gapHours * 10) / 10
        violations.push({
          ruleId: rule._id.toString(),
          ruleType: rule.ruleType,
          severity: rule.blockPublishOnViolation ? "breach" : "warning",
          message: `Only ${actualHours}h rest between shifts (minimum ${rule.minRestHoursBetweenShifts}h required)`,
          shiftId: curr.shiftId,
        })
      }
    }

    return violations
  }

  /**
   * CONSECUTIVE_DAYS: Check maximum consecutive working days.
   */
  private checkConsecutiveDays(shifts: ShiftWindow[], rule: IComplianceRule): Violation[] {
    if (!rule.maxConsecutiveDays) return []

    // Group shifts by calendar date (YYYY-MM-DD)
    const dateSet = new Set<string>()
    for (const shift of shifts) {
      const dateKey = shift.shiftStart.toISOString().slice(0, 10)
      dateSet.add(dateKey)
    }

    const sortedDates = Array.from(dateSet).sort()
    if (sortedDates.length === 0) return []

    let maxRun = 1
    let currentRun = 1
    let runEndDate = sortedDates[0]

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

      if (diffDays === 1) {
        currentRun++
        if (currentRun > maxRun) {
          maxRun = currentRun
          runEndDate = sortedDates[i]
        }
      } else {
        currentRun = 1
      }
    }

    if (maxRun > rule.maxConsecutiveDays) {
      // Find the shift on the last day of the run to attach the violation to
      const lastDayShift = shifts.find(
        (s) => s.shiftStart.toISOString().slice(0, 10) === runEndDate
      )
      return [
        {
          ruleId: rule._id.toString(),
          ruleType: rule.ruleType,
          severity: rule.blockPublishOnViolation ? "breach" : "warning",
          message: `${maxRun} consecutive working days exceeds maximum of ${rule.maxConsecutiveDays}`,
          shiftId: lastDayShift?.shiftId,
        },
      ]
    }

    return []
  }

  /**
   * MAX_HOURS: Check weekly or fortnightly hour limits using the pay period window resolver.
   */
  private checkMaxHours(
    shifts: ShiftWindow[],
    rule: IComplianceRule,
    payPeriodConfig: PayPeriodConfig
  ): Violation[] {
    const violations: Violation[] = []
    const targetShift = shifts[shifts.length - 1]
    if (!targetShift) return []

    if (rule.maxHoursPerWeek != null) {
      const window = complianceWindowResolver.resolveMaxHoursWindow(
        targetShift.shiftStart,
        { ...payPeriodConfig, windowType: 'weekly' }
      )
      const windowHours = shifts
        .filter((s) => s.shiftStart >= window.start && s.shiftStart <= window.end)
        .reduce((sum, s) => {
          return sum + (s.shiftEnd.getTime() - s.shiftStart.getTime()) / (1000 * 60 * 60)
        }, 0)

      if (windowHours > rule.maxHoursPerWeek) {
        violations.push({
          ruleId: rule._id.toString(),
          ruleType: rule.ruleType,
          severity: rule.blockPublishOnViolation ? "breach" : "warning",
          message: `${Math.round(windowHours * 10) / 10}h worked this week (${window.label}) exceeds maximum of ${rule.maxHoursPerWeek}h`,
          shiftId: targetShift.shiftId,
        })
      }
    }

    if (rule.maxHoursPerFortnight != null) {
      const window = complianceWindowResolver.resolveMaxHoursWindow(
        targetShift.shiftStart,
        { ...payPeriodConfig, windowType: 'fortnightly' }
      )
      const windowHours = shifts
        .filter((s) => s.shiftStart >= window.start && s.shiftStart <= window.end)
        .reduce((sum, s) => {
          return sum + (s.shiftEnd.getTime() - s.shiftStart.getTime()) / (1000 * 60 * 60)
        }, 0)

      if (windowHours > rule.maxHoursPerFortnight) {
        violations.push({
          ruleId: rule._id.toString(),
          ruleType: rule.ruleType,
          severity: rule.blockPublishOnViolation ? "breach" : "warning",
          message: `${Math.round(windowHours * 10) / 10}h worked this fortnight (${window.label}) exceeds maximum of ${rule.maxHoursPerFortnight}h`,
          shiftId: targetShift.shiftId,
        })
      }
    }

    return violations
  }

  /**
   * BREAK_REQUIREMENT: Check that required breaks were taken for shift duration.
   */
  private checkBreakRequirement(shifts: ShiftWindow[], rule: IComplianceRule): Violation[] {
    if (!rule.breakRules || rule.breakRules.length === 0) return []

    const violations: Violation[] = []

    for (const shift of shifts) {
      const shiftHours =
        (shift.shiftEnd.getTime() - shift.shiftStart.getTime()) / (1000 * 60 * 60)

      // Find the applicable break rule for this shift duration
      // Sort descending by minShiftHours so we match the most specific (longest) threshold
      const applicableBreakRule = [...rule.breakRules]
        .sort((a, b) => b.minShiftHours - a.minShiftHours)
        .find((br) => shiftHours >= br.minShiftHours)

      if (!applicableBreakRule) continue

      if (shift.breakMinutes < applicableBreakRule.requiredBreakMinutes) {
        violations.push({
          ruleId: rule._id.toString(),
          ruleType: rule.ruleType,
          severity: rule.blockPublishOnViolation ? "breach" : "warning",
          message: `Only ${shift.breakMinutes}min break taken (${applicableBreakRule.requiredBreakMinutes}min required for ${Math.round(shiftHours * 10) / 10}h shift)`,
          shiftId: shift.shiftId,
        })
      }
    }

    return violations
  }
}

export const complianceEngine = new ComplianceEngine()
