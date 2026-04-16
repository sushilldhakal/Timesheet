import mongoose from "mongoose"
import { AvailabilityDbQueries } from "@/lib/db/queries/availability"
import { EmployeeDbQueries } from "@/lib/db/queries/employees"

export interface ValidationResult {
  isValid: boolean
  violations: string[]
}

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACT"

/**
 * Availability Manager
 * Validates employee availability constraints for shift assignments
 */
export class AvailabilityManager {
  /**
   * Validate if an employee can be assigned to a shift
   * @param employeeId - The employee to validate
   * @param shiftStart - Shift start date/time
   * @param shiftEnd - Shift end date/time
   * @param organizationId - Organization context
   * @returns ValidationResult with violations if any
   */
  async validateShiftAssignment(
    employeeId: string | mongoose.Types.ObjectId,
    shiftStart: Date,
    shiftEnd: Date,
    organizationId: string
  ): Promise<ValidationResult> {
    const violations: string[] = []

    // Get all availability constraints for the employee
    const constraints = await AvailabilityDbQueries.listEmployeeConstraints({
      employeeId: employeeId.toString(),
      organizationId,
    })

    if (constraints.length === 0) {
      // No constraints = available
      return { isValid: true, violations: [] }
    }

    for (const constraint of constraints) {
      // Check if constraint is temporary and applies to this date
      if (constraint.temporaryStartDate && constraint.temporaryEndDate) {
        const shiftDate = new Date(shiftStart)
        shiftDate.setHours(0, 0, 0, 0)
        
        const tempStart = new Date(constraint.temporaryStartDate)
        tempStart.setHours(0, 0, 0, 0)
        
        const tempEnd = new Date(constraint.temporaryEndDate)
        tempEnd.setHours(0, 0, 0, 0)

        if (shiftDate < tempStart || shiftDate > tempEnd) {
          // Constraint doesn't apply to this date
          continue
        }
      }

      // Check day-level restrictions
      const dayOfWeek = shiftStart.getDay()
      if (constraint.unavailableDays.includes(dayOfWeek)) {
        violations.push(
          `Employee is unavailable on ${this.getDayName(dayOfWeek)}${
            constraint.reason ? ` (${constraint.reason})` : ""
          }`
        )
      }

      // Check time-level restrictions
      const shiftStartTime = this.formatTime(shiftStart)
      const shiftEndTime = this.formatTime(shiftEnd)

      for (const timeRange of constraint.unavailableTimeRanges) {
        if (this.timeRangesOverlap(shiftStartTime, shiftEndTime, timeRange.start, timeRange.end)) {
          violations.push(
            `Employee is unavailable during ${timeRange.start}-${timeRange.end}${
              constraint.reason ? ` (${constraint.reason})` : ""
            }`
          )
        }
      }

      // Check consecutive days limit
      if (constraint.maxConsecutiveDays) {
        const consecutiveDaysViolation = await this.checkConsecutiveDays(
          employeeId,
          shiftStart,
          organizationId,
          constraint.maxConsecutiveDays
        )
        if (consecutiveDaysViolation) {
          violations.push(consecutiveDaysViolation)
        }
      }

      // Check minimum rest period
      if (constraint.minRestHours) {
        const restPeriodViolation = await this.checkRestPeriod(
          employeeId,
          shiftStart,
          organizationId,
          constraint.minRestHours
        )
        if (restPeriodViolation) {
          violations.push(restPeriodViolation)
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    }
  }

  /**
   * Get available employees for a shift
   * @param shiftStart - Shift start date/time
   * @param shiftEnd - Shift end date/time
   * @param organizationId - Organization context
   * @param employmentTypes - Optional filter by employment types
   * @returns Array of available employees
   */
  async getAvailableEmployees(
    shiftStart: Date,
    shiftEnd: Date,
    organizationId: string,
    employmentTypes?: EmploymentType[]
  ): Promise<any[]> {
    // Get all employees in the organization
    const query: any = { organizationId }
    if (employmentTypes && employmentTypes.length > 0) {
      query.employmentType = { $in: employmentTypes }
    }

    const employees = await EmployeeDbQueries.findEmployees(query, { sort: { name: 1 }, offset: 0, limit: 10_000 })

    // Filter employees by availability
    const availableEmployees = []
    for (const employee of employees) {
      const validation = await this.validateShiftAssignment(
        employee._id,
        shiftStart,
        shiftEnd,
        organizationId
      )
      if (validation.isValid) {
        availableEmployees.push(employee)
      }
    }

    return availableEmployees
  }

  /**
   * Check if assigning this shift would violate consecutive days limit
   * @param employeeId - The employee to check
   * @param date - The date of the proposed shift
   * @param organizationId - Organization context
   * @param maxConsecutiveDays - Maximum allowed consecutive days
   * @returns Violation message or null if valid
   */
  private async checkConsecutiveDays(
    employeeId: string | mongoose.Types.ObjectId,
    date: Date,
    organizationId: string,
    maxConsecutiveDays: number
  ): Promise<string | null> {
    // This would require querying shift assignments to count consecutive days
    // For now, we'll return null (no violation) as this requires roster data
    // This will be implemented when we integrate with the roster system
    
    // TODO: Query ShiftAssignment collection to count consecutive working days
    // before and after this date, and check if adding this shift would exceed
    // maxConsecutiveDays
    
    return null
  }

  /**
   * Check if assigning this shift would violate minimum rest period
   * @param employeeId - The employee to check
   * @param shiftStart - The start time of the proposed shift
   * @param organizationId - Organization context
   * @param minRestHours - Minimum required rest hours
   * @returns Violation message or null if valid
   */
  private async checkRestPeriod(
    employeeId: string | mongoose.Types.ObjectId,
    shiftStart: Date,
    organizationId: string,
    minRestHours: number
  ): Promise<string | null> {
    // This would require querying shift assignments to find the previous shift
    // and calculate the time gap
    // For now, we'll return null (no violation) as this requires roster data
    // This will be implemented when we integrate with the roster system
    
    // TODO: Query ShiftAssignment collection to find the most recent shift
    // before this one, and check if the gap is >= minRestHours
    
    return null
  }

  /**
   * Format a Date object to HH:mm string
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }

  /**
   * Check if two time ranges overlap
   */
  private timeRangesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    // Convert HH:mm to minutes since midnight for comparison
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number)
      return hours * 60 + minutes
    }

    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)

    // Check for overlap: ranges overlap if start1 < end2 AND start2 < end1
    return s1 < e2 && s2 < e1
  }

  /**
   * Get day name from day number
   */
  private getDayName(dayOfWeek: number): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return days[dayOfWeek] || "Unknown"
  }
}
