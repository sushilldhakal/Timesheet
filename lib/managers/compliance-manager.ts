import mongoose from "mongoose"
import type { ComplianceRuleType, IComplianceBreakRule } from "@/lib/db/queries/scheduling-types"
import { ComplianceRulesDbQueries } from "@/lib/db/queries/compliance-rules"

export interface ComplianceViolation {
  employeeId: string
  date: Date
  ruleType: ComplianceRuleType
  ruleName: string
  message: string
  severity: "ERROR" | "WARNING"
  blockPublish: boolean
}

export interface BreakRequirement {
  minShiftHours: number
  requiredBreakMinutes: number
}

/**
 * Compliance Manager
 * Enforces legal and award-based compliance rules
 */
export class ComplianceManager {
  /**
   * Validate entire roster for compliance violations
   * @param rosterId - The roster to validate
   * @param organizationId - Organization context
   * @returns Array of compliance violations
   */
  async validateRoster(
    rosterId: string,
    organizationId: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []

    // TODO: This will be implemented when we integrate with the roster system
    // It will:
    // 1. Load all shift assignments for the roster
    // 2. Group by employee
    // 3. For each employee, validate all their shifts
    // 4. Collect all violations

    return violations
  }

  /**
   * Validate a single shift assignment for compliance
   * @param employeeId - The employee being assigned
   * @param shiftStart - Shift start date/time
   * @param shiftEnd - Shift end date/time
   * @param organizationId - Organization context
   * @returns Array of compliance violations
   */
  async validateShiftAssignment(
    employeeId: string | mongoose.Types.ObjectId,
    shiftStart: Date,
    shiftEnd: Date,
    organizationId: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []

    // Get all active compliance rules for the organization
    const rules = await ComplianceRulesDbQueries.find({
      organizationId,
      isActive: true,
    })

    for (const rule of rules) {
      switch (rule.ruleType) {
        case "REST_PERIOD":
          if (rule.minRestHoursBetweenShifts) {
            const restViolation = await this.checkRestPeriods(
              employeeId,
              shiftStart,
              organizationId,
              rule.minRestHoursBetweenShifts,
              rule.name,
              rule.blockPublishOnViolation
            )
            if (restViolation) {
              violations.push(restViolation)
            }
          }
          break

        case "CONSECUTIVE_DAYS":
          if (rule.maxConsecutiveDays) {
            const consecutiveViolation = await this.checkConsecutiveDays(
              employeeId,
              shiftStart,
              organizationId,
              rule.maxConsecutiveDays,
              rule.name,
              rule.blockPublishOnViolation
            )
            if (consecutiveViolation) {
              violations.push(consecutiveViolation)
            }
          }
          break

        case "MAX_HOURS":
          const hoursViolation = await this.checkMaxHours(
            employeeId,
            shiftStart,
            shiftEnd,
            organizationId,
            rule.maxHoursPerWeek,
            rule.maxHoursPerFortnight,
            rule.name,
            rule.blockPublishOnViolation
          )
          if (hoursViolation) {
            violations.push(hoursViolation)
          }
          break

        case "BREAK_REQUIREMENT":
          if (rule.breakRules.length > 0) {
            const breakViolation = this.checkRequiredBreaks(
              shiftStart,
              shiftEnd,
              rule.breakRules,
              rule.name,
              rule.blockPublishOnViolation
            )
            if (breakViolation) {
              violations.push({
                ...breakViolation,
                employeeId: employeeId.toString(),
                date: shiftStart,
              })
            }
          }
          break
      }
    }

    return violations
  }

  /**
   * Check if shift violates rest period requirements
   * @param employeeId - The employee to check
   * @param shiftStart - The start time of the proposed shift
   * @param organizationId - Organization context
   * @param minRestHours - Minimum required rest hours
   * @param ruleName - Name of the rule for violation message
   * @param blockPublish - Whether this violation blocks publish
   * @returns Compliance violation or null if valid
   */
  private async checkRestPeriods(
    employeeId: string | mongoose.Types.ObjectId,
    shiftStart: Date,
    organizationId: string,
    minRestHours: number,
    ruleName: string,
    blockPublish: boolean
  ): Promise<ComplianceViolation | null> {
    // TODO: This will be implemented when we integrate with the roster system
    // It will:
    // 1. Query ShiftAssignment to find the most recent shift before this one
    // 2. Calculate the time gap between that shift's end and this shift's start
    // 3. If gap < minRestHours, return a violation

    return null
  }

  /**
   * Check if shift violates consecutive days limit
   * @param employeeId - The employee to check
   * @param date - The date of the proposed shift
   * @param organizationId - Organization context
   * @param maxConsecutiveDays - Maximum allowed consecutive days
   * @param ruleName - Name of the rule for violation message
   * @param blockPublish - Whether this violation blocks publish
   * @returns Compliance violation or null if valid
   */
  private async checkConsecutiveDays(
    employeeId: string | mongoose.Types.ObjectId,
    date: Date,
    organizationId: string,
    maxConsecutiveDays: number,
    ruleName: string,
    blockPublish: boolean
  ): Promise<ComplianceViolation | null> {
    // TODO: This will be implemented when we integrate with the roster system
    // It will:
    // 1. Query ShiftAssignment to count consecutive working days before this date
    // 2. If adding this shift would exceed maxConsecutiveDays, return a violation

    return null
  }

  /**
   * Check if shift violates maximum hours limits
   * @param employeeId - The employee to check
   * @param shiftStart - Shift start date/time
   * @param shiftEnd - Shift end date/time
   * @param organizationId - Organization context
   * @param maxHoursPerWeek - Maximum hours per week (optional)
   * @param maxHoursPerFortnight - Maximum hours per fortnight (optional)
   * @param ruleName - Name of the rule for violation message
   * @param blockPublish - Whether this violation blocks publish
   * @returns Compliance violation or null if valid
   */
  private async checkMaxHours(
    employeeId: string | mongoose.Types.ObjectId,
    shiftStart: Date,
    shiftEnd: Date,
    organizationId: string,
    maxHoursPerWeek: number | null | undefined,
    maxHoursPerFortnight: number | null | undefined,
    ruleName: string,
    blockPublish: boolean
  ): Promise<ComplianceViolation | null> {
    // TODO: This will be implemented when we integrate with the roster system
    // It will:
    // 1. Calculate the duration of this shift
    // 2. Query ShiftAssignment to sum hours for the current week
    // 3. If maxHoursPerWeek is set and would be exceeded, return a violation
    // 4. Query ShiftAssignment to sum hours for the current fortnight
    // 5. If maxHoursPerFortnight is set and would be exceeded, return a violation

    return null
  }

  /**
   * Check if shift duration requires breaks
   * @param shiftStart - Shift start date/time
   * @param shiftEnd - Shift end date/time
   * @param breakRules - Array of break rules to check
   * @param ruleName - Name of the rule for violation message
   * @param blockPublish - Whether this violation blocks publish
   * @returns Compliance violation or null if valid
   */
  private checkRequiredBreaks(
    shiftStart: Date,
    shiftEnd: Date,
    breakRules: IComplianceBreakRule[],
    ruleName: string,
    blockPublish: boolean
  ): Omit<ComplianceViolation, "employeeId" | "date"> | null {
    // Calculate shift duration in hours
    const durationMs = shiftEnd.getTime() - shiftStart.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    // Find applicable break rule (highest minShiftHours that's <= duration)
    let applicableRule: IComplianceBreakRule | null = null
    for (const rule of breakRules) {
      if (durationHours >= rule.minShiftHours) {
        if (!applicableRule || rule.minShiftHours > applicableRule.minShiftHours) {
          applicableRule = rule
        }
      }
    }

    if (applicableRule) {
      // A break is required for this shift duration
      // Note: We can't validate if the break is actually scheduled without
      // a break tracking system, so we just return the requirement
      return {
        ruleType: "BREAK_REQUIREMENT",
        ruleName,
        message: `Shift of ${durationHours.toFixed(1)} hours requires a ${applicableRule.requiredBreakMinutes} minute break`,
        severity: "WARNING",
        blockPublish,
      }
    }

    return null
  }

  /**
   * Get break requirement for a shift duration
   * @param shiftDuration - Duration in hours
   * @param organizationId - Organization context
   * @returns Break requirement or null if no break required
   */
  async getBreakRequirement(
    shiftDuration: number,
    organizationId: string
  ): Promise<BreakRequirement | null> {
    // Get all active break requirement rules
    const rules = await ComplianceRulesDbQueries.find({
      organizationId,
      ruleType: "BREAK_REQUIREMENT",
      isActive: true,
    })

    let applicableRule: IComplianceBreakRule | null = null
    for (const rule of rules) {
      for (const breakRule of rule.breakRules) {
        if (shiftDuration >= breakRule.minShiftHours) {
          if (!applicableRule || breakRule.minShiftHours > applicableRule.minShiftHours) {
            applicableRule = breakRule
          }
        }
      }
    }

    return applicableRule
  }
}
