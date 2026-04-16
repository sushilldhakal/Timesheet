import mongoose from "mongoose"
import { AnalyticsDbQueries } from "@/lib/db/queries/analytics"
import { connectDB } from "@/lib/db"
import type { IShift } from "@/lib/db/queries/scheduling-types"

type ShiftLike = {
  _id: { toString(): string }
  employeeId?: { toString(): string } | null
  date: Date
  startTime: Date
  endTime: Date
  estimatedCost: number
}

/**
 * Variance Analytics Service
 * Responsible for calculating variances, detecting no-shows, and generating reports
 */
export class VarianceAnalyticsService {
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
      await connectDB()
      const shiftIdStr = shiftId.toString()
      const roster = await AnalyticsDbQueries.findRosterByShiftId(shiftIdStr)
      if (!roster) {
        return { success: false, error: "SHIFT_NOT_FOUND", message: "Shift not found" }
      }

      const shift = roster.shifts.find((s) => s._id.toString() === shiftIdStr)
      if (!shift) {
        return { success: false, error: "SHIFT_NOT_FOUND", message: "Shift not found" }
      }

      const scheduledHours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60)

      let actualHours = 0
      let dailyShiftCount = 0

      if (shift.employeeId) {
        const shiftDate = new Date(shift.date)
        shiftDate.setHours(0, 0, 0, 0)

        const dailyShift = await AnalyticsDbQueries.findDailyShiftByEmployeeAndDate({
          employeeId: shift.employeeId.toString(),
          date: shiftDate,
        })

        if (dailyShift && dailyShift.totalWorkingHours) {
          actualHours = dailyShift.totalWorkingHours
          dailyShiftCount = 1
        }
      }

      const variance = Math.round((actualHours - scheduledHours) * 100) / 100

      return {
        success: true,
        scheduledHours: Math.round(scheduledHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        variance,
        timesheetCount: dailyShiftCount,
      }
    } catch (error) {
      return {
        success: false,
        error: "CALCULATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to calculate variance",
      }
    }
  }

  async detectNoShows(
    weekId: string
  ): Promise<{ success: true; noShows: ShiftLike[] } | { success: false; error: string; message: string }> {
    try {
      await connectDB()
      const roster = await AnalyticsDbQueries.findRosterByWeekId(weekId)
      if (!roster) {
        return { success: false, error: "ROSTER_NOT_FOUND", message: `Roster not found for week ${weekId}` }
      }

      if (roster.status !== "published") {
        return { success: true, noShows: [] }
      }

      const currentTime = new Date()
      const noShows: ShiftLike[] = []

      for (const shift of roster.shifts) {
        if (shift.endTime > currentTime) continue

        if (shift.employeeId) {
          const shiftDate = new Date(shift.date)
          shiftDate.setHours(0, 0, 0, 0)

          const dailyShift = await AnalyticsDbQueries.findDailyShiftByEmployeeAndDate({
            employeeId: shift.employeeId.toString(),
            date: shiftDate,
          })

          if (!dailyShift || !dailyShift.clockIn) noShows.push(shift)
        }
      }

      return { success: true, noShows }
    } catch (error) {
      return {
        success: false,
        error: "DETECTION_FAILED",
        message: error instanceof Error ? error.message : "Failed to detect no-shows",
      }
    }
  }

  async calculatePunctuality(
    shiftId: mongoose.Types.ObjectId | string
  ): Promise<
    | { success: true; status: "early" | "late" | "on-time"; minutes: number }
    | { success: false; error: string; message: string }
  > {
    try {
      await connectDB()
      const shiftIdStr = shiftId.toString()
      const roster = await AnalyticsDbQueries.findRosterByShiftId(shiftIdStr)
      if (!roster) return { success: false, error: "SHIFT_NOT_FOUND", message: "Shift not found" }

      const shift = roster.shifts.find((s) => s._id.toString() === shiftIdStr)
      if (!shift) return { success: false, error: "SHIFT_NOT_FOUND", message: "Shift not found" }

      if (!shift.employeeId) {
        return { success: false, error: "NO_EMPLOYEE", message: "No employee assigned to this shift" }
      }

      const shiftDate = new Date(shift.date)
      shiftDate.setHours(0, 0, 0, 0)

      const dailyShift = await AnalyticsDbQueries.findDailyShiftByEmployeeAndDate({
        employeeId: shift.employeeId.toString(),
        date: shiftDate,
      })

      if (!dailyShift || !dailyShift.clockIn?.time) {
        return { success: false, error: "NO_TIMESHEET", message: "No clock-in found for this shift" }
      }

      const clockInTime = new Date(dailyShift.clockIn.time)
      const diffMinutes = Math.round((clockInTime.getTime() - shift.startTime.getTime()) / (1000 * 60))

      if (diffMinutes < 0) return { success: true, status: "early", minutes: Math.abs(diffMinutes) }
      if (diffMinutes > 0) return { success: true, status: "late", minutes: diffMinutes }
      return { success: true, status: "on-time", minutes: 0 }
    } catch (error) {
      return {
        success: false,
        error: "CALCULATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to calculate punctuality",
      }
    }
  }

  async calculateActualCost(
    shiftId: mongoose.Types.ObjectId | string
  ): Promise<{ success: true; actualCost: number } | { success: false; error: string; message: string }> {
    try {
      await connectDB()
      const shiftIdStr = shiftId.toString()
      const roster = await AnalyticsDbQueries.findRosterByShiftId(shiftIdStr)
      if (!roster) return { success: false, error: "SHIFT_NOT_FOUND", message: "Shift not found" }

      const shift = roster.shifts.find((s) => s._id.toString() === shiftIdStr)
      if (!shift) return { success: false, error: "SHIFT_NOT_FOUND", message: "Shift not found" }

      if (!shift.employeeId) return { success: true, actualCost: 0 }

      const employee = await AnalyticsDbQueries.findEmployeeById(shift.employeeId.toString())
      if (!employee) return { success: false, error: "EMPLOYEE_NOT_FOUND", message: "Employee not found" }

      const varianceResult = await this.calculateVariance(shiftIdStr)
      if (!varianceResult.success) {
        return { success: false, error: varianceResult.error, message: varianceResult.message }
      }

      const actualHours = varianceResult.actualHours
      if (actualHours === 0) return { success: true, actualCost: 0 }

      const awardId = employee.awardId
      const awardLevel = employee.awardLevel
      const employmentType = employee.employmentType
      if (!awardId || !awardLevel || !employmentType) return { success: true, actualCost: 0 }

      const award = await AnalyticsDbQueries.findAwardById(awardId.toString())
      if (!award) return { success: true, actualCost: 0 }

      const levels = (award as any)?.levels
      if (!Array.isArray(levels)) return { success: true, actualCost: 0 }
      const level = levels.find((l: { label: string }) => l.label === awardLevel)
      if (!level) return { success: true, actualCost: 0 }

      const conditionSet = level.conditions.find((c: { employmentType: string }) => c.employmentType === employmentType)
      if (!conditionSet || !conditionSet.payRule) return { success: true, actualCost: 0 }

      let baseRate = 0
      if (conditionSet.payRule.type === "hourly") {
        baseRate = conditionSet.payRule.rate || 0
      } else if (conditionSet.payRule.type === "salary") {
        const annualAmount = conditionSet.payRule.annualAmount || 0
        const hoursPerWeek = conditionSet.payRule.hoursPerWeek || 38
        baseRate = annualAmount / (52 * hoursPerWeek)
      }

      let adjustedRate = baseRate
      const dayOfWeek = shift.date.getDay()
      const startHour = shift.startTime.getUTCHours() + shift.startTime.getUTCMinutes() / 60
      const endHour = shift.endTime.getUTCHours() + shift.endTime.getUTCMinutes() / 60
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const dayName = dayNames[dayOfWeek]

      for (const penaltyRule of conditionSet.penaltyRules) {
        let applies = false
        if (penaltyRule.triggerType === "day_of_week") {
          if (penaltyRule.days && penaltyRule.days.includes(dayName)) applies = true
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
          if (penaltyRule.thresholdHours !== null && actualHours > penaltyRule.thresholdHours) applies = true
        }

        if (applies) {
          if (penaltyRule.rateType === "multiplier") {
            adjustedRate = penaltyRule.stackable ? adjustedRate * penaltyRule.rateValue : baseRate * penaltyRule.rateValue
          } else if (penaltyRule.rateType === "flat_amount") {
            adjustedRate += penaltyRule.rateValue
          }
        }
      }

      const actualCost = actualHours * adjustedRate
      return { success: true, actualCost: Math.round(actualCost * 100) / 100 }
    } catch (error) {
      return {
        success: false,
        error: "CALCULATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to calculate actual cost",
      }
    }
  }

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
            punctuality: { status: "early" | "late" | "on-time" | "no-show"; minutes: number }
          }>
        }
      }
    | { success: false; error: string; message: string }
  > {
    try {
      await connectDB()
      const roster = await AnalyticsDbQueries.findRosterByWeekId(weekId)
      if (!roster) return { success: false, error: "ROSTER_NOT_FOUND", message: `Roster not found for week ${weekId}` }

      const noShowsResult = await this.detectNoShows(weekId)
      if (!noShowsResult.success) return { success: false, error: noShowsResult.error, message: noShowsResult.message }

      const noShowShiftIds = new Set(noShowsResult.noShows.map((s) => s._id.toString()))

      const shiftReports: any[] = []
      let totalScheduledHours = 0
      let totalActualHours = 0
      let totalEstimatedCost = 0
      let totalActualCost = 0

      for (const shift of roster.shifts) {
        const varianceResult = await this.calculateVariance(shift._id)
        const scheduledHours = varianceResult.success ? varianceResult.scheduledHours : 0
        const actualHours = varianceResult.success ? varianceResult.actualHours : 0
        const variance = varianceResult.success ? varianceResult.variance : 0

        const actualCostResult = await this.calculateActualCost(shift._id)
        const actualCost = actualCostResult.success ? actualCostResult.actualCost : 0

        let punctuality: { status: "early" | "late" | "on-time" | "no-show"; minutes: number }
        if (noShowShiftIds.has(shift._id.toString())) {
          punctuality = { status: "no-show", minutes: 0 }
        } else {
          const punctualityResult = await this.calculatePunctuality(shift._id)
          punctuality = punctualityResult.success
            ? { status: punctualityResult.status, minutes: punctualityResult.minutes }
            : { status: "no-show", minutes: 0 }
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
            punctuality: { status: "early" | "late" | "on-time" | "no-show"; minutes: number }
          }>
        }
      }
    | { success: false; error: string; message: string }
  > {
    try {
      await connectDB()
      const start = new Date(startDate)
      const end = new Date(endDate)

      const rosters = await AnalyticsDbQueries.findRostersOverlappingRange({ start, end })

      const employeeShifts: Array<{ shift: IShift; weekId: string }> = []
      for (const roster of rosters) {
        for (const shift of roster.shifts) {
          if (
            shift.employeeId &&
            shift.employeeId.toString() === employeeId.toString() &&
            shift.date >= start &&
            shift.date <= end
          ) {
            employeeShifts.push({ shift, weekId: roster.weekId })
          }
        }
      }

      const shiftReports: any[] = []
      let totalScheduledHours = 0
      let totalActualHours = 0
      let totalEstimatedCost = 0
      let totalActualCost = 0
      let noShowCount = 0
      let earlyCount = 0
      let lateCount = 0
      let onTimeCount = 0

      for (const { shift, weekId } of employeeShifts) {
        const varianceResult = await this.calculateVariance(shift._id)
        const scheduledHours = varianceResult.success ? varianceResult.scheduledHours : 0
        const actualHours = varianceResult.success ? varianceResult.actualHours : 0
        const variance = varianceResult.success ? varianceResult.variance : 0

        const actualCostResult = await this.calculateActualCost(shift._id)
        const actualCost = actualCostResult.success ? actualCostResult.actualCost : 0

        const punctualityResult = await this.calculatePunctuality(shift._id)
        const punctuality = punctualityResult.success
          ? { status: punctualityResult.status, minutes: punctualityResult.minutes }
          : { status: "no-show" as const, minutes: 0 }

        if (punctualityResult.success) {
          if (punctuality.status === "early") earlyCount++
          else if (punctuality.status === "late") lateCount++
          else if (punctuality.status === "on-time") onTimeCount++
        } else {
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

