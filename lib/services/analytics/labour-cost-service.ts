import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { LabourCostAnalysis, ILabourCostAnalysis } from "@/lib/db/schemas/labour-cost-analysis"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Roster } from "@/lib/db/schemas/roster"

export interface DailyBreakdown {
  date: string
  rosterCost: number
  actualCost: number
  variance: number
  rosterHours: number
  actualHours: number
}

export class LabourCostService {
  /**
   * Generate a cost analysis for a location + period.
   * Aggregates roster estimatedCost vs DailyShift actual cost.
   */
  async generateAnalysis(
    ctx: TenantContext,
    locationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ILabourCostAnalysis> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    // Get roster shifts for the period
    const rosters = await scope(Roster, ctx.tenantId)
      .find({
        weekStartDate: { $lte: periodEnd },
        weekEndDate: { $gte: periodStart },
      })
      .lean()

    let rosterCost = 0
    let totalRosterHours = 0

    for (const roster of rosters) {
      const locationShifts = roster.shifts.filter(
        (s: any) => s.locationId.toString() === locationId && s.date >= periodStart && s.date <= periodEnd
      )
      for (const shift of locationShifts) {
        rosterCost += shift.estimatedCost ?? 0
        const hours =
          (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60)
        totalRosterHours += hours
      }
    }

    // Get actual shifts for the period
    const actualShifts = await scope(DailyShift, ctx.tenantId)
      .find({
        locationId,
        date: { $gte: periodStart, $lte: periodEnd },
        status: { $nin: ["rejected"] },
        "computed.totalCost": { $exists: true },
      })
      .lean()

    let actualCost = 0
    let totalActualHours = 0
    const employeeSet = new Set<string>()

    for (const shift of actualShifts) {
      actualCost += shift.computed?.totalCost ?? 0
      totalActualHours += shift.computed?.totalHours ?? 0
      if (shift.employeeId) employeeSet.add(shift.employeeId.toString())
    }

    const variance = actualCost - rosterCost
    const variancePct = rosterCost > 0 ? (variance / rosterCost) * 100 : 0

    const analysis = await scope(LabourCostAnalysis, ctx.tenantId).create({
      tenantId: ctx.tenantId,
      locationId,
      periodStart,
      periodEnd,
      rosterCost,
      actualCost,
      variance,
      variancePct,
      totalRosterHours,
      totalActualHours,
      employeeCount: employeeSet.size,
      generatedAt: new Date(),
    })

    return analysis.toObject()
  }

  /**
   * Get daily cost breakdown for a location over a date range.
   * Useful for charts.
   */
  async getDailyBreakdown(
    ctx: TenantContext,
    locationId: string,
    from: Date,
    to: Date
  ): Promise<DailyBreakdown[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const breakdown: DailyBreakdown[] = []
    const currentDate = new Date(from)

    while (currentDate <= to) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const nextDay = new Date(currentDate)
      nextDay.setDate(nextDay.getDate() + 1)

      // Get roster shifts for this date
      const rosters = await scope(Roster, ctx.tenantId)
        .find({
          weekStartDate: { $lte: currentDate },
          weekEndDate: { $gte: currentDate },
        })
        .lean()

      let rosterCost = 0
      let rosterHours = 0

      for (const roster of rosters) {
        const dayShifts = roster.shifts.filter(
          (s: any) =>
            s.locationId.toString() === locationId &&
            s.date.toISOString().slice(0, 10) === dateStr
        )
        for (const shift of dayShifts) {
          rosterCost += shift.estimatedCost ?? 0
          const hours =
            (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60)
          rosterHours += hours
        }
      }

      // Get actual shifts for this date
      const actualShifts = await scope(DailyShift, ctx.tenantId)
        .find({
          locationId,
          date: { $gte: currentDate, $lt: nextDay },
          status: { $nin: ["rejected"] },
          "computed.totalCost": { $exists: true },
        })
        .lean()

      let actualCost = 0
      let actualHours = 0

      for (const shift of actualShifts) {
        actualCost += shift.computed?.totalCost ?? 0
        actualHours += shift.computed?.totalHours ?? 0
      }

      breakdown.push({
        date: dateStr,
        rosterCost,
        actualCost,
        variance: actualCost - rosterCost,
        rosterHours,
        actualHours,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return breakdown
  }
}

export const labourCostService = new LabourCostService()
