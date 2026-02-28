import mongoose from "mongoose"
import { Roster, IRoster, IShift, getWeekBoundaries } from "../db/schemas/roster"
import { Employee, IEmployeeDocument } from "../db/schemas/employee"
import { ISchedule } from "../db/schemas/schedule"
import { validateShiftData } from "../validation/roster"
import { getISOWeek, getISOWeekYear, addDays } from "date-fns"
import Award from "../db/schemas/award"
import { SchedulingValidator } from "../validation/scheduling-validator"

/**
 * Roster Manager
 * Responsible for managing weekly shift plans and roster lifecycle
 */
export class RosterManager {
  private schedulingValidator: SchedulingValidator

  constructor() {
    this.schedulingValidator = new SchedulingValidator()
  }

  /**
   * Create a new roster for a specified week and auto-populate from schedules
   * @param weekId - ISO week identifier (YYYY-Www)
   * @returns The created roster or error
   */
  async createRoster(
    weekId: string
  ): Promise<{ success: true; roster: IRoster } | { success: false; error: string; message: string }> {
    try {
      // Check if roster already exists
      const existingRoster = await Roster.findOne({ weekId })
      if (existingRoster) {
        return {
          success: false,
          error: "DUPLICATE_WEEK",
          message: `Roster already exists for week ${weekId}`,
        }
      }

      // Calculate week boundaries
      const { start: weekStartDate, end: weekEndDate } = getWeekBoundaries(weekId)
      const year = getISOWeekYear(weekStartDate)
      const weekNumber = getISOWeek(weekStartDate)

      // Create new roster with empty shifts array
      const newRoster = new Roster({
        weekId,
        year,
        weekNumber,
        weekStartDate,
        weekEndDate,
        shifts: [],
        status: "draft",
      })

      // Save the roster
      await newRoster.save()

      // Auto-populate shifts from schedules
      const populateResult = await this.populateRosterFromSchedules(weekId)
      if (!populateResult.success) {
        // If population fails, still return the created roster
        console.warn(`Failed to populate roster ${weekId}:`, populateResult.error, populateResult.message)
      }

      // Reload the roster to get populated shifts
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: "Roster was created but could not be retrieved",
        }
      }

      return {
        success: true,
        roster: roster.toObject() as IRoster,
      }
    } catch (error) {
      return {
        success: false,
        error: "CREATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to create roster",
      }
    }
  }

  /**
   * Auto-populate roster shifts from active employee schedules
   * @param weekId - ISO week identifier (YYYY-Www)
   * @param includeEmploymentTypes - Optional filter for employment types (e.g., ["full_time", "part_time"])
   * @returns Success status or error
   */
  async populateRosterFromSchedules(
    weekId: string,
    includeEmploymentTypes?: string[]
  ): Promise<{ success: true; shiftsCreated: number } | { success: false; error: string; message: string }> {
    try {
      // Find the roster
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: `Roster not found for week ${weekId}`,
        }
      }

      // Calculate week boundaries
      const { start: weekStartDate, end: weekEndDate } = getWeekBoundaries(weekId)

      // Build query for employees with schedules
      const query: any = {
        schedules: { $exists: true, $ne: [] },
      }

      // Filter by employment type if specified
      if (includeEmploymentTypes && includeEmploymentTypes.length > 0) {
        query.employmentType = { $in: includeEmploymentTypes }
      }

      // Query employees
      const employees = await Employee.find(query)

      const generatedShifts: IShift[] = []
      const filteredEmployees: Array<{ employeeName: string; reason: string }> = []

      // Process each employee
      for (const employee of employees) {
        if (!employee.schedules || employee.schedules.length === 0) {
          continue
        }

        // Filter schedules that are active during this week
        const activeSchedules = employee.schedules.filter((schedule) => {
          const effectiveFrom = new Date(schedule.effectiveFrom)
          const effectiveTo = schedule.effectiveTo ? new Date(schedule.effectiveTo) : null

          // Check if the week overlaps with the schedule's effective date range
          const isAfterStart = weekEndDate >= effectiveFrom
          const isBeforeEnd = effectiveTo === null || weekStartDate <= effectiveTo

          return isAfterStart && isBeforeEnd
        })

        if (activeSchedules.length === 0) {
          continue
        }

        // Group schedules by day to handle overlaps
        const schedulesByDay = new Map<number, ISchedule>()

        for (const schedule of activeSchedules) {
          for (const day of schedule.dayOfWeek) {
            const existing = schedulesByDay.get(day)
            if (!existing) {
              schedulesByDay.set(day, schedule)
            } else {
              // Apply schedule with most recent effectiveFrom
              const existingFrom = new Date(existing.effectiveFrom)
              const currentFrom = new Date(schedule.effectiveFrom)
              if (currentFrom > existingFrom) {
                schedulesByDay.set(day, schedule)
              }
            }
          }
        }

        // Generate shifts for each day in the schedule
        for (const [dayOfWeek, schedule] of schedulesByDay.entries()) {
          // Calculate the actual date for this day in the week
          // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
          // ISO week starts on Monday (day 1)
          const shiftDate = addDays(weekStartDate, dayOfWeek === 0 ? 6 : dayOfWeek - 1)

          // Ensure the shift date falls within the week boundaries
          if (shiftDate < weekStartDate || shiftDate > weekEndDate) {
            continue
          }

          // Validate role assignment before creating shift
          const validationResult = await this.schedulingValidator.validateShift(
            employee._id,
            schedule.roleId,
            schedule.locationId,
            shiftDate
          )

          if (!validationResult.valid) {
            // Log filtered employee for debugging
            filteredEmployees.push({
              employeeName: employee.name,
              reason: validationResult.message || validationResult.error || "Validation failed",
            })
            console.log(
              `[RosterManager] Filtered employee ${employee.name} for shift on ${shiftDate.toISOString()}: ${validationResult.message || validationResult.error}`
            )
            continue
          }

          // Create shift times by combining the shift date with schedule times
          const scheduleStartTime = new Date(schedule.startTime)
          const scheduleEndTime = new Date(schedule.endTime)

          const shiftStartTime = new Date(shiftDate)
          shiftStartTime.setUTCHours(
            scheduleStartTime.getUTCHours(),
            scheduleStartTime.getUTCMinutes(),
            0,
            0
          )

          const shiftEndTime = new Date(shiftDate)
          shiftEndTime.setUTCHours(scheduleEndTime.getUTCHours(), scheduleEndTime.getUTCMinutes(), 0, 0)

          // If end time is before or equal to start time, shift spans midnight - add 1 day to end time
          if (shiftEndTime <= shiftStartTime) {
            shiftEndTime.setDate(shiftEndTime.getDate() + 1)
          }

          // Calculate estimated cost for the shift
          const estimatedCost = await this.calculateShiftCost(
            {
              employeeId: employee._id,
              date: shiftDate,
              startTime: shiftStartTime,
              endTime: shiftEndTime,
              locationId: schedule.locationId,
              roleId: schedule.roleId,
            },
            employee
          )

          // Create the shift
          const shift: IShift = {
            _id: new mongoose.Types.ObjectId(),
            employeeId: employee._id,
            date: shiftDate,
            startTime: shiftStartTime,
            endTime: shiftEndTime,
            locationId: schedule.locationId,
            roleId: schedule.roleId,
            sourceScheduleId: schedule._id,
            estimatedCost,
            notes: "",
          }

          generatedShifts.push(shift)
        }
      }

      // Log summary of filtered employees
      if (filteredEmployees.length > 0) {
        console.log(
          `[RosterManager] Filtered ${filteredEmployees.length} employee shift(s) due to role assignment validation`
        )
      }

      // Add generated shifts to roster
      roster.shifts.push(...generatedShifts)
      await roster.save()

      return {
        success: true,
        shiftsCreated: generatedShifts.length,
      }
    } catch (error) {
      return {
        success: false,
        error: "POPULATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to populate roster from schedules",
      }
    }
  }

  /**
   * Calculate estimated cost for a shift based on employee's award and penalty rules
   * @param shift - Partial shift data with required fields
   * @param employee - Employee document
   * @returns Estimated cost in currency units
   */
  async calculateShiftCost(
    shift: {
      employeeId: mongoose.Types.ObjectId | null
      date: Date
      startTime: Date
      endTime: Date
      locationId: mongoose.Types.ObjectId
      roleId: mongoose.Types.ObjectId
    },
    employee: IEmployeeDocument
  ): Promise<number> {
    try {
      // If no employee assigned, return 0
      if (!shift.employeeId) {
        return 0
      }

      // Calculate scheduled hours
      const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60)

      // Get employee's active award at shift date
      const awardId = employee.awardId
      const awardLevel = employee.awardLevel
      const employmentType = employee.employmentType

      if (!awardId || !awardLevel || !employmentType) {
        // No award information, return 0
        return 0
      }

      // Fetch the award
      const award = await Award.findById(awardId)
      if (!award) {
        return 0
      }

      // Find the matching award level
      const level = award.levels.find((l: { label: string }) => l.label === awardLevel)
      if (!level) {
        return 0
      }

      // Find the matching condition set for employment type
      const conditionSet = level.conditions.find((c: { employmentType: string }) => c.employmentType === employmentType)
      if (!conditionSet || !conditionSet.payRule) {
        return 0
      }

      // Get base rate
      let baseRate = 0
      if (conditionSet.payRule.type === "hourly") {
        baseRate = conditionSet.payRule.rate || 0
      } else if (conditionSet.payRule.type === "salary") {
        // Calculate hourly rate from salary
        const annualAmount = conditionSet.payRule.annualAmount || 0
        const hoursPerWeek = conditionSet.payRule.hoursPerWeek || 38
        baseRate = annualAmount / (52 * hoursPerWeek)
      }

      // Check applicable penalty rules
      let adjustedRate = baseRate
      const dayOfWeek = shift.date.getDay() // 0=Sunday, 6=Saturday
      const startHour = shift.startTime.getUTCHours() + shift.startTime.getUTCMinutes() / 60
      const endHour = shift.endTime.getUTCHours() + shift.endTime.getUTCMinutes() / 60

      // Day name mapping
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const dayName = dayNames[dayOfWeek]

      for (const penaltyRule of conditionSet.penaltyRules) {
        let applies = false

        // Check if penalty rule applies
        if (penaltyRule.triggerType === "day_of_week") {
          if (penaltyRule.days && penaltyRule.days.includes(dayName)) {
            applies = true
          }
        } else if (penaltyRule.triggerType === "time_of_day") {
          if (
            penaltyRule.startHour !== null &&
            penaltyRule.endHour !== null &&
            startHour >= penaltyRule.startHour &&
            endHour <= penaltyRule.endHour
          ) {
            applies = true
          }
        }
        // Note: overtime_hours and public_holiday penalties are not applicable at roster creation time

        // Apply penalty if applicable
        if (applies) {
          if (penaltyRule.rateType === "multiplier") {
            if (penaltyRule.stackable) {
              adjustedRate *= penaltyRule.rateValue
            } else {
              adjustedRate = baseRate * penaltyRule.rateValue
            }
          } else if (penaltyRule.rateType === "flat_amount") {
            adjustedRate += penaltyRule.rateValue
          }
        }
      }

      // Calculate estimated cost
      const estimatedCost = hours * adjustedRate

      return Math.round(estimatedCost * 100) / 100 // Round to 2 decimal places
    } catch (error) {
      console.error("Error calculating shift cost:", error)
      return 0
    }
  }

  /**
   * Get roster for a specific week
   * @param weekId - ISO week identifier (YYYY-Www)
   * @returns The roster or error
   */
  async getRoster(
    weekId: string
  ): Promise<{ success: true; roster: IRoster } | { success: false; error: string; message: string }> {
    try {
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: `Roster not found for week ${weekId}`,
        }
      }

      return {
        success: true,
        roster: roster.toObject() as IRoster,
      }
    } catch (error) {
      return {
        success: false,
        error: "QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get roster",
      }
    }
  }

  /**
   * Add a new shift to a roster
   * Supports casual shifts (no sourceScheduleId) and vacant shifts (null employeeId)
   * @param weekId - ISO week identifier (YYYY-Www)
   * @param shiftData - Shift data to add
   * @returns The created shift or error
   */
  async addShift(
    weekId: string,
    shiftData: {
      employeeId?: mongoose.Types.ObjectId | null
      date: Date
      startTime: Date
      endTime: Date
      locationId: mongoose.Types.ObjectId
      roleId: mongoose.Types.ObjectId
      sourceScheduleId?: mongoose.Types.ObjectId | null
      notes?: string
    }
  ): Promise<{ success: true; shift: IShift } | { success: false; error: string; message: string }> {
    try {
      // Find the roster
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: `Roster not found for week ${weekId}`,
        }
      }

      // Validate shift data using basic validation
      const basicValidationResult = await this.validateShift(shiftData, weekId)
      if (!basicValidationResult.valid) {
        return {
          success: false,
          error: basicValidationResult.error || "VALIDATION_FAILED",
          message: basicValidationResult.message || "Shift validation failed",
        }
      }

      // Validate role/location/employee using SchedulingValidator
      const schedulingValidationResult = await this.schedulingValidator.validateShift(
        shiftData.employeeId ?? null,
        shiftData.roleId,
        shiftData.locationId,
        shiftData.date
      )

      if (!schedulingValidationResult.valid) {
        return {
          success: false,
          error: schedulingValidationResult.error || "SCHEDULING_VALIDATION_FAILED",
          message: schedulingValidationResult.message || "Shift scheduling validation failed",
        }
      }

      // Calculate estimated cost if employee is assigned
      let estimatedCost = 0
      if (shiftData.employeeId) {
        const employee = await Employee.findById(shiftData.employeeId)
        if (employee) {
          estimatedCost = await this.calculateShiftCost(
            {
              employeeId: shiftData.employeeId,
              date: shiftData.date,
              startTime: shiftData.startTime,
              endTime: shiftData.endTime,
              locationId: shiftData.locationId,
              roleId: shiftData.roleId,
            },
            employee
          )
        }
      }

      // Create the new shift
      const newShift: IShift = {
        _id: new mongoose.Types.ObjectId(),
        employeeId: shiftData.employeeId ?? null,
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        locationId: shiftData.locationId,
        roleId: shiftData.roleId,
        sourceScheduleId: shiftData.sourceScheduleId ?? null,
        estimatedCost,
        notes: shiftData.notes || "",
      }

      // Add shift to roster
      roster.shifts.push(newShift)
      await roster.save()

      return {
        success: true,
        shift: newShift,
      }
    } catch (error) {
      return {
        success: false,
        error: "ADD_SHIFT_FAILED",
        message: error instanceof Error ? error.message : "Failed to add shift",
      }
    }
  }

  /**
   * Update an existing shift in a roster
   * @param weekId - ISO week identifier (YYYY-Www)
   * @param shiftId - Shift ID to update
   * @param shiftData - Updated shift data
   * @returns The updated shift or error
   */
  async updateShift(
    weekId: string,
    shiftId: mongoose.Types.ObjectId | string,
    shiftData: Partial<{
      employeeId: mongoose.Types.ObjectId | null
      date: Date
      startTime: Date
      endTime: Date
      locationId: mongoose.Types.ObjectId
      roleId: mongoose.Types.ObjectId
      sourceScheduleId: mongoose.Types.ObjectId | null
      notes: string
    }>
  ): Promise<{ success: true; shift: IShift } | { success: false; error: string; message: string }> {
    try {
      // Find the roster
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: `Roster not found for week ${weekId}`,
        }
      }

      // Find the shift
      const shiftIdStr = shiftId.toString()
      const shiftIndex = roster.shifts.findIndex((s) => s._id.toString() === shiftIdStr)
      if (shiftIndex === -1) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: `Shift not found with id ${shiftId}`,
        }
      }

      const existingShift = roster.shifts[shiftIndex]

      // Merge existing shift data with updates
      const updatedShiftData = {
        employeeId: shiftData.employeeId !== undefined ? shiftData.employeeId : existingShift.employeeId,
        date: shiftData.date || existingShift.date,
        startTime: shiftData.startTime || existingShift.startTime,
        endTime: shiftData.endTime || existingShift.endTime,
        locationId: shiftData.locationId || existingShift.locationId,
        roleId: shiftData.roleId || existingShift.roleId,
        sourceScheduleId:
          shiftData.sourceScheduleId !== undefined
            ? shiftData.sourceScheduleId
            : existingShift.sourceScheduleId,
        notes: shiftData.notes !== undefined ? shiftData.notes : existingShift.notes,
      }

      // Validate updated shift data using basic validation
      const basicValidationResult = await this.validateShift(updatedShiftData, weekId)
      if (!basicValidationResult.valid) {
        return {
          success: false,
          error: basicValidationResult.error || "VALIDATION_FAILED",
          message: basicValidationResult.message || "Shift validation failed",
        }
      }

      // Validate role/location/employee using SchedulingValidator
      const schedulingValidationResult = await this.schedulingValidator.validateShift(
        updatedShiftData.employeeId,
        updatedShiftData.roleId,
        updatedShiftData.locationId,
        updatedShiftData.date
      )

      if (!schedulingValidationResult.valid) {
        return {
          success: false,
          error: schedulingValidationResult.error || "SCHEDULING_VALIDATION_FAILED",
          message: schedulingValidationResult.message || "Shift scheduling validation failed",
        }
      }

      // Recalculate estimated cost if employee is assigned
      let estimatedCost = existingShift.estimatedCost
      if (updatedShiftData.employeeId) {
        const employee = await Employee.findById(updatedShiftData.employeeId)
        if (employee) {
          estimatedCost = await this.calculateShiftCost(
            {
              employeeId: updatedShiftData.employeeId,
              date: updatedShiftData.date,
              startTime: updatedShiftData.startTime,
              endTime: updatedShiftData.endTime,
              locationId: updatedShiftData.locationId,
              roleId: updatedShiftData.roleId,
            },
            employee
          )
        }
      } else {
        // No employee assigned, set cost to 0
        estimatedCost = 0
      }

      // Update the shift
      const updatedShift: IShift = {
        _id: existingShift._id,
        employeeId: updatedShiftData.employeeId,
        date: updatedShiftData.date,
        startTime: updatedShiftData.startTime,
        endTime: updatedShiftData.endTime,
        locationId: updatedShiftData.locationId,
        roleId: updatedShiftData.roleId,
        sourceScheduleId: updatedShiftData.sourceScheduleId,
        estimatedCost,
        notes: updatedShiftData.notes,
      }

      roster.shifts[shiftIndex] = updatedShift
      await roster.save()

      return {
        success: true,
        shift: updatedShift,
      }
    } catch (error) {
      return {
        success: false,
        error: "UPDATE_SHIFT_FAILED",
        message: error instanceof Error ? error.message : "Failed to update shift",
      }
    }
  }

  /**
   * Delete a shift from a roster
   * @param weekId - ISO week identifier (YYYY-Www)
   * @param shiftId - Shift ID to delete
   * @returns Success status or error
   */
  async deleteShift(
    weekId: string,
    shiftId: mongoose.Types.ObjectId | string
  ): Promise<{ success: true } | { success: false; error: string; message: string }> {
    try {
      // Find the roster
      const roster = await Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: `Roster not found for week ${weekId}`,
        }
      }

      // Find the shift
      const shiftIdStr = shiftId.toString()
      const shiftIndex = roster.shifts.findIndex((s) => s._id.toString() === shiftIdStr)
      if (shiftIndex === -1) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: `Shift not found with id ${shiftId}`,
        }
      }

      // Remove the shift
      roster.shifts.splice(shiftIndex, 1)
      await roster.save()

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: "DELETE_SHIFT_FAILED",
        message: error instanceof Error ? error.message : "Failed to delete shift",
      }
    }
  }

  /**
   * Validate shift data with all validation rules
   * @param shiftData - Shift data to validate
   * @param weekId - ISO week identifier for boundary validation
   * @returns Validation result
   */
  async validateShift(
    shiftData: {
      employeeId?: mongoose.Types.ObjectId | null
      date: Date
      startTime: Date
      endTime: Date
      locationId: mongoose.Types.ObjectId
      roleId: mongoose.Types.ObjectId
    },
    weekId: string
  ): Promise<{ valid: boolean; error?: string; message?: string }> {
    // Get week boundaries
    const { start: weekStartDate, end: weekEndDate } = getWeekBoundaries(weekId)

    // Use the validation function from the validation module
    return await validateShiftData(
      {
        employeeId: shiftData.employeeId,
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        locationId: shiftData.locationId,
        roleId: shiftData.roleId,
      },
      weekStartDate,
      weekEndDate
    )
  }

    /**
     * Publish a roster (change status from "draft" to "published")
     * @param weekId - ISO week identifier (YYYY-Www)
     * @returns Success status or error
     */
    async publishRoster(
      weekId: string
    ): Promise<{ success: true; roster: IRoster } | { success: false; error: string; message: string }> {
      try {
        const roster = await Roster.findOne({ weekId })
        if (!roster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Roster not found for week ${weekId}`,
          }
        }

        // Update status to published
        roster.status = "published"
        await roster.save()

        return {
          success: true,
          roster: roster.toObject() as IRoster,
        }
      } catch (error) {
        return {
          success: false,
          error: "PUBLISH_FAILED",
          message: error instanceof Error ? error.message : "Failed to publish roster",
        }
      }
    }

    /**
     * Unpublish a roster (change status from "published" to "draft")
     * @param weekId - ISO week identifier (YYYY-Www)
     * @returns Success status or error
     */
    async unpublishRoster(
      weekId: string
    ): Promise<{ success: true; roster: IRoster } | { success: false; error: string; message: string }> {
      try {
        const roster = await Roster.findOne({ weekId })
        if (!roster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Roster not found for week ${weekId}`,
          }
        }

        // Update status to draft
        roster.status = "draft"
        await roster.save()

        return {
          success: true,
          roster: roster.toObject() as IRoster,
        }
      } catch (error) {
        return {
          success: false,
          error: "UNPUBLISH_FAILED",
          message: error instanceof Error ? error.message : "Failed to unpublish roster",
        }
      }
    }

    /**
     * Delete a roster
     * Published rosters cannot be deleted (must be unpublished first)
     * @param weekId - ISO week identifier (YYYY-Www)
     * @returns Success status or error
     */
    async deleteRoster(
      weekId: string
    ): Promise<{ success: true } | { success: false; error: string; message: string }> {
      try {
        const roster = await Roster.findOne({ weekId })
        if (!roster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Roster not found for week ${weekId}`,
          }
        }

        // Check if roster is published
        if (roster.status === "published") {
          return {
            success: false,
            error: "ROSTER_PUBLISHED",
            message: "Cannot delete published roster. Unpublish it first.",
          }
        }

        // Delete the roster
        await Roster.deleteOne({ weekId })

        return {
          success: true,
        }
      } catch (error) {
        return {
          success: false,
          error: "DELETE_FAILED",
          message: error instanceof Error ? error.message : "Failed to delete roster",
        }
      }
    }

    /**
     * Copy shifts from one week to another
     * @param targetWeekId - Week to copy shifts to
     * @param sourceWeekId - Week to copy shifts from
     * @returns Success status or error
     */
    async copyRosterFromWeek(
      targetWeekId: string,
      sourceWeekId: string
    ): Promise<{ success: true; shiftsCreated: number } | { success: false; error: string; message: string }> {
      try {
        // Find target roster
        const targetRoster = await Roster.findOne({ weekId: targetWeekId })
        if (!targetRoster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Target roster not found for week ${targetWeekId}`,
          }
        }

        // Find source roster
        const sourceRoster = await Roster.findOne({ weekId: sourceWeekId })
        if (!sourceRoster) {
          return {
            success: false,
            error: "SOURCE_ROSTER_NOT_FOUND",
            message: `Source roster not found for week ${sourceWeekId}`,
          }
        }

        if (sourceRoster.shifts.length === 0) {
          return {
            success: false,
            error: "NO_SHIFTS_TO_COPY",
            message: `Source roster for week ${sourceWeekId} has no shifts`,
          }
        }

        // Calculate week boundaries
        const { start: targetWeekStart } = getWeekBoundaries(targetWeekId)
        const { start: sourceWeekStart } = getWeekBoundaries(sourceWeekId)

        // Calculate day offset between weeks
        const dayOffset = Math.round(
          (targetWeekStart.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24)
        )

        const copiedShifts: IShift[] = []

        // Copy each shift with adjusted dates
        for (const sourceShift of sourceRoster.shifts) {
          const newShiftDate = addDays(new Date(sourceShift.date), dayOffset)
          const newStartTime = addDays(new Date(sourceShift.startTime), dayOffset)
          const newEndTime = addDays(new Date(sourceShift.endTime), dayOffset)

          // Recalculate cost if employee is assigned
          let estimatedCost = 0
          if (sourceShift.employeeId) {
            const employee = await Employee.findById(sourceShift.employeeId)
            if (employee) {
              estimatedCost = await this.calculateShiftCost(
                {
                  employeeId: sourceShift.employeeId,
                  date: newShiftDate,
                  startTime: newStartTime,
                  endTime: newEndTime,
                  locationId: sourceShift.locationId,
                  roleId: sourceShift.roleId,
                },
                employee
              )
            }
          }

          const copiedShift: IShift = {
            _id: new mongoose.Types.ObjectId(),
            employeeId: sourceShift.employeeId,
            date: newShiftDate,
            startTime: newStartTime,
            endTime: newEndTime,
            locationId: sourceShift.locationId,
            roleId: sourceShift.roleId,
            sourceScheduleId: null, // Copied shifts are manual (not from schedule)
            estimatedCost,
            notes: sourceShift.notes,
          }

          copiedShifts.push(copiedShift)
        }

        // Add copied shifts to target roster
        targetRoster.shifts.push(...copiedShifts)
        await targetRoster.save()

        return {
          success: true,
          shiftsCreated: copiedShifts.length,
        }
      } catch (error) {
        return {
          success: false,
          error: "COPY_FAILED",
          message: error instanceof Error ? error.message : "Failed to copy roster",
        }
      }
    }

    /**
     * Detect staffing gaps in a roster
     * Identifies time slots that need more coverage
     * @param weekId - ISO week identifier (YYYY-Www)
     * @returns Gaps with suggested casual employees or error
     */
    async detectGaps(
      weekId: string
    ): Promise<
      | { success: true; gaps: Array<any> }
      | { success: false; error: string; message: string }
    > {
      try {
        // Find the roster
        const roster = await Roster.findOne({ weekId })
        if (!roster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Roster not found for week ${weekId}`,
          }
        }

        // Group shifts by date, location, and role
        const shiftsBySlot = new Map<string, IShift[]>()

        for (const shift of roster.shifts) {
          if (!shift.employeeId) continue // Skip vacant shifts

          const slotKey = `${shift.date.toISOString().split("T")[0]}_${shift.locationId}_${shift.roleId}_${shift.startTime.toISOString()}_${shift.endTime.toISOString()}`

          if (!shiftsBySlot.has(slotKey)) {
            shiftsBySlot.set(slotKey, [])
          }
          shiftsBySlot.get(slotKey)!.push(shift)
        }

        // For now, return vacant shifts as gaps
        // In a real implementation, you'd compare against staffing requirements
        const vacantShifts = roster.shifts.filter((shift) => shift.employeeId === null)

        const gaps = vacantShifts.map((shift) => ({
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          locationId: shift.locationId,
          roleId: shift.roleId,
          currentCoverage: 0,
          requiredCoverage: 1,
          gap: 1,
          shiftId: shift._id,
        }))

        return {
          success: true,
          gaps,
        }
      } catch (error) {
        return {
          success: false,
          error: "GAP_DETECTION_FAILED",
          message: error instanceof Error ? error.message : "Failed to detect gaps",
        }
      }
    }


}
