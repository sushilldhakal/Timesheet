import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { ComplianceRule } from "@/lib/db/schemas/compliance-rule"
import { BreakViolation, IBreakViolation } from "@/lib/db/schemas/break-violation"

export class BreakEnforcementService {
  /**
   * Called at clock-out. If rules require a break and none was taken,
   * either auto-insert an unpaid break or flag for manager review.
   */
  async enforceBreaksAtClockOut(
    ctx: TenantContext,
    shiftId: string
  ): Promise<{ breakInserted: boolean; violation?: IBreakViolation }> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()

    const shift = await scope(DailyShift, ctx.tenantId).findById(shiftId)
    if (!shift) throw new Error("Shift not found")

    if (!shift.clockIn?.time || !shift.clockOut?.time) {
      return { breakInserted: false }
    }

    const shiftHours =
      (shift.clockOut.time.getTime() - shift.clockIn.time.getTime()) / (1000 * 60 * 60)
    const actualBreakMinutes = shift.totalBreakMinutes ?? 0

    // Load BREAK_REQUIREMENT rules for the tenant
    const breakRules = await scope(ComplianceRule, ctx.tenantId)
      .find({ ruleType: "BREAK_REQUIREMENT", isActive: true })
      .lean()

    for (const rule of breakRules) {
      if (!rule.breakRules || rule.breakRules.length === 0) continue

      // Find the applicable break rule for this shift duration
      const applicableBreakRule = [...rule.breakRules]
        .sort((a, b) => b.minShiftHours - a.minShiftHours)
        .find((br) => shiftHours >= br.minShiftHours)

      if (!applicableBreakRule) continue

      if (actualBreakMinutes < applicableBreakRule.requiredBreakMinutes) {
        const missedMinutes = applicableBreakRule.requiredBreakMinutes - actualBreakMinutes

        // Auto-insert an unpaid break in the middle of the shift
        const shiftMidpoint = new Date(
          shift.clockIn.time.getTime() +
            (shift.clockOut.time.getTime() - shift.clockIn.time.getTime()) / 2
        )
        const breakStart = new Date(
          shiftMidpoint.getTime() - (applicableBreakRule.requiredBreakMinutes / 2) * 60 * 1000
        )
        const breakEnd = new Date(
          breakStart.getTime() + applicableBreakRule.requiredBreakMinutes * 60 * 1000
        )

        // Insert the break into the shift
        const updatedBreaks = [
          ...(shift.breaks ?? []),
          {
            startTime: breakStart,
            endTime: breakEnd,
            isPaid: false,
            source: "automatic" as const,
          },
        ]

        await scope(DailyShift, ctx.tenantId).findOneAndUpdate(
          { _id: shiftId },
          {
            $set: {
              breaks: updatedBreaks,
              totalBreakMinutes: (actualBreakMinutes + applicableBreakRule.requiredBreakMinutes),
            },
          }
        )

        // Record the break violation
        const violation = await scope(BreakViolation, ctx.tenantId).create({
          tenantId: ctx.tenantId,
          shiftId,
          employeeId: shift.employeeId,
          ruleId: rule._id,
          missedBreakMinutes: missedMinutes,
          requiredBreakMinutes: applicableBreakRule.requiredBreakMinutes,
          actualBreakMinutes,
          detectedAt: new Date(),
          isResolved: true, // auto-resolved by inserting the break
        })

        return { breakInserted: true, violation: violation.toObject() }
      }
    }

    return { breakInserted: false }
  }
}

export const breakEnforcementService = new BreakEnforcementService()
