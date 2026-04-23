import mongoose from "mongoose"
import type { IRoster, IShift, IEmployeeDocument, ISchedule } from "@/lib/db/queries/scheduling-types"
import { getISOWeek, getISOWeekYear, addDays } from "date-fns"
import { SchedulingValidator } from "../validations/scheduling-validator"
import { setTimeFromDecimalHours } from "../utils/format/decimal-hours"
import { SchedulingModels } from "@/lib/db/queries/scheduling-models"
import { getWeekBoundaries as getWeekBoundariesFn } from "@/lib/db/queries/scheduling-types"
import { Award } from "@/lib/db/schemas/award"

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
      const existingRoster = await SchedulingModels.Roster.findOne({ weekId })
      if (existingRoster) {
        return {
          success: false,
          error: "DUPLICATE_WEEK",
          message: `Roster already exists for week ${weekId}`,
        }
      }

      // Calculate week boundaries
      const { start: weekStartDate, end: weekEndDate } = getWeekBoundariesFn(weekId)
      const year = getISOWeekYear(weekStartDate)
      const weekNumber = getISOWeek(weekStartDate)

      // Create new roster with empty shifts array
      const newRoster = new SchedulingModels.Roster({
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
      }

      // Reload the roster to get populated shifts
      const roster = await SchedulingModels.Roster.findOne({ weekId })
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
   * Implements three-tier hierarchy: Employee_Schedule → Role_Template → Award_Standard
   * @param weekId - ISO week identifier (YYYY-Www)
   * @param includeEmploymentTypes - Optional filter for employment types (e.g., ["Full-time", "Part-time"])
   * @param locationIds - Optional filter for specific locations
   * @returns Success status or error
   */
  async populateRosterFromSchedules(
    weekId: string,
    includeEmploymentTypes?: string[],
    locationIds?: string[]
  ): Promise<{ success: true; shiftsCreated: number } | { success: false; error: string; message: string }> {
    try {
      // Find the roster
      const roster = await SchedulingModels.Roster.findOne({ weekId })
      if (!roster) {
        return {
          success: false,
          error: "ROSTER_NOT_FOUND",
          message: `Roster not found for week ${weekId}`,
        }
      }

      // Calculate week boundaries
      const { start: weekStartDate, end: weekEndDate } = getWeekBoundariesFn(weekId)

      // Build query for employees - don't require schedules, we'll use hierarchy
      const query: any = {}

      // Filter by employment type if specified (case-insensitive)
      if (includeEmploymentTypes && includeEmploymentTypes.length > 0) {
        // Create case-insensitive regex patterns for each employment type
        const typePatterns = includeEmploymentTypes.map(type => 
          new RegExp(`^${type}$`, 'i')
        )
        query.employmentType = { $in: typePatterns }
      }

      // Filter by location if specified
      if (locationIds && locationIds.length > 0) {
        // Import EmployeeTeamAssignment to filter by location
        const EmployeeTeamAssignment = (SchedulingModels as any).EmployeeTeamAssignment
        
        // Find employees who have role assignments at the specified locations
        const locationObjectIds = locationIds.map(id => new mongoose.Types.ObjectId(id))
        const roleAssignments = await EmployeeTeamAssignment.find({
          locationId: { $in: locationObjectIds },
          isActive: true,
        }).distinct('employeeId')
        
        // Add to query
        query._id = { $in: roleAssignments }
        

      }

      // Query ALL employees (not just those with schedules)
      const employees = await SchedulingModels.Employee.find(query)



      // Import Location model and EmployeeTeamAssignment to fetch role assignments
      const Location = SchedulingModels.Location
      const EmployeeTeamAssignment = (SchedulingModels as any).EmployeeTeamAssignment
      const { WorkingHoursHierarchy } = await import("@/lib/managers/working-hours-hierarchy")
      const workingHoursHierarchy = new WorkingHoursHierarchy()

      const generatedShifts: IShift[] = []
      const filteredEmployees: Array<{ employeeName: string; reason: string }> = []
      const skippedEmployees: Array<{ employeeName: string; reason: string }> = []

      // Process each employee
      for (const employee of employees) {


        // Try to resolve working hours using three-tier hierarchy
        const workingHoursConfig = await workingHoursHierarchy.resolveWorkingHours(employee._id)
        
        if (!workingHoursConfig) {
          skippedEmployees.push({
            employeeName: employee.name,
            reason: "No working hours configuration found (no employee schedule, role template, or award standard)",
          })

          continue
        }



        // If employee has schedules, use them
        if (employee.schedules && employee.schedules.length > 0) {
          await this.processEmployeeSchedules(
            employee,
            weekStartDate,
            weekEndDate,
            weekId,
            generatedShifts,
            filteredEmployees,
            Location
          )
        } else {
          // No employee schedules - generate from role assignments using Award ∩ Role ∩ Location

          await this.generateShiftsFromRoleAssignments(
            employee,
            workingHoursConfig.standardHoursPerWeek,
            weekStartDate,
            weekEndDate,
            weekId,
            generatedShifts,
            skippedEmployees,
            EmployeeTeamAssignment,
            Location,
            locationIds
          )
        }
      }

      // Log summary




      // Add generated shifts to roster
      roster.shifts.push(...generatedShifts)
      await roster.save()

      // Provide helpful message if no shifts were created


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
   * Helper method to process employee schedules and generate shifts
   */
  private async processEmployeeSchedules(
    employee: any,
    weekStartDate: Date,
    weekEndDate: Date,
    weekId: string,
    generatedShifts: IShift[],
    filteredEmployees: Array<{ employeeName: string; reason: string }>,
    Location: any
  ): Promise<void> {
    // Filter schedules that are active during this week
    const activeSchedules = employee.schedules.filter((schedule: ISchedule) => {
      const effectiveFrom = new Date(schedule.effectiveFrom)
      const effectiveTo = schedule.effectiveTo ? new Date(schedule.effectiveTo) : null

      // Check if the week overlaps with the schedule's effective date range
      const isAfterStart = weekEndDate >= effectiveFrom
      const isBeforeEnd = effectiveTo === null || weekStartDate <= effectiveTo

      return isAfterStart && isBeforeEnd
    })





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
        filteredEmployees.push({
          employeeName: employee.name,
          reason: validationResult.message || validationResult.error || "Validation failed",
        })
        continue
      }

      // Fetch location details to check opening/closing hours
      const location = await Location.findById(schedule.locationId)
      
      // Create shift times
      const scheduleStartTime = new Date(schedule.startTime)
      const scheduleEndTime = new Date(schedule.endTime)

      let shiftStartTime = new Date(shiftDate)
      shiftStartTime.setUTCHours(
        scheduleStartTime.getUTCHours(),
        scheduleStartTime.getUTCMinutes(),
        0,
        0
      )

      let shiftEndTime = new Date(shiftDate)
      shiftEndTime.setUTCHours(scheduleEndTime.getUTCHours(), scheduleEndTime.getUTCMinutes(), 0, 0)

      // If end time is before or equal to start time, shift spans midnight
      if (shiftEndTime <= shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1)
      }

      // Check if shift fits within location operating hours
      if (location && location.openingHour !== undefined && location.closingHour !== undefined) {
        const shiftStartHour = shiftStartTime.getUTCHours() + shiftStartTime.getUTCMinutes() / 60
        const shiftEndHour = shiftEndTime.getUTCHours() + shiftEndTime.getUTCMinutes() / 60
        const spansMultipleDays = shiftEndTime.getDate() !== shiftStartTime.getDate()
        
        if (!spansMultipleDays) {
          if (shiftStartHour < location.openingHour || shiftEndHour > location.closingHour) {
            filteredEmployees.push({
              employeeName: employee.name,
              reason: `Shift (${shiftStartHour.toFixed(1)}-${shiftEndHour.toFixed(1)}) outside location hours (${location.openingHour}-${location.closingHour})`,
            })
            continue
          }
        }
      }

      // Calculate estimated cost
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

  /**
   * Generate shifts from role assignments using Award ∩ Role ∩ Location intersection
   * This implements the core scheduling logic when employees don't have explicit schedules
   */
  private async generateShiftsFromRoleAssignments(
    employee: any,
    standardHoursPerWeek: number,
    weekStartDate: Date,
    weekEndDate: Date,
    weekId: string,
    generatedShifts: IShift[],
    skippedEmployees: Array<{ employeeName: string; reason: string }>,
    EmployeeTeamAssignment: any,
    Location: any,
    locationIds?: string[]
  ): Promise<void> {
    try {
      // Build query for role assignments
      const assignmentQuery: any = {
        employeeId: employee._id,
        isActive: true,
      }
      
      // Filter by location if specified
      if (locationIds && locationIds.length > 0) {
        const mongoose = await import("mongoose")
        assignmentQuery.locationId = { 
          $in: locationIds.map(id => new mongoose.Types.ObjectId(id)) 
        }
      }
      
      // Get active role assignments for this employee
      const roleAssignments = await EmployeeTeamAssignment.find(assignmentQuery)
        .populate('teamId')
        .populate('locationId')

      if (!roleAssignments || roleAssignments.length === 0) {
        skippedEmployees.push({
          employeeName: employee.name,
          reason: "No active role assignments found",
        })
        return
      }



      // Get award details for employment type
      let award = null
      if (employee.awardId) {
        award = await Award.findById(employee.awardId)
      }

      const employmentType = employee.employmentType || "FULL_TIME"
      const isFullTime = employmentType.toUpperCase().includes("FULL")
      const isPartTime = employmentType.toUpperCase().includes("PART")



      // Process each role assignment
      for (const assignment of roleAssignments) {
        const role = assignment.teamId
        const location = assignment.locationId

        if (!role || !location) {

          continue
        }

        // Get role template (shift pattern)
        const roleTemplate = role.defaultScheduleTemplate
        if (!roleTemplate || !roleTemplate.shiftPattern) {

          continue
        }

        const shiftPattern = roleTemplate.shiftPattern
        const roleDays = shiftPattern.dayOfWeek || []
        const roleStartHour = shiftPattern.startHour !== undefined ? shiftPattern.startHour : 9
        const roleEndHour = shiftPattern.endHour !== undefined ? shiftPattern.endHour : 17

        // Get location operating hours
        const locationStartHour = location.openingHour !== undefined ? location.openingHour : 0
        const locationEndHour = location.closingHour !== undefined ? location.closingHour : 24
        const locationWorkingDays = location.workingDays || [1, 2, 3, 4, 5] // Default Mon-Fri



        // Calculate intersection of role days and location days
        const workableDays = roleDays.filter((day: number) => locationWorkingDays.includes(day))
        
        if (workableDays.length === 0) {

          continue
        }

        // Calculate shift time window (intersection of role and location hours)
        const shiftStartHour = Math.max(roleStartHour, locationStartHour)
        const shiftEndHour = Math.min(roleEndHour, locationEndHour)

        if (shiftStartHour >= shiftEndHour) {

          continue
        }

        const hoursPerShift = shiftEndHour - shiftStartHour


        // Calculate how many shifts needed to meet weekly hours
        let shiftsNeeded: number
        let daysToSchedule: number[]

        if (isFullTime) {
          // Full-time: spread hours evenly across all workable days
          shiftsNeeded = Math.min(workableDays.length, Math.ceil(standardHoursPerWeek / hoursPerShift))
          daysToSchedule = workableDays.slice(0, shiftsNeeded)
        } else if (isPartTime) {
          // Part-time: fewer days, respect min/max hours
          shiftsNeeded = Math.min(workableDays.length, Math.ceil(standardHoursPerWeek / hoursPerShift))
          daysToSchedule = workableDays.slice(0, shiftsNeeded)
        } else {
          // Casual: use all available days but shorter shifts
          daysToSchedule = workableDays
        }



        // Generate shifts for each scheduled day
        for (const dayOfWeek of daysToSchedule) {
          // Calculate the actual date for this day in the week
          // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
          // weekStartDate is Monday, so we need to adjust
          const shiftDate = addDays(weekStartDate, dayOfWeek === 0 ? 6 : dayOfWeek - 1)

          // Ensure the shift date falls within the week boundaries
          if (shiftDate < weekStartDate || shiftDate > weekEndDate) {
            continue
          }

          // Validate role assignment before creating shift
          const validationResult = await this.schedulingValidator.validateShift(
            employee._id,
            role._id,
            location._id,
            shiftDate
          )

          if (!validationResult.valid) {

            continue
          }

          // Create shift times (use local time, not UTC)
          const shiftStartTime = new Date(shiftDate)
          setTimeFromDecimalHours(shiftStartTime, shiftStartHour)

          const shiftEndTime = new Date(shiftDate)
          setTimeFromDecimalHours(shiftEndTime, shiftEndHour)

          // Calculate estimated cost
          const estimatedCost = await this.calculateShiftCost(
            {
              employeeId: employee._id,
              date: shiftDate,
              startTime: shiftStartTime,
              endTime: shiftEndTime,
              locationId: location._id,
              roleId: role._id,
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
            locationId: location._id,
            roleId: role._id,
            sourceScheduleId: null, // Auto-generated, not from a schedule
            estimatedCost,
            notes: `Auto-generated from ${employmentType} award (${standardHoursPerWeek}h/week)`,
          }

          generatedShifts.push(shift)

        }
      }
    } catch (error) {
      skippedEmployees.push({
        employeeName: employee.name,
        reason: `Error generating shifts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
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
      const award = await SchedulingModels.Award.findById(awardId)
      if (!award) {
        return 0
      }

      // Find the matching award level
      const levels = (award as any)?.levels
      if (!Array.isArray(levels)) return 0
      const level = levels.find((l: { label: string }) => l.label === awardLevel)
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
      const roster = await SchedulingModels.Roster.findOne({ weekId })
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
      const roster = await SchedulingModels.Roster.findOne({ weekId })
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
        const employee = await SchedulingModels.Employee.findById(shiftData.employeeId)
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
        status: "draft",
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
      status: "draft" | "published"
    }>
  ): Promise<{ success: true; shift: IShift } | { success: false; error: string; message: string }> {
    try {
      // Find the roster
      const roster = await SchedulingModels.Roster.findOne({ weekId })
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
        status:
          shiftData.status !== undefined
            ? shiftData.status
            : existingShift.status ?? "published",
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
        const employee = await SchedulingModels.Employee.findById(updatedShiftData.employeeId)
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
        status: updatedShiftData.status,
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
      const roster = await SchedulingModels.Roster.findOne({ weekId })
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
    const { start: weekStartDate, end: weekEndDate } = getWeekBoundariesFn(weekId)

    // Basic validation
    if (!shiftData.employeeId || !shiftData.date || !shiftData.startTime || !shiftData.endTime) {
      return { valid: false, error: 'Missing required shift data' }
    }

    // Validate date is within week boundaries
    const shiftDate = new Date(shiftData.date)
    if (shiftDate < weekStartDate || shiftDate > weekEndDate) {
      return { valid: false, error: 'Shift date is outside week boundaries' }
    }

    return { valid: true }
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
        const roster = await SchedulingModels.Roster.findOne({ weekId })
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
     * Publish only shifts in scope (embedded shift.status). Other shifts stay draft.
     */
    async publishShiftsInScope(
      weekId: string,
      locationId: mongoose.Types.ObjectId | string,
      roleIds: Array<mongoose.Types.ObjectId | string>
    ): Promise<{ success: true; roster: IRoster; publishedCount: number } | { success: false; error: string; message: string }> {
      try {
        const roster = await SchedulingModels.Roster.findOne({ weekId })
        if (!roster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Roster not found for week ${weekId}`,
          }
        }

        const locId = locationId.toString()
        const roleSet = new Set(roleIds.map((r) => r.toString()))
        let publishedCount = 0

        for (const shift of roster.shifts) {
          const matchesLoc = shift.locationId.toString() === locId
          const matchesRole = roleSet.has(shift.roleId.toString())
          if (matchesLoc && matchesRole) {
            shift.status = "published"
            publishedCount++
          }
        }

        await roster.save()

        return {
          success: true,
          roster: roster.toObject() as IRoster,
          publishedCount,
        }
      } catch (error) {
        return {
          success: false,
          error: "PUBLISH_FAILED",
          message: error instanceof Error ? error.message : "Failed to publish shifts",
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
        const roster = await SchedulingModels.Roster.findOne({ weekId })
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
        const roster = await SchedulingModels.Roster.findOne({ weekId })
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
        await SchedulingModels.Roster.deleteOne({ weekId })

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
        const targetRoster = await SchedulingModels.Roster.findOne({ weekId: targetWeekId })
        if (!targetRoster) {
          return {
            success: false,
            error: "ROSTER_NOT_FOUND",
            message: `Target roster not found for week ${targetWeekId}`,
          }
        }

        // Find source roster
        const sourceRoster = await SchedulingModels.Roster.findOne({ weekId: sourceWeekId })
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
        const { start: targetWeekStart } = getWeekBoundariesFn(targetWeekId)
        const { start: sourceWeekStart } = getWeekBoundariesFn(sourceWeekId)

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
            const employee = await SchedulingModels.Employee.findById(sourceShift.employeeId)
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
            status: "draft",
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
        const roster = await SchedulingModels.Roster.findOne({ weekId })
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
