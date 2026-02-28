import mongoose from "mongoose"
import { Roster, IRoster, IShift } from "../db/schemas/roster"
import { Timesheet, ITimesheetDocument } from "../db/schemas/timesheet"
import { Employee, IEmployeeDocument } from "../db/schemas/employee"
import Award from "../db/schemas/award"

/**
 * Variance Analytics Service
 * Responsible for calculating variances, detecting no-shows, and generating reports
 */
export class VarianceAnalyticsService {
  /**
   * Calculate variance between scheduled and actual worked hours for a shift
   * Supports multiple timesheets per shift (sums all linked timesheet hours)
   * @param shiftId - Shift ID
   * @returns Variance data or error
   */
  async calculateVariance(
    shiftId: mongoose.Types.ObjectId | string
  ): Promise<
    | {
        success: true
        scheduledHours: number
        actualHours: number
        variance: number
        timesheetCount: number
      }
    | { success: false; error: string; message: string }
  > {
    try {
      // Find the roster containing this shift
      const roster = await Roster.findOne({ "shifts._id": shiftId })
      if (!roster) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: "Shift not found",
        }
      }

      // Find the specific shift
      const shift = roster.shifts.find((s) => s._id.toString() === shiftId.toString())
      if (!shift) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: "Shift not found",
        }
      }

      // Calculate scheduled hours from shift times
      const scheduledHours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60)

      // Find all timesheets linked to this shift
      const timesheets = await Timesheet.find({ scheduleShiftId: shiftId })

      // Calculate total actual hours from all linked timesheets
      let actualHours = 0
      for (const timesheet of timesheets) {
        // Find the corresponding clock-out entry
        const clockIn = timesheet.type === "in" ? timesheet : null
        if (clockIn && clockIn.time) {
          // Find matching clock-out for this clock-in
          const clockOut = await Timesheet.findOne({
            pin: timesheet.pin,
            date: timesheet.date,
            type: "out",
            time: { $gte: clockIn.time },
          }).sort({ time: 1 })

          if (clockOut && clockOut.time) {
            // Parse times and calculate hours
            const [inHours, inMinutes] = clockIn.time.split(":").map(Number)
            const [outHours, outMinutes] = clockOut.time.split(":").map(Number)

            const inTotalMinutes = inHours * 60 + inMinutes
            const outTotalMinutes = outHours * 60 + outMinutes

            const workedMinutes = outTotalMinutes - inTotalMinutes
            actualHours += workedMinutes / 60
          }
        }
      }

      // Calculate variance (actual - scheduled)
      const variance = Math.round((actualHours - scheduledHours) * 100) / 100

      return {
        success: true,
        scheduledHours: Math.round(scheduledHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        variance,
        timesheetCount: timesheets.length,
      }
    } catch (error) {
      return {
        success: false,
        error: "CALCULATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to calculate variance",
      }
    }
  }

  /**
   * Detect no-show shifts in a roster
   * Filters for published rosters only and checks shifts where end time has passed
   * @param weekId - ISO week identifier (YYYY-Www)
   * @returns Array of no-show shifts or error
   */
  async detectNoShows(
    weekId: string
  ): Promise<
    { success: true; noShows: IShift[] } | { success: false; error: string; message: string }
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

      // Check if roster is published
      if (roster.status !== "published") {
        return {
          success: true,
          noShows: [], // Only check published rosters
        }
      }

      const currentTime = new Date()
      const noShows: IShift[] = []

      // Check each shift
      for (const shift of roster.shifts) {
        // Skip if shift end time hasn't passed yet
        if (shift.endTime > currentTime) {
          continue
        }

        // Check if any timesheets are linked to this shift
        const timesheetCount = await Timesheet.countDocuments({ scheduleShiftId: shift._id })

        if (timesheetCount === 0) {
          noShows.push(shift)
        }
      }

      return {
        success: true,
        noShows,
      }
    } catch (error) {
      return {
        success: false,
        error: "DETECTION_FAILED",
        message: error instanceof Error ? error.message : "Failed to detect no-shows",
      }
    }
  }

  /**
   * Calculate punctuality for a shift
   * Compares actual clock-in time to scheduled start time
   * @param shiftId - Shift ID
   * @returns Punctuality status or error
   */
  async calculatePunctuality(
    shiftId: mongoose.Types.ObjectId | string
  ): Promise<
    | {
        success: true
        status: "early" | "late" | "on-time"
        minutes: number
      }
    | { success: false; error: string; message: string }
  > {
    try {
      // Find the roster containing this shift
      const roster = await Roster.findOne({ "shifts._id": shiftId })
      if (!roster) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: "Shift not found",
        }
      }

      // Find the specific shift
      const shift = roster.shifts.find((s) => s._id.toString() === shiftId.toString())
      if (!shift) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: "Shift not found",
        }
      }

      // Find the first clock-in timesheet for this shift
      const clockInTimesheet = await Timesheet.findOne({
        scheduleShiftId: shiftId,
        type: "in",
      }).sort({ time: 1 })

      if (!clockInTimesheet || !clockInTimesheet.time) {
        return {
          success: false,
          error: "NO_TIMESHEET",
          message: "No clock-in timesheet found for this shift",
        }
      }

      // Parse clock-in time
      const [clockInHours, clockInMinutes] = clockInTimesheet.time.split(":").map(Number)
      const clockInDate = new Date(shift.date)
      clockInDate.setUTCHours(clockInHours, clockInMinutes, 0, 0)

      // Calculate time difference in minutes
      const diffMs = clockInDate.getTime() - shift.startTime.getTime()
      const diffMinutes = Math.round(diffMs / (1000 * 60))

      // Determine status
      let status: "early" | "late" | "on-time"
      let minutes: number

      if (diffMinutes < 0) {
        status = "early"
        minutes = Math.abs(diffMinutes)
      } else if (diffMinutes > 0) {
        status = "late"
        minutes = diffMinutes
      } else {
        status = "on-time"
        minutes = 0
      }

      return {
        success: true,
        status,
        minutes,
      }
    } catch (error) {
      return {
        success: false,
        error: "CALCULATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to calculate punctuality",
      }
    }
  }

  /**
   * Calculate actual cost for a shift based on linked timesheets and award conditions
   * @param shiftId - Shift ID
   * @returns Actual cost or error
   */
  async calculateActualCost(
    shiftId: mongoose.Types.ObjectId | string
  ): Promise<{ success: true; actualCost: number } | { success: false; error: string; message: string }> {
    try {
      // Find the roster containing this shift
      const roster = await Roster.findOne({ "shifts._id": shiftId })
      if (!roster) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: "Shift not found",
        }
      }

      // Find the specific shift
      const shift = roster.shifts.find((s) => s._id.toString() === shiftId.toString())
      if (!shift) {
        return {
          success: false,
          error: "SHIFT_NOT_FOUND",
          message: "Shift not found",
        }
      }

      // If no employee assigned, return 0
      if (!shift.employeeId) {
        return {
          success: true,
          actualCost: 0,
        }
      }

      // Get employee
      const employee = await Employee.findById(shift.employeeId)
      if (!employee) {
        return {
          success: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        }
      }

      // Calculate actual hours worked
      const varianceResult = await this.calculateVariance(shiftId)
      if (!varianceResult.success) {
        return {
          success: false,
          error: varianceResult.error,
          message: varianceResult.message,
        }
      }

      const actualHours = varianceResult.actualHours

      // If no hours worked, return 0
      if (actualHours === 0) {
        return {
          success: true,
          actualCost: 0,
        }
      }

      // Get employee's award information
      const awardId = employee.awardId
      const awardLevel = employee.awardLevel
      const employmentType = employee.employmentType

      if (!awardId || !awardLevel || !employmentType) {
        return {
          success: true,
          actualCost: 0, // No award information
        }
      }

      // Fetch the award
      const award = await Award.findById(awardId)
      if (!award) {
        return {
          success: true,
          actualCost: 0,
        }
      }

      // Find the matching award level
      const level = award.levels.find((l: { label: string }) => l.label === awardLevel)
      if (!level) {
        return {
          success: true,
          actualCost: 0,
        }
      }

      // Find the matching condition set for employment type
      const conditionSet = level.conditions.find(
        (c: { employmentType: string }) => c.employmentType === employmentType
      )
      if (!conditionSet || !conditionSet.payRule) {
        return {
          success: true,
          actualCost: 0,
        }
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

      // Check applicable penalty rules based on actual shift times
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
        } else if (penaltyRule.triggerType === "overtime_hours") {
          // Check if actual hours exceed threshold
          if (penaltyRule.thresholdHours !== null && actualHours > penaltyRule.thresholdHours) {
            applies = true
          }
        }
        // Note: public_holiday penalties would require additional context

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

      // Calculate actual cost
      const actualCost = actualHours * adjustedRate

      return {
        success: true,
        actualCost: Math.round(actualCost * 100) / 100, // Round to 2 decimal places
      }
    } catch (error) {
      return {
        success: false,
        error: "CALCULATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to calculate actual cost",
      }
    }
  }

  /**
   * Generate weekly report for entire roster
   * Aggregates variance, no-shows, and punctuality data
   * @param weekId - ISO week identifier (YYYY-Www)
   * @returns Weekly report or error
   */
  async generateWeeklyReport(
    weekId: string
  ): Promise<
    | {
        success: true
        report: {
          weekId: string
          status: "draft" | "published"
          totalShifts: number
          totalScheduledHours: number
          totalActualHours: number
          totalVariance: number
          totalEstimatedCost: number
          totalActualCost: number
          costVariance: number
          noShowCount: number
          shifts: Array<{
            shiftId: string
            employeeId: string | null
            date: Date
            scheduledHours: number
            actualHours: number
            variance: number
            estimatedCost: number
            actualCost: number
            punctuality: {
              status: "early" | "late" | "on-time" | "no-show"
              minutes: number
            }
          }>
        }
      }
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

      // Detect no-shows
      const noShowsResult = await this.detectNoShows(weekId)
      if (!noShowsResult.success) {
        return {
          success: false,
          error: noShowsResult.error,
          message: noShowsResult.message,
        }
      }

      const noShowShiftIds = new Set(noShowsResult.noShows.map((s) => s._id.toString()))

      // Process each shift
      const shiftReports = []
      let totalScheduledHours = 0
      let totalActualHours = 0
      let totalEstimatedCost = 0
      let totalActualCost = 0

      for (const shift of roster.shifts) {
        // Calculate variance
        const varianceResult = await this.calculateVariance(shift._id)
        const scheduledHours = varianceResult.success ? varianceResult.scheduledHours : 0
        const actualHours = varianceResult.success ? varianceResult.actualHours : 0
        const variance = varianceResult.success ? varianceResult.variance : 0

        // Calculate actual cost
        const actualCostResult = await this.calculateActualCost(shift._id)
        const actualCost = actualCostResult.success ? actualCostResult.actualCost : 0

        // Calculate punctuality
        let punctuality: {
          status: "early" | "late" | "on-time" | "no-show"
          minutes: number
        }

        if (noShowShiftIds.has(shift._id.toString())) {
          punctuality = { status: "no-show", minutes: 0 }
        } else {
          const punctualityResult = await this.calculatePunctuality(shift._id)
          if (punctualityResult.success) {
            punctuality = {
              status: punctualityResult.status,
              minutes: punctualityResult.minutes,
            }
          } else {
            punctuality = { status: "no-show", minutes: 0 }
          }
        }

        shiftReports.push({
          shiftId: shift._id.toString(),
          employeeId: shift.employeeId ? shift.employeeId.toString() : null,
          date: shift.date,
          scheduledHours,
          actualHours,
          variance,
          estimatedCost: shift.estimatedCost,
          actualCost,
          punctuality,
        })

        totalScheduledHours += scheduledHours
        totalActualHours += actualHours
        totalEstimatedCost += shift.estimatedCost
        totalActualCost += actualCost
      }

      const totalVariance = Math.round((totalActualHours - totalScheduledHours) * 100) / 100
      const costVariance = Math.round((totalActualCost - totalEstimatedCost) * 100) / 100

      return {
        success: true,
        report: {
          weekId,
          status: roster.status,
          totalShifts: roster.shifts.length,
          totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
          totalActualHours: Math.round(totalActualHours * 100) / 100,
          totalVariance,
          totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
          totalActualCost: Math.round(totalActualCost * 100) / 100,
          costVariance,
          noShowCount: noShowsResult.noShows.length,
          shifts: shiftReports,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: "REPORT_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to generate weekly report",
      }
    }
  }

  /**
   * Generate employee report for a date range
   * Aggregates variance, no-shows, and punctuality data for a specific employee
   * @param employeeId - Employee ID
   * @param startDate - Start date (YYYY-MM-DD format)
   * @param endDate - End date (YYYY-MM-DD format)
   * @returns Employee report or error
   */
  async generateEmployeeReport(
    employeeId: mongoose.Types.ObjectId | string,
    startDate: string,
    endDate: string
  ): Promise<
    | {
        success: true
        report: {
          employeeId: string
          startDate: string
          endDate: string
          totalShifts: number
          totalScheduledHours: number
          totalActualHours: number
          totalVariance: number
          totalEstimatedCost: number
          totalActualCost: number
          costVariance: number
          noShowCount: number
          earlyCount: number
          lateCount: number
          onTimeCount: number
          shifts: Array<{
            shiftId: string
            weekId: string
            date: Date
            scheduledHours: number
            actualHours: number
            variance: number
            estimatedCost: number
            actualCost: number
            punctuality: {
              status: "early" | "late" | "on-time" | "no-show"
              minutes: number
            }
          }>
        }
      }
    | { success: false; error: string; message: string }
  > {
    try {
      // Parse dates
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Find all rosters that overlap with the date range
      const rosters = await Roster.find({
        weekStartDate: { $lte: end },
        weekEndDate: { $gte: start },
      })

      // Collect all shifts for this employee within the date range
      const employeeShifts: Array<{
        shift: IShift
        weekId: string
      }> = []

      for (const roster of rosters) {
        for (const shift of roster.shifts) {
          if (
            shift.employeeId &&
            shift.employeeId.toString() === employeeId.toString() &&
            shift.date >= start &&
            shift.date <= end
          ) {
            employeeShifts.push({
              shift,
              weekId: roster.weekId,
            })
          }
        }
      }

      // Process each shift
      const shiftReports = []
      let totalScheduledHours = 0
      let totalActualHours = 0
      let totalEstimatedCost = 0
      let totalActualCost = 0
      let noShowCount = 0
      let earlyCount = 0
      let lateCount = 0
      let onTimeCount = 0

      for (const { shift, weekId } of employeeShifts) {
        // Calculate variance
        const varianceResult = await this.calculateVariance(shift._id)
        const scheduledHours = varianceResult.success ? varianceResult.scheduledHours : 0
        const actualHours = varianceResult.success ? varianceResult.actualHours : 0
        const variance = varianceResult.success ? varianceResult.variance : 0

        // Calculate actual cost
        const actualCostResult = await this.calculateActualCost(shift._id)
        const actualCost = actualCostResult.success ? actualCostResult.actualCost : 0

        // Calculate punctuality
        const punctualityResult = await this.calculatePunctuality(shift._id)
        let punctuality: {
          status: "early" | "late" | "on-time" | "no-show"
          minutes: number
        }

        if (punctualityResult.success) {
          punctuality = {
            status: punctualityResult.status,
            minutes: punctualityResult.minutes,
          }

          // Update counts
          if (punctuality.status === "early") earlyCount++
          else if (punctuality.status === "late") lateCount++
          else if (punctuality.status === "on-time") onTimeCount++
        } else {
          punctuality = { status: "no-show", minutes: 0 }
          noShowCount++
        }

        shiftReports.push({
          shiftId: shift._id.toString(),
          weekId,
          date: shift.date,
          scheduledHours,
          actualHours,
          variance,
          estimatedCost: shift.estimatedCost,
          actualCost,
          punctuality,
        })

        totalScheduledHours += scheduledHours
        totalActualHours += actualHours
        totalEstimatedCost += shift.estimatedCost
        totalActualCost += actualCost
      }

      const totalVariance = Math.round((totalActualHours - totalScheduledHours) * 100) / 100
      const costVariance = Math.round((totalActualCost - totalEstimatedCost) * 100) / 100

      return {
        success: true,
        report: {
          employeeId: employeeId.toString(),
          startDate,
          endDate,
          totalShifts: employeeShifts.length,
          totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
          totalActualHours: Math.round(totalActualHours * 100) / 100,
          totalVariance,
          totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
          totalActualCost: Math.round(totalActualCost * 100) / 100,
          costVariance,
          noShowCount,
          earlyCount,
          lateCount,
          onTimeCount,
          shifts: shiftReports,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: "REPORT_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to generate employee report",
      }
    }
  }
}
