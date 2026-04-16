import mongoose from "mongoose"
import type { IShift } from "@/lib/db/queries/scheduling-types"
import { AvailabilityManager } from "./availability-manager"
import { AbsenceManager } from "./absence-manager"
import { SchedulingModels } from "@/lib/db/queries/scheduling-models"

export interface StaffingGap {
  shiftId: string
  date: Date
  startTime: Date
  endTime: Date
  locationId: string
  roleId: string
  requiredStaffCount: number
  currentStaffCount: number
  gapSize: number
  suggestedCasualEmployees: SuggestedEmployee[]
  suggestedPartTimeEmployees: SuggestedEmployee[]
}

export interface SuggestedEmployee {
  employeeId: string
  employeeName: string
  currentHours: number
  remainingHours?: number // For part-time employees
  employmentType: "CASUAL" | "PART_TIME"
}

export interface StaffingLevel {
  requiredStaffCount: number
  currentStaffCount: number
  isUnderstaffed: boolean
  gapSize: number
}

/**
 * Gap Identifier
 * Identifies staffing gaps and suggests available employees
 */
export class GapIdentifier {
  private availabilityManager: AvailabilityManager
  private absenceManager: AbsenceManager

  constructor() {
    this.availabilityManager = new AvailabilityManager()
    this.absenceManager = new AbsenceManager()
  }

  /**
   * Identify all staffing gaps in a roster
   * @param rosterId - The roster to analyze
   * @param organizationId - Organization context
   * @returns Array of staffing gaps with suggestions
   */
  async identifyGaps(
    rosterId: string,
    organizationId: string
  ): Promise<StaffingGap[]> {
    const roster = await SchedulingModels.Roster.findById(rosterId)
    if (!roster) {
      throw new Error(`Roster not found: ${rosterId}`)
    }

    const gaps: StaffingGap[] = []

    // Analyze each shift for understaffing
    for (const shift of roster.shifts) {
      const staffingLevel = this.calculateStaffingLevels(shift)

      if (staffingLevel.isUnderstaffed) {
        // Get suggestions for this gap
        const casualSuggestions = await this.suggestCasualStaff(
          shift,
          organizationId
        )
        const partTimeSuggestions = await this.suggestPartTimeStaff(
          shift,
          organizationId
        )

        gaps.push({
          shiftId: shift._id.toString(),
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId.toString(),
          roleId: shift.roleId.toString(),
          requiredStaffCount: staffingLevel.requiredStaffCount,
          currentStaffCount: staffingLevel.currentStaffCount,
          gapSize: staffingLevel.gapSize,
          suggestedCasualEmployees: casualSuggestions,
          suggestedPartTimeEmployees: partTimeSuggestions,
        })
      }
    }

    return gaps
  }

  /**
   * Calculate staffing levels for a shift
   * @param shift - The shift to analyze
   * @returns Staffing level information
   */
  calculateStaffingLevels(shift: IShift): StaffingLevel {
    const requiredStaffCount = shift.requiredStaffCount || 1
    const currentStaffCount = shift.currentStaffCount || 0
    const gapSize = Math.max(0, requiredStaffCount - currentStaffCount)
    const isUnderstaffed = currentStaffCount < requiredStaffCount

    return {
      requiredStaffCount,
      currentStaffCount,
      isUnderstaffed,
      gapSize,
    }
  }

  /**
   * Suggest casual employees for a staffing gap
   * @param shift - The shift with a gap
   * @param organizationId - Organization context
   * @returns Array of suggested casual employees
   */
  async suggestCasualStaff(
    shift: IShift,
    organizationId: string
  ): Promise<SuggestedEmployee[]> {
    // Get all casual employees in the organization
    const casualEmployees = await SchedulingModels.Employee.find({
      organizationId,
      employmentType: "CASUAL",
    })

    const suggestions: SuggestedEmployee[] = []

    for (const employee of casualEmployees) {
      // Check if employee is available for this shift
      const validation = await this.availabilityManager.validateShiftAssignment(
        employee._id,
        shift.startTime,
        shift.endTime,
        organizationId
      )

      if (!validation.isValid) {
        continue // Skip unavailable employees
      }

      // Check if employee is on leave
      const isAvailable = await this.absenceManager.isEmployeeAvailable(
        employee._id.toString(),
        shift.date
      )

      if (!isAvailable) {
        continue // Skip employees on leave
      }

      // Calculate current hours for this employee in the roster week
      // TODO: This will be implemented when we have access to the full roster
      const currentHours = 0

      suggestions.push({
        employeeId: employee._id.toString(),
        employeeName: employee.name,
        currentHours,
        employmentType: "CASUAL",
      })
    }

    return suggestions
  }

  /**
   * Suggest part-time employees who are under their standard hours
   * @param shift - The shift with a gap
   * @param organizationId - Organization context
   * @returns Array of suggested part-time employees
   */
  async suggestPartTimeStaff(
    shift: IShift,
    organizationId: string
  ): Promise<SuggestedEmployee[]> {
    // Get all part-time employees in the organization
    const partTimeEmployees = await SchedulingModels.Employee.find({
      organizationId,
      employmentType: "PART_TIME",
    })

    const suggestions: SuggestedEmployee[] = []

    for (const employee of partTimeEmployees) {
      // Check if employee is available for this shift
      const validation = await this.availabilityManager.validateShiftAssignment(
        employee._id,
        shift.startTime,
        shift.endTime,
        organizationId
      )

      if (!validation.isValid) {
        continue // Skip unavailable employees
      }

      // Check if employee is on leave
      const isAvailable = await this.absenceManager.isEmployeeAvailable(
        employee._id.toString(),
        shift.date
      )

      if (!isAvailable) {
        continue // Skip employees on leave
      }

      // Calculate current hours and standard hours for this employee
      // TODO: This will be implemented when we integrate with WorkingHoursHierarchy
      const currentHours = 0
      const standardHours = employee.standardHoursPerWeek || 0

      // Only suggest if employee is under their standard hours
      if (currentHours < standardHours) {
        const remainingHours = standardHours - currentHours

        suggestions.push({
          employeeId: employee._id.toString(),
          employeeName: employee.name,
          currentHours,
          remainingHours,
          employmentType: "PART_TIME",
        })
      }
    }

    // Sort by remaining hours (descending) - prioritize those furthest under standard
    suggestions.sort((a, b) => (b.remainingHours || 0) - (a.remainingHours || 0))

    return suggestions
  }

  /**
   * Update staffing counts for a shift
   * @param shift - The shift to update
   * @returns Updated shift with recalculated counts
   */
  updateStaffCounts(shift: IShift): IShift {
    // Count non-null employeeId entries for this shift
    // In a real implementation, this would query all shifts with the same
    // date/time/location/role to count assigned employees
    
    const currentStaffCount = shift.employeeId ? 1 : 0
    const requiredStaffCount = shift.requiredStaffCount || 1
    const isUnderstaffed = currentStaffCount < requiredStaffCount

    return {
      ...shift,
      currentStaffCount,
      isUnderstaffed,
    }
  }

  /**
   * Mark a shift as understaffed if current staff < required staff
   * @param shift - The shift to check
   * @returns True if understaffed, false otherwise
   */
  markUnderstaffed(shift: IShift): boolean {
    const currentStaffCount = shift.currentStaffCount || 0
    const requiredStaffCount = shift.requiredStaffCount || 1
    return currentStaffCount < requiredStaffCount
  }
}
