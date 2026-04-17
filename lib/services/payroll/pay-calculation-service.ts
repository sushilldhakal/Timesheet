import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { DailyShift, IComputedPay } from "@/lib/db/schemas/daily-shift"
import { Award, IAward } from "@/lib/db/schemas/award"
import { Employee } from "@/lib/db/schemas/employee"
import { PublicHoliday } from "@/lib/db/schemas/public-holiday"
import { EmployeeAwardAssignment } from "@/lib/db/schemas/employee-award-assignment"
import { PayRun } from "@/lib/db/schemas/pay-run"
import { AwardEngine } from "@/lib/engines/award-engine"
import { complianceService } from "@/lib/services/compliance/compliance-service"
import { ShiftContext } from "@/lib/validations/awards"

export interface EmployeePeriodPay {
  employeeId: string
  shifts: Array<{ shiftId: string; computed: IComputedPay }>
  totalCost: number
  totalHours: number
}

export class PayCalculationService {
  /**
   * Calculate pay for a single shift. Writes result to DailyShift.computed.
   * Idempotent — calling twice produces the same result.
   */
  async calculateShift(
    ctx: TenantContext,
    shiftId: string,
    opts?: { forceRecalculate?: boolean }
  ): Promise<IComputedPay> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    // 1. Load the shift
    const shift = await scope(DailyShift, tenantId).findById(shiftId)
    if (!shift) throw new Error("Shift not found")

    // Skip if already calculated and not forced
    if (shift.computed && !opts?.forceRecalculate) {
      return shift.computed
    }

    if (!shift.clockIn?.time || !shift.clockOut?.time) {
      throw new Error("Shift must have both clock-in and clock-out times to calculate pay")
    }

    // 2. Resolve the award for the employee on the shift date
    const award = await this.resolveAward({ tenantId }, shift.employeeId?.toString() ?? "", shift.date)
    if (!award) throw new Error("No award found for employee")

    // 3. Load employee for base rate and employment type
    const employee = await scope(Employee, tenantId).findById(shift.employeeId)
    if (!employee) throw new Error("Employee not found")

    // 4. Check for public holiday on shift date
    const shiftDateStr = shift.date.toISOString().slice(0, 10)
    const isPublicHoliday = await this.checkPublicHoliday(shiftDateStr)

    // 5. Resolve base rate from award level rates
    const baseRate = this.resolveBaseRate(award, employee.awardLevel ?? "", employee.employmentType ?? "")

    // 6. Build shift context for AwardEngine
    const shiftContext: ShiftContext = {
      employeeId: shift.employeeId?.toString() ?? "",
      employmentType: employee.employmentType ?? "casual",
      baseRate,
      startTime: shift.clockIn.time,
      endTime: shift.clockOut.time,
      awardTags: shift.awardTags ?? [],
      isPublicHoliday,
      weeklyHoursWorked: 0, // Could be enriched with actual weekly hours
      dailyHoursWorked: 0,
      consecutiveShifts: 0,
      breaks: (shift.breaks ?? []).map((b: any) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        isPaid: b.isPaid,
      })),
    }

    // 7. Run AwardEngine
    const engine = new AwardEngine(award as any)
    const engineResult = engine.processShift(shiftContext)

    // 8. Run compliance check (non-blocking)
    try {
      const shiftWindow = {
        employeeId: shift.employeeId?.toString() ?? "",
        shiftStart: shift.clockIn.time,
        shiftEnd: shift.clockOut.time,
        shiftId: shiftId,
        breakMinutes: shift.totalBreakMinutes ?? 0,
      }
      await complianceService.evaluateShift(ctx, shift.employeeId?.toString() ?? "", shiftWindow, {
        persist: true,
      })
    } catch {
      // Non-blocking — compliance errors don't prevent pay calculation
    }

    // 9. Build computed snapshot
    const computed: IComputedPay = {
      payLines: engineResult.payLines,
      totalCost: engineResult.totalCost,
      totalHours: engineResult.totalHours,
      awardId: award._id as any,
      awardLevel: employee.awardLevel ?? undefined,
      baseRate,
      calculatedAt: new Date(),
      awardVersion: award.version,
      breakEntitlements: engineResult.breakEntitlements,
      leaveAccruals: engineResult.leaveAccruals,
      lastCalculated: new Date(),
    }

    // 10. Write computed snapshot back to DailyShift
    await scope(DailyShift, tenantId).findOneAndUpdate(
      { _id: shiftId },
      { $set: { computed } }
    )

    return computed
  }

  /**
   * Calculate pay for all shifts in a pay period for a single employee.
   */
  async calculateEmployeePeriod(
    ctx: TenantContext,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<EmployeePeriodPay> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const shifts = await scope(DailyShift, tenantId)
      .find({
        employeeId,
        date: { $gte: periodStart, $lte: periodEnd },
        status: { $nin: ["rejected"] },
        clockIn: { $exists: true },
        clockOut: { $exists: true },
      })
      .lean()

    const results: Array<{ shiftId: string; computed: IComputedPay }> = []
    let totalCost = 0
    let totalHours = 0

    for (const shift of shifts) {
      try {
        const computed = await this.calculateShift(ctx, (shift as any)._id.toString(), {
          forceRecalculate: true,
        })
        results.push({ shiftId: (shift as any)._id.toString(), computed })
        totalCost += computed.totalCost
        totalHours += computed.totalHours
      } catch {
        // Skip shifts that can't be calculated
      }
    }

    return { employeeId, shifts: results, totalCost, totalHours }
  }

  /**
   * Calculate all employees for a PayRun. Updates PayRun.totals.
   * Sets PayRun.status to "calculated".
   */
  async calculatePayRun(ctx: TenantContext, payRunId: string): Promise<typeof PayRun.prototype> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const payRun = await scope(PayRun, tenantId).findById(payRunId)
    if (!payRun) throw new Error("Pay run not found")

    // Get all employees with shifts in this period
    const shifts = await scope(DailyShift, tenantId)
      .find({
        date: { $gte: payRun.startDate, $lte: payRun.endDate },
        status: { $nin: ["rejected"] },
        clockIn: { $exists: true },
        clockOut: { $exists: true },
      })
      .lean()

    const rawIds: (string | undefined)[] = shifts.map((s: any) => s.employeeId?.toString() as string | undefined)
    const filteredIds: string[] = rawIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    const employeeIds: string[] = [...new Set(filteredIds)]

    let totalGross = 0
    let totalHours = 0
    let employeeCount = 0

    for (const employeeId of employeeIds) {
      try {
        const periodPay = await this.calculateEmployeePeriod(
          ctx,
          employeeId,
          payRun.startDate,
          payRun.endDate
        )
        totalGross += periodPay.totalCost
        totalHours += periodPay.totalHours
        employeeCount++
      } catch {
        // Continue with other employees
      }
    }

    // Update PayRun totals and status
    const updated = await scope(PayRun, tenantId).findOneAndUpdate(
      { _id: payRunId },
      {
        $set: {
          status: "calculated",
          totals: {
            gross: totalGross,
            tax: 0, // Tax calculation would require additional logic
            super: totalGross * 0.11, // 11% super (AU 2024 rate)
            net: totalGross,
            totalHours,
            employeeCount,
          },
        },
      },
      { new: true }
    )

    return updated
  }

  /**
   * Resolve the award for an employee at a given date.
   * Checks EmployeeAwardAssignment first, falls back to Employee.awardId.
   */
  private async resolveAward(
    ctx: { tenantId: string },
    employeeId: string,
    date: Date
  ): Promise<IAward | null> {
    // Check for active award assignments (Phase 9 — multi-award)
    const assignments = await scope(EmployeeAwardAssignment, ctx.tenantId)
      .find({
        employeeId,
        isActive: true,
        validFrom: { $lte: date },
        $or: [{ validTo: null }, { validTo: { $gte: date } }],
      })
      .sort({ priority: 1 })
      .lean()

    if (assignments.length > 0) {
      const award = await Award.findById(assignments[0].awardId).lean()
      return award as IAward | null
    }

    // Fall back to Employee.awardId
    const employee = await scope(Employee, ctx.tenantId).findById(employeeId).lean()
    if (!employee?.awardId) return null

    const award = await Award.findById((employee as any).awardId).lean()
    return award as IAward | null
  }

  /**
   * Check if a date is a public holiday (national or state-level).
   */
  private async checkPublicHoliday(dateStr: string): Promise<boolean> {
    const date = new Date(dateStr)
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    const holiday = await PublicHoliday.findOne({
      date: { $gte: date, $lt: nextDay },
    }).lean()

    return !!holiday
  }

  /**
   * Resolve the base hourly rate from award level rates.
   */
  private resolveBaseRate(award: IAward, awardLevel: string, employmentType: string): number {
    if (!award.levelRates || award.levelRates.length === 0) return 0

    const now = new Date()
    const matchingRate = award.levelRates.find(
      (r) =>
        r.level === awardLevel &&
        r.employmentType === employmentType &&
        r.effectiveFrom <= now &&
        (!r.effectiveTo || r.effectiveTo >= now)
    )

    return matchingRate?.hourlyRate ?? 0
  }
}

export const payCalculationService = new PayCalculationService()
