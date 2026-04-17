import { connectDB } from "@/lib/db"
import { scope } from "@/lib/db/tenant-model"
import { TenantContext } from "@/lib/auth/tenant-context"
import { ComplianceRule } from "@/lib/db/schemas/compliance-rule"
import { ComplianceViolation, IComplianceViolation, ResolutionAction } from "@/lib/db/schemas/compliance-violation"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Employer } from "@/lib/db/schemas/employer"
import { complianceEngine, ComplianceResult, ShiftWindow } from "@/lib/engines/compliance-engine"
import { PayPeriodConfig } from "@/lib/engines/compliance-window-resolver"

export type { ComplianceResult, ShiftWindow }

const DEFAULT_PAY_PERIOD_CONFIG: PayPeriodConfig = {
  windowType: 'weekly',
  periodStartDayOfWeek: 1,
}

/** Fetch the tenant's pay period config, falling back to weekly Mon-start. */
async function getPayPeriodConfig(tenantId: string): Promise<PayPeriodConfig> {
  try {
    const employer = await Employer.findById(tenantId)
      .select('payPeriodConfig')
      .lean()
    const cfg = (employer as any)?.payPeriodConfig
    if (cfg?.windowType) return cfg as PayPeriodConfig
  } catch {
    // Non-critical — fall back to default
  }
  return DEFAULT_PAY_PERIOD_CONFIG
}

export class ComplianceService {
  /**
   * Evaluate a single employee's upcoming/new shift against all active rules.
   * Called from: roster save, clock-in handler.
   * Returns the result and optionally persists violations.
   */
  async evaluateShift(
    ctx: TenantContext,
    employeeId: string,
    newShift: ShiftWindow,
    opts: { persist: boolean; lookbackDays?: number }
  ): Promise<ComplianceResult> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const lookbackDays = opts.lookbackDays ?? 14
    const lookbackStart = new Date(newShift.shiftStart)
    lookbackStart.setDate(lookbackStart.getDate() - lookbackDays)

    // 1. Load active compliance rules for the tenant
    const rules = await scope(ComplianceRule, tenantId).find({ isActive: true }).lean()

    // 2. Load recent shifts for the employee
    const recentShifts = await scope(DailyShift, tenantId)
      .find({
        employeeId,
        date: { $gte: lookbackStart, $lte: newShift.shiftEnd },
        status: { $nin: ["rejected"] },
      })
      .lean()

    // 3. Build shift windows from DB records
    const shiftWindows: ShiftWindow[] = recentShifts
      .filter((s: any) => s.clockIn?.time && s.clockOut?.time)
      .map((s: any) => ({
        employeeId,
        shiftStart: s.clockIn!.time,
        shiftEnd: s.clockOut!.time,
        shiftId: s._id.toString(),
        breakMinutes: s.totalBreakMinutes ?? 0,
      }))

    // 4. Append the new shift
    shiftWindows.push(newShift)

    // 5. Evaluate — pass tenant's pay period config so MAX_HOURS uses the right window
    const payPeriodConfig = await getPayPeriodConfig(tenantId)
    const result = complianceEngine.evaluate(shiftWindows, rules, payPeriodConfig)

    // 6. Optionally persist violations
    if (opts.persist && newShift.shiftId) {
      const fullCtx = ctx as { type: "full"; tenantId: string; sub: string } & Record<string, unknown>
      await this.persistViolations(fullCtx, employeeId, newShift.shiftId, result, rules)
    }

    return result
  }

  /**
   * Re-evaluate all active shifts for an employee over a period.
   * Called from: compliance rule update, pay calculation.
   */
  async evaluateEmployee(
    ctx: TenantContext,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ComplianceResult> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const rules = await scope(ComplianceRule, tenantId).find({ isActive: true }).lean()

    const shifts = await scope(DailyShift, tenantId)
      .find({
        employeeId,
        date: { $gte: periodStart, $lte: periodEnd },
        status: { $nin: ["rejected"] },
      })
      .lean()

    const shiftWindows: ShiftWindow[] = shifts
      .filter((s: any) => s.clockIn?.time && s.clockOut?.time)
      .map((s: any) => ({
        employeeId,
        shiftStart: s.clockIn!.time,
        shiftEnd: s.clockOut!.time,
        shiftId: s._id.toString(),
        breakMinutes: s.totalBreakMinutes ?? 0,
      }))

    const payPeriodConfig = await getPayPeriodConfig(tenantId)
    return complianceEngine.evaluate(shiftWindows, rules, payPeriodConfig)
  }

  /**
   * Mark a violation as resolved.
   */
  async resolveViolation(
    ctx: TenantContext,
    violationId: string,
    action: ResolutionAction,
    resolvedBy: string
  ): Promise<void> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    await scope(ComplianceViolation, tenantId).findOneAndUpdate(
      { _id: violationId, isActive: true },
      {
        $set: {
          isActive: false,
          resolvedAt: new Date(),
          resolutionAction: action,
          resolvedBy,
        },
      }
    )
  }

  /**
   * Get all active violations for a tenant, optionally filtered.
   */
  async getViolations(
    ctx: TenantContext,
    filter?: { employeeId?: string; severity?: string; fromDate?: Date }
  ): Promise<IComplianceViolation[]> {
    if (!ctx || ctx.type !== "full") throw new Error("Unauthorized")
    await connectDB()
    const tenantId = (ctx as { tenantId: string }).tenantId

    const query: Record<string, unknown> = { isActive: true }
    if (filter?.employeeId) query.employeeId = filter.employeeId
    if (filter?.severity) query.severity = filter.severity
    if (filter?.fromDate) query.detectedAt = { $gte: filter.fromDate }

    return scope(ComplianceViolation, tenantId).find(query).lean()
  }

  /**
   * Internal: upsert violations for a shift, resolving any that are no longer triggered.
   */
  private async persistViolations(
    ctx: { type: "full"; tenantId: string; sub: string } & Record<string, unknown>,
    employeeId: string,
    shiftId: string,
    result: ComplianceResult,
    rules: Array<{ _id: { toString(): string }; blockPublishOnViolation: boolean }>
  ): Promise<void> {
    const now = new Date()

    // Resolve existing active violations for this shift that are no longer triggered
    const triggeredRuleIds = new Set(result.violations.map((v) => v.ruleId))

    await scope(ComplianceViolation, ctx.tenantId).updateMany(
      {
        shiftId,
        employeeId,
        isActive: true,
        ruleId: { $nin: Array.from(triggeredRuleIds) },
      },
      {
        $set: {
          isActive: false,
          resolvedAt: now,
          resolutionAction: "auto_resolved",
        },
      }
    )

    // Upsert new violations
    for (const violation of result.violations) {
      await scope(ComplianceViolation, ctx.tenantId).findOneAndUpdate(
        {
          shiftId,
          employeeId,
          ruleId: violation.ruleId,
          isActive: true,
        },
        {
          $setOnInsert: {
            tenantId: ctx.tenantId,
            employeeId,
            ruleId: violation.ruleId,
            shiftId,
            severity: violation.severity,
            ruleType: violation.ruleType,
            message: violation.message,
            detectedAt: now,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      )
    }
  }
}

export const complianceService = new ComplianceService()
