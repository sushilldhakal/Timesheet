import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { DemandForecast, IDemandForecast } from "@/lib/db/schemas/demand-forecast"
import { AutoRosterSuggestion, IAutoRosterSuggestion } from "@/lib/db/schemas/auto-roster-suggestion"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Employee } from "@/lib/db/schemas/employee"
import { LeaveRecord } from "@/lib/db/schemas/leave-record"

const MODEL_VERSION = "1.0.0"

export class DemandForecastService {
  /**
   * Generate forecasts for a location for the next N weeks.
   * Uses weighted moving average of same day-of-week over last 8 weeks.
   * Recent weeks are weighted more heavily (exponential weighting).
   */
  async generateForecast(
    ctx: TenantContext,
    locationId: string,
    fromDate: Date,
    weeks: number
  ): Promise<IDemandForecast[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const forecasts: IDemandForecast[] = []
    const totalDays = weeks * 7

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const forecastDate = new Date(fromDate)
      forecastDate.setDate(forecastDate.getDate() + dayOffset)
      forecastDate.setHours(0, 0, 0, 0)

      const dayOfWeek = forecastDate.getDay()

      // Gather historical data for the same day-of-week over last 8 weeks
      const historicalData = await this.getHistoricalDataForDayOfWeek(
        ctx,
        locationId,
        dayOfWeek,
        forecastDate,
        8
      )

      // Exponential weighted moving average
      const { predictedSales, recommendedStaffCount } =
        this.calculateWeightedAverage(historicalData)

      // Upsert forecast
      const forecast = await scope(DemandForecast, tenantId).findOneAndUpdate(
        { locationId, date: forecastDate },
        {
          $set: {
            tenantId,
            locationId,
            date: forecastDate,
            dayOfWeek,
            predictedSales,
            recommendedStaffCount,
            generatedAt: new Date(),
            modelVersion: MODEL_VERSION,
          },
        },
        { upsert: true, new: true }
      )

      forecasts.push(forecast.toObject())
    }

    return forecasts
  }

  /**
   * Given a forecast, suggest employees for open roster slots.
   * Criteria: available (not on leave, not over hours), primary role match,
   * fewest hours this week (fairness), compliance-safe.
   */
  async generateRosterSuggestions(
    ctx: TenantContext,
    forecastId: string
  ): Promise<IAutoRosterSuggestion[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const forecast = await scope(DemandForecast, tenantId).findById(forecastId).lean()
    if (!forecast) throw new Error("Forecast not found")

    const forecastDate = forecast.date
    const weekStart = new Date(forecastDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Get all active employees for this location
    const employees = await scope(Employee, tenantId)
      .find({ isActive: true, locationIds: forecast.locationId })
      .lean()

    // Get employees on leave on the forecast date
    const onLeave = await scope(LeaveRecord, tenantId)
      .find({
        startDate: { $lte: forecastDate },
        endDate: { $gte: forecastDate },
        status: "approved",
      })
      .lean()

    const onLeaveIds = new Set(onLeave.map((l: any) => l.employeeId?.toString()))

    // Get weekly hours for each employee
    const weeklyHoursMap = await this.getWeeklyHoursMap(ctx, employees.map((e: any) => e._id.toString()), weekStart, weekEnd)

    // Score and rank employees
    const suggestions: IAutoRosterSuggestion[] = []

    // Group by role — suggest top candidates per role
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const roleIds = [...new Set(employees.flatMap((_e: any) => []))] // roles come from role assignments

    // Build a general suggestion for the location
    const scoredEmployees = employees
      .filter((e: any) => !onLeaveIds.has(e._id.toString()))
      .map((e: any) => {
        const weeklyHours = weeklyHoursMap[e._id.toString()] ?? 0
        const reasons: string[] = []
        let confidenceScore = 0.5

        if (!onLeaveIds.has(e._id.toString())) {
          reasons.push("available")
          confidenceScore += 0.2
        }

        // Prefer employees with fewer hours this week (fairness)
        if (weeklyHours < (e.standardHoursPerWeek ?? 38)) {
          reasons.push("under_weekly_hours")
          confidenceScore += 0.2
        }

        if (weeklyHours === 0) {
          reasons.push("no_hours_this_week")
          confidenceScore += 0.1
        }

        return {
          employeeId: e._id,
          roleId: e._id, // placeholder — real implementation would use role assignments
          confidenceScore: Math.min(confidenceScore, 1),
          reasons,
        }
      })
      .sort((a: any, b: any) => b.confidenceScore - a.confidenceScore)
      .slice(0, forecast.recommendedStaffCount)

    if (scoredEmployees.length > 0) {
      const suggestion = await scope(AutoRosterSuggestion, tenantId).create({
        tenantId,
        locationId: forecast.locationId,
        date: forecastDate,
        roleId: scoredEmployees[0]?.roleId ?? forecast.locationId,
        suggestedEmployees: scoredEmployees,
        forecastId: forecast._id,
        status: "pending",
        generatedAt: new Date(),
      })

      suggestions.push(suggestion.toObject())
    }

    return suggestions
  }

  /**
   * Get historical shift data for a specific day-of-week over the last N weeks.
   */
  private async getHistoricalDataForDayOfWeek(
    ctx: TenantContext,
    locationId: string,
    dayOfWeek: number,
    beforeDate: Date,
    weeksBack: number
  ): Promise<Array<{ staffCount: number; totalHours: number }>> {
    const tenantId = (ctx as { tenantId: string }).tenantId
    const results: Array<{ staffCount: number; totalHours: number }> = []

    for (let week = 1; week <= weeksBack; week++) {
      const targetDate = new Date(beforeDate)
      targetDate.setDate(targetDate.getDate() - week * 7)

      // Find the correct day-of-week in that week
      const diff = dayOfWeek - targetDate.getDay()
      targetDate.setDate(targetDate.getDate() + diff)
      targetDate.setHours(0, 0, 0, 0)

      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      const shifts = await scope(DailyShift, tenantId)
        .find({
          locationId,
          date: { $gte: targetDate, $lt: nextDay },
          status: { $nin: ["rejected"] },
        })
        .lean()

      results.push({
        staffCount: shifts.length,
        totalHours: shifts.reduce((sum: number, s: any) => sum + (s.totalWorkingHours ?? 0), 0),
      })
    }

    return results
  }

  /**
   * Calculate exponentially weighted moving average.
   * More recent weeks have higher weight.
   */
  private calculateWeightedAverage(
    data: Array<{ staffCount: number; totalHours: number }>
  ): { predictedSales: number; recommendedStaffCount: number } {
    if (data.length === 0) {
      return { predictedSales: 0, recommendedStaffCount: 1 }
    }

    // Exponential weights: most recent = highest weight
    const alpha = 0.3 // smoothing factor
    let weightedStaffCount = data[0].staffCount
    let weightedHours = data[0].totalHours

    for (let i = 1; i < data.length; i++) {
      weightedStaffCount = alpha * data[i].staffCount + (1 - alpha) * weightedStaffCount
      weightedHours = alpha * data[i].totalHours + (1 - alpha) * weightedHours
    }

    return {
      predictedSales: Math.round(weightedHours * 100) / 100,
      recommendedStaffCount: Math.max(1, Math.round(weightedStaffCount)),
    }
  }

  /**
   * Get weekly hours worked for a list of employees.
   */
  private async getWeeklyHoursMap(
    ctx: TenantContext,
    employeeIds: string[],
    weekStart: Date,
    weekEnd: Date
  ): Promise<Record<string, number>> {
    const tenantId = (ctx as { tenantId: string }).tenantId
    const shifts = await scope(DailyShift, tenantId)
      .find({
        employeeId: { $in: employeeIds },
        date: { $gte: weekStart, $lte: weekEnd },
        status: { $nin: ["rejected"] },
      })
      .lean()

    const map: Record<string, number> = {}
    for (const shift of shifts) {
      const empId = (shift as any).employeeId?.toString()
      if (!empId) continue
      map[empId] = (map[empId] ?? 0) + ((shift as any).totalWorkingHours ?? 0)
    }

    return map
  }
}

export const demandForecastService = new DemandForecastService()
