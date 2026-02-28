import mongoose from "mongoose"
import { Roster, IShift } from "../db/schemas/roster"
import { Employee } from "../db/schemas/employee"
import { WorkingHoursHierarchy, WorkingHoursConfig } from "./working-hours-hierarchy"
import { AvailabilityManager, ValidationResult } from "./availability-manager"
import { ComplianceManager, ComplianceViolation } from "./compliance-manager"
import { AbsenceManager } from "./absence-manager"
import { RotationCalculator } from "./rotation-calculator"

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CASUAL"

export interface RosterFillResult {
  successCount: number
  failureCount: number
  skippedCount: number
  violations: Array<{
    employeeId: string
    employeeName: string
    date: Date
    violations: string[]
  }>
}

/**
 * Auto-Fill Engine
 * Automatically populates roster shifts based on employee schedules
 */
export class AutoFillEngine {
  private workingHoursHierarchy: WorkingHoursHierarchy
  private availabilityManager: AvailabilityManager
  private complianceManager: ComplianceManager
  private absenceManager: AbsenceManager
  private rotationCalculator: RotationCalculator

  constructor() {
    this.workingHoursHierarchy = new WorkingHoursHierarchy()
    this.availabilityManager = new AvailabilityManager()
    this.complianceManager = new ComplianceManager()
    this.absenceManager = new AbsenceManager()
    this.rotationCalculator = new RotationCalculator()
  }

  /**
   * Fill roster with shifts based on employee schedules
   * @param rosterId - The roster to fill
   * @param organizationId - Organization context
   * @param employmentTypes - Filter by employment types (default: FULL_TIME, PART_TIME)
   * @returns Result with success/failure counts and violations
   */
  async fillRoster(
    rosterId: string,
    organizationId: string,
    employmentTypes: EmploymentType[] = ["FULL_TIME", "PART_TIME"]
  ): Promise<RosterFillResult> {
    const result: RosterFillResult = {
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      violations: [],
    }

    // Load the roster
    const roster = await Roster.findById(rosterId)
    if (!roster) {
      throw new Error(`Roster not found: ${rosterId}`)
    }

    // Get all employees in the organization filtered by employment type
    const employees = await Employee.find({
      employer: organizationId,
      employmentType: { $in: employmentTypes },
    })

    // Process each employee
    for (const employee of employees) {
      // Resolve working hours for this employee
      const workingHours = await this.workingHoursHierarchy.resolveWorkingHours(
        employee._id.toString(),
        organizationId
      )

      if (!workingHours) {
        // No working hours configuration found - skip this employee
        result.skippedCount++
        continue
      }

      // Get employee's schedules
      const schedules = employee.schedules || []
      if (schedules.length === 0) {
        result.skippedCount++
        continue
      }

      // Iterate through 7 days of the roster week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(roster.weekStartDate)
        currentDate.setDate(currentDate.getDate() + dayOffset)

        // Check if employee has approved leave on this date
        const isAvailable = await this.absenceManager.isEmployeeAvailable(
          employee._id.toString(),
          currentDate
        )

        if (!isAvailable) {
          result.skippedCount++
          continue
        }

        // Process each schedule for this employee
        for (const schedule of schedules) {
          // Check if schedule is effective for this date
          if (currentDate < schedule.effectiveFrom) {
            continue
          }
          if (schedule.effectiveTo && currentDate > schedule.effectiveTo) {
            continue
          }

          // Get pattern for this date
          const pattern = this.rotationCalculator.getPatternForDate(
            schedule,
            currentDate
          )

          if (!pattern) {
            // No pattern for this date
            continue
          }

          // Create shift assignment
          const shiftStart = new Date(currentDate)
          shiftStart.setHours(
            schedule.startTime.getHours(),
            schedule.startTime.getMinutes(),
            0,
            0
          )

          const shiftEnd = new Date(currentDate)
          shiftEnd.setHours(
            schedule.endTime.getHours(),
            schedule.endTime.getMinutes(),
            0,
            0
          )

          // Validate before creating assignment
          const availabilityValidation = await this.availabilityManager.validateShiftAssignment(
            employee._id,
            shiftStart,
            shiftEnd,
            organizationId
          )

          const complianceViolations = await this.complianceManager.validateShiftAssignment(
            employee._id,
            shiftStart,
            shiftEnd,
            organizationId
          )

          // Collect all violations
          const allViolations = [
            ...availabilityValidation.violations,
            ...complianceViolations.map((v) => v.message),
          ]

          if (allViolations.length > 0) {
            // Skip assignment creation due to violations
            result.failureCount++
            result.violations.push({
              employeeId: employee._id.toString(),
              employeeName: employee.name,
              date: currentDate,
              violations: allViolations,
            })
            continue
          }

          // Create the shift assignment
          const newShift: IShift = {
            _id: new mongoose.Types.ObjectId(),
            employeeId: employee._id,
            date: currentDate,
            startTime: shiftStart,
            endTime: shiftEnd,
            locationId: schedule.locationId,
            roleId: schedule.roleId,
            sourceScheduleId: schedule._id,
            estimatedCost: 0, // Will be calculated separately
            notes: "",
            requiredStaffCount: 1,
            currentStaffCount: 1,
            isUnderstaffed: false,
          }

          roster.shifts.push(newShift)
          result.successCount++
        }
      }
    }

    // Save the updated roster
    await roster.save()

    return result
  }
}
