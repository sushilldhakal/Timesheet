import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import { DailyShift } from "@/lib/db/schemas/daily-shift"
import { Roster, getWeekBoundaries, type IShift as IRosterShift } from "@/lib/db/schemas/roster"
import { runComplianceChecks, type ComplianceRuleConfig, type ShiftForCompliance } from "@/lib/validation/compliance-checker"

export type ReconciledShift = {
  variances?: Array<{
    type:
      | "MISSING_ACTUAL"
      | "EXTRA_ACTUAL"
      | "INCOMPLETE_ACTUAL"
      | "START_TIME_MISMATCH"
      | "END_TIME_MISMATCH"
      | "DURATION_MISMATCH"
    rostered?: string | null
    actual?: string | null
    minutes?: number | null
  }>
  rosterShiftId: string | null
  date: string // YYYY-MM-DD
  roster?: {
    startTimeUtc: string
    endTimeUtc: string
    locationId: string
    roleId: string
    status?: "draft" | "published"
    notes?: string
  } | null
  actual?: {
    dailyShiftId: string
    startTimeUtc: string | null
    endTimeUtc: string | null
    locationId?: string | null
    roleId?: string | null
    breakInTimeUtc?: string | null
    breakOutTimeUtc?: string | null
    status: string
    source: string
    totalBreakMinutes?: number | null
    totalWorkingHours?: number | null
    awardTags?: string[]
    computedTotalCost?: number | null
  } | null
  varianceMinutes: {
    start: number | null
    end: number | null
    duration: number | null
  }
  flags: {
    missingActual: boolean
    extraActual: boolean
    incompleteActual: boolean
  }
}

export type WeekReconciliationResponse = {
  employeeId: string
  weekId: string
  weekStartUtc: string
  weekEndUtc: string
  roster: { weekId: string; rosterId: string | null; status: "draft" | "published" | null }
  actual: { count: number }
  days: Array<{
    date: string
    reconciledShifts: ReconciledShift[]
    totals: {
      rosterMinutes: number
      actualMinutes: number
      varianceMinutes: number
    }
  }>
  variances: {
    totalRosterMinutes: number
    totalActualMinutes: number
    totalVarianceMinutes: number
    missingActualCount: number
    extraActualCount: number
  }
  compliance: ReturnType<typeof runComplianceChecks> & { rules: Required<ComplianceRuleConfig> }
  status: { overall: "PASS" | "WARN" | "FAIL"; message: string }
}

export type RangeReconciliationResponse = {
  employeeId: string
  rangeStartUtc: string
  rangeEndUtc: string
  rosters: { count: number; rosterIds: string[] }
  actual: { count: number }
  days: Array<{
    date: string
    reconciledShifts: ReconciledShift[]
    totals: {
      rosterMinutes: number
      actualMinutes: number
      varianceMinutes: number
    }
  }>
  variances: {
    totalRosterMinutes: number
    totalActualMinutes: number
    totalVarianceMinutes: number
    missingActualCount: number
    extraActualCount: number
  }
  compliance: ReturnType<typeof runComplianceChecks> & { rules: Required<ComplianceRuleConfig> }
  status: { overall: "PASS" | "WARN" | "FAIL"; message: string }
}

function isoDateOnlyUtc(d: Date) {
  return d.toISOString().slice(0, 10)
}

function minutesDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (60 * 1000))
}

function durationMinutes(start: Date | null, end: Date | null) {
  if (!start || !end) return 0
  return Math.max(0, minutesDiff(start, end))
}

function pickActualTimes(shift: any): { start: Date | null; end: Date | null } {
  const start = shift?.clockIn?.time ? new Date(shift.clockIn.time) : null
  const end = shift?.clockOut?.time ? new Date(shift.clockOut.time) : null
  return { start, end }
}

export async function fetchTimesheetWithRoster(input: {
  tenantId: string
  employeeId: string
  weekId: string
}): Promise<{
  week: { start: Date; end: Date }
  roster: { rosterId: string | null; status: "draft" | "published" | null; shifts: Array<IRosterShift & { _id: any }> }
  actual: any[]
}> {
  try {
    await connectDB()
    const { start, end } = getWeekBoundaries(input.weekId)

    const tenantObjectId = new mongoose.Types.ObjectId(input.tenantId)
    const employeeObjectId = new mongoose.Types.ObjectId(input.employeeId)

    // Roster shifts: aggregate so we only pull the employee's shifts for the week.
    const rosterAgg = await Roster.aggregate([
      { $match: { tenantId: tenantObjectId, weekId: input.weekId } },
      {
        $project: {
          _id: 1,
          status: 1,
          shifts: {
            $filter: {
              input: "$shifts",
              as: "s",
              cond: { $eq: ["$$s.employeeId", employeeObjectId] },
            },
          },
        },
      },
    ])

    const rosterDoc = rosterAgg?.[0] ?? null
    const roster = {
      rosterId: rosterDoc?._id ? String(rosterDoc._id) : null,
      status: rosterDoc?.status ?? null,
      shifts: (rosterDoc?.shifts ?? []) as Array<IRosterShift & { _id: any }>,
    }

    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0))
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999))

    // Actuals: single range query, scoped to tenant+employee for the week.
    const actual = await DailyShift.find({
      tenantId: tenantObjectId,
      employeeId: employeeObjectId,
      date: { $gte: startUTC, $lte: endUTC },
      status: { $ne: "rejected" },
    })
      .sort({ date: 1 })
      .lean()

    return { week: { start: startUTC, end: endUTC }, roster, actual }
  } catch (error) {
    console.error("[fetchTimesheetWithRoster] Error:", error)
    throw error
  }
}

function parseYmdToUtcStart(dateString: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString))
  if (!m) throw new Error("Invalid date; expected yyyy-MM-dd")
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0))
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid date; expected yyyy-MM-dd")
  return dt
}

function parseYmdToUtcEnd(dateString: string): Date {
  const start = parseYmdToUtcStart(dateString)
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999))
}

export async function fetchTimesheetWithRosterRange(input: {
  tenantId: string
  employeeId: string
  startDate: string // yyyy-MM-dd
  endDate: string // yyyy-MM-dd
}): Promise<{
  range: { start: Date; end: Date }
  roster: { rosterIds: string[]; shifts: Array<IRosterShift & { _id: any }>; count: number }
  actual: any[]
}> {
  await connectDB()

  const tenantObjectId = new mongoose.Types.ObjectId(input.tenantId)
  const employeeObjectId = new mongoose.Types.ObjectId(input.employeeId)

  const startUTC = parseYmdToUtcStart(input.startDate)
  const endUTC = parseYmdToUtcEnd(input.endDate)

  if (startUTC.getTime() > endUTC.getTime()) {
    throw new Error("startDate must be <= endDate")
  }

  // Roster shifts: pull all published rosters overlapping the range and filter to the employee's shifts in-range.
  const rosterAgg = await Roster.aggregate([
    {
      $match: {
        tenantId: tenantObjectId,
        status: "published",
        weekStartDate: { $lte: endUTC },
        weekEndDate: { $gte: startUTC },
      },
    },
    {
      $project: {
        _id: 1,
        shifts: {
          $filter: {
            input: "$shifts",
            as: "s",
            cond: {
              $and: [
                { $eq: ["$$s.employeeId", employeeObjectId] },
                { $gte: ["$$s.date", startUTC] },
                { $lte: ["$$s.date", endUTC] },
              ],
            },
          },
        },
      },
    },
  ])

  const rosterIds = (rosterAgg ?? [])
    .map((r: any) => (r?._id ? String(r._id) : null))
    .filter(Boolean) as string[]

  const rosterShifts = (rosterAgg ?? []).flatMap((r: any) => (r?.shifts ?? [])) as Array<IRosterShift & { _id: any }>

  // Actuals: single range query, scoped to tenant+employee for the range.
  const actual = await DailyShift.find({
    tenantId: tenantObjectId,
    employeeId: employeeObjectId,
    date: { $gte: startUTC, $lte: endUTC },
    status: { $ne: "rejected" },
  })
    .sort({ date: 1 })
    .lean()

  return {
    range: { start: startUTC, end: endUTC },
    roster: { rosterIds, shifts: rosterShifts, count: rosterIds.length },
    actual,
  }
}

export function compareRosterVsActual(input: {
  rosterShifts: Array<IRosterShift & { _id: any }>
  actualShifts: any[]
}): {
  reconciled: ReconciledShift[]
  unmatchedActual: any[]
} {
  const byRosterShiftId = new Map<string, any>()
  for (const a of input.actualShifts) {
    const rid = a?.rosterShiftId ? String(a.rosterShiftId) : null
    if (rid) byRosterShiftId.set(rid, a)
  }

  const usedActualIds = new Set<string>()
  const reconciled: ReconciledShift[] = []

  for (const r of input.rosterShifts) {
    const rosterShiftId = String((r as any)._id)
    const match = byRosterShiftId.get(rosterShiftId) ?? null
    if (match?._id) usedActualIds.add(String(match._id))

    const rosterStart = r.startTime ? new Date(r.startTime) : null
    const rosterEnd = r.endTime ? new Date(r.endTime) : null

    const actualTimes = match ? pickActualTimes(match) : { start: null, end: null }
    const actualStart = actualTimes.start
    const actualEnd = actualTimes.end

    const startVar = rosterStart && actualStart ? minutesDiff(rosterStart, actualStart) : null
    const endVar = rosterEnd && actualEnd ? minutesDiff(rosterEnd, actualEnd) : null
    const durVar =
      rosterStart && rosterEnd && actualStart && actualEnd
        ? durationMinutes(actualStart, actualEnd) - durationMinutes(rosterStart, rosterEnd)
        : null

    const date = isoDateOnlyUtc(r.date ?? rosterStart ?? new Date())
    const incompleteActual = !!match && (!actualStart || !actualEnd)
    const variances: NonNullable<ReconciledShift["variances"]> = []
    if (!match) {
      variances.push({ type: "MISSING_ACTUAL", rostered: null, actual: null, minutes: null })
    } else if (incompleteActual) {
      variances.push({ type: "INCOMPLETE_ACTUAL", rostered: null, actual: null, minutes: null })
    }
    if (startVar != null) {
      variances.push({
        type: "START_TIME_MISMATCH",
        rostered: rosterStart?.toISOString() ?? null,
        actual: actualStart?.toISOString() ?? null,
        minutes: startVar,
      })
    }
    if (endVar != null) {
      variances.push({
        type: "END_TIME_MISMATCH",
        rostered: rosterEnd?.toISOString() ?? null,
        actual: actualEnd?.toISOString() ?? null,
        minutes: endVar,
      })
    }
    if (durVar != null) {
      variances.push({
        type: "DURATION_MISMATCH",
        rostered: null,
        actual: null,
        minutes: durVar,
      })
    }

    reconciled.push({
      variances,
      rosterShiftId,
      date,
      roster: rosterStart && rosterEnd ? {
        startTimeUtc: rosterStart.toISOString(),
        endTimeUtc: rosterEnd.toISOString(),
        locationId: String((r as any).locationId),
        roleId: String((r as any).roleId),
        status: (r as any).status,
        notes: (r as any).notes ?? "",
      } : null,
      actual: match
        ? {
            dailyShiftId: String(match._id),
            startTimeUtc: actualStart ? actualStart.toISOString() : null,
            endTimeUtc: actualEnd ? actualEnd.toISOString() : null,
            locationId: match?.locationId ? String(match.locationId) : null,
            roleId: match?.roleId ? String(match.roleId) : null,
            breakInTimeUtc: Array.isArray(match.breaks) && match.breaks.length > 0 && match.breaks[0]?.startTime
              ? new Date(match.breaks[0].startTime).toISOString()
              : null,
            breakOutTimeUtc: Array.isArray(match.breaks) && match.breaks.length > 0 && match.breaks[0]?.endTime
              ? new Date(match.breaks[0].endTime).toISOString()
              : null,
            status: String(match.status ?? ""),
            source: String(match.source ?? ""),
            totalBreakMinutes: match.totalBreakMinutes ?? null,
            totalWorkingHours: match.totalWorkingHours ?? null,
            awardTags: Array.isArray(match.awardTags) ? match.awardTags.map((t: any) => String(t)) : [],
            computedTotalCost: typeof match.computed?.totalCost === "number" ? Number(match.computed.totalCost) : null,
          }
        : null,
      varianceMinutes: { start: startVar, end: endVar, duration: durVar },
      flags: { missingActual: !match, extraActual: false, incompleteActual },
    })
  }

  // Any actual shifts not linked to a roster shift are "extra".
  const unmatchedActual = input.actualShifts.filter((a) => !usedActualIds.has(String(a._id)))
  for (const a of unmatchedActual) {
    const { start, end } = pickActualTimes(a)
    const date = isoDateOnlyUtc(a.date ? new Date(a.date) : start ?? new Date())
    reconciled.push({
      variances: [{ type: "EXTRA_ACTUAL", rostered: null, actual: null, minutes: null }],
      rosterShiftId: a?.rosterShiftId ? String(a.rosterShiftId) : null,
      date,
      roster: null,
      actual: {
        dailyShiftId: String(a._id),
        startTimeUtc: start ? start.toISOString() : null,
        endTimeUtc: end ? end.toISOString() : null,
        locationId: a?.locationId ? String(a.locationId) : null,
        roleId: a?.roleId ? String(a.roleId) : null,
        breakInTimeUtc: Array.isArray(a.breaks) && a.breaks.length > 0 && a.breaks[0]?.startTime
          ? new Date(a.breaks[0].startTime).toISOString()
          : null,
        breakOutTimeUtc: Array.isArray(a.breaks) && a.breaks.length > 0 && a.breaks[0]?.endTime
          ? new Date(a.breaks[0].endTime).toISOString()
          : null,
        status: String(a.status ?? ""),
        source: String(a.source ?? ""),
        totalBreakMinutes: a.totalBreakMinutes ?? null,
        totalWorkingHours: a.totalWorkingHours ?? null,
        awardTags: Array.isArray(a.awardTags) ? a.awardTags.map((t: any) => String(t)) : [],
        computedTotalCost: typeof a.computed?.totalCost === "number" ? Number(a.computed.totalCost) : null,
      },
      varianceMinutes: { start: null, end: null, duration: null },
      flags: { missingActual: false, extraActual: true, incompleteActual: !start || !end },
    })
  }

  // Stable sort for UI: date then rosterShiftId then extraActual.
  reconciled.sort((a, b) => {
    const c1 = a.date.localeCompare(b.date)
    if (c1 !== 0) return c1
    const aExtra = a.flags.extraActual ? 1 : 0
    const bExtra = b.flags.extraActual ? 1 : 0
    if (aExtra !== bExtra) return aExtra - bExtra
    return String(a.rosterShiftId ?? "").localeCompare(String(b.rosterShiftId ?? ""))
  })

  return { reconciled, unmatchedActual }
}

export function generateVarianceReport(reconciled: ReconciledShift[]) {
  let totalRosterMinutes = 0
  let totalActualMinutes = 0
  let missingActualCount = 0
  let extraActualCount = 0

  for (const rs of reconciled) {
    if (rs.flags.missingActual) missingActualCount++
    if (rs.flags.extraActual) extraActualCount++
    if (rs.roster?.startTimeUtc && rs.roster?.endTimeUtc) {
      totalRosterMinutes += durationMinutes(new Date(rs.roster.startTimeUtc), new Date(rs.roster.endTimeUtc))
    }
    if (rs.actual?.startTimeUtc && rs.actual?.endTimeUtc) {
      totalActualMinutes += durationMinutes(
        rs.actual.startTimeUtc ? new Date(rs.actual.startTimeUtc) : null,
        rs.actual.endTimeUtc ? new Date(rs.actual.endTimeUtc) : null
      )
    }
  }

  return {
    totalRosterMinutes,
    totalActualMinutes,
    totalVarianceMinutes: totalActualMinutes - totalRosterMinutes,
    missingActualCount,
    extraActualCount,
  }
}

export function validateComplianceRules(input: {
  reconciled: ReconciledShift[]
  rules?: ComplianceRuleConfig
}) {
  const shifts: ShiftForCompliance[] = input.reconciled
    .map((s) => {
      const start = s.actual?.startTimeUtc ?? s.roster?.startTimeUtc ?? null
      const end = s.actual?.endTimeUtc ?? s.roster?.endTimeUtc ?? null
      if (!start || !end) return null
      return {
        source: s.actual ? "actual" : "roster",
        date: s.date,
        startTimeUtc: start,
        endTimeUtc: end,
        rosterShiftId: s.rosterShiftId ?? null,
        varianceMinutes: {
          start: s.varianceMinutes.start,
          end: s.varianceMinutes.end,
        },
      } satisfies ShiftForCompliance
    })
    .filter(Boolean) as ShiftForCompliance[]

  const res = runComplianceChecks({ shifts, rules: input.rules })
  const rulesOut: Required<ComplianceRuleConfig> = {
    maxHoursPerWeek: input.rules?.maxHoursPerWeek ?? 38,
    minRestHoursBetweenShifts: input.rules?.minRestHoursBetweenShifts ?? 10,
    maxConsecutiveDays: input.rules?.maxConsecutiveDays ?? 6,
    rosterVarianceThresholdMinutes: input.rules?.rosterVarianceThresholdMinutes ?? 30,
  }
  return { ...res, rules: rulesOut }
}

export function calculateTimesheetStatus(compliance: ReturnType<typeof validateComplianceRules>, variances: ReturnType<typeof generateVarianceReport>) {
  const blockingFailures = compliance.summary.blockingFailures
  const overall: "PASS" | "WARN" | "FAIL" =
    blockingFailures > 0 ? "FAIL" : variances.missingActualCount > 0 ? "WARN" : "PASS"

  const message = `${compliance.summary.passing} of ${compliance.summary.total} checks passing`
  return { overall, message }
}

export async function reconcileWeek(input: {
  tenantId: string
  employeeId: string
  weekId: string
  rules?: ComplianceRuleConfig
}): Promise<WeekReconciliationResponse> {
  try {
    const { week, roster, actual } = await fetchTimesheetWithRoster(input)
    const { reconciled } = compareRosterVsActual({ rosterShifts: roster.shifts, actualShifts: actual })

    const byDay = new Map<string, ReconciledShift[]>()
    for (const s of reconciled) {
      if (!byDay.has(s.date)) byDay.set(s.date, [])
      byDay.get(s.date)!.push(s)
    }
    const days = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, shifts]) => {
        const rosterMinutes = shifts.reduce((sum, s) => {
          if (!s.roster?.startTimeUtc || !s.roster?.endTimeUtc) return sum
          return sum + durationMinutes(new Date(s.roster.startTimeUtc), new Date(s.roster.endTimeUtc))
        }, 0)
        const actualMinutes = shifts.reduce((sum, s) => {
          if (!s.actual?.startTimeUtc || !s.actual?.endTimeUtc) return sum
          return (
            sum +
            durationMinutes(
              s.actual.startTimeUtc ? new Date(s.actual.startTimeUtc) : null,
              s.actual.endTimeUtc ? new Date(s.actual.endTimeUtc) : null
            )
          )
        }, 0)
        return {
          date,
          reconciledShifts: shifts,
          totals: { rosterMinutes, actualMinutes, varianceMinutes: actualMinutes - rosterMinutes },
        }
      })

    const variances = generateVarianceReport(reconciled)
    const compliance = validateComplianceRules({ reconciled, rules: input.rules })
    const status = calculateTimesheetStatus(compliance, variances)

    return {
      employeeId: input.employeeId,
      weekId: input.weekId,
      weekStartUtc: week.start.toISOString(),
      weekEndUtc: week.end.toISOString(),
      roster: { weekId: input.weekId, rosterId: roster.rosterId, status: roster.status },
      actual: { count: actual.length },
      days,
      variances,
      compliance,
      status,
    }
  } catch (error) {
    console.error("[reconcileWeek] Error fetching/reconciling week:", { ...input, error: error instanceof Error ? error.message : error })
    throw error
  }
}

export async function reconcileRange(input: {
  tenantId: string
  employeeId: string
  startDate: string // yyyy-MM-dd
  endDate: string // yyyy-MM-dd
  rules?: ComplianceRuleConfig
}): Promise<RangeReconciliationResponse> {
  try {
    const { range, roster, actual } = await fetchTimesheetWithRosterRange(input)
    const { reconciled } = compareRosterVsActual({ rosterShifts: roster.shifts, actualShifts: actual })

    const byDay = new Map<string, ReconciledShift[]>()
    for (const s of reconciled) {
      if (!byDay.has(s.date)) byDay.set(s.date, [])
      byDay.get(s.date)!.push(s)
    }

    const days = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, shifts]) => {
        const rosterMinutes = shifts.reduce((sum, s) => {
          if (!s.roster?.startTimeUtc || !s.roster?.endTimeUtc) return sum
          return sum + durationMinutes(new Date(s.roster.startTimeUtc), new Date(s.roster.endTimeUtc))
        }, 0)
        const actualMinutes = shifts.reduce((sum, s) => {
          if (!s.actual?.startTimeUtc || !s.actual?.endTimeUtc) return sum
          return (
            sum +
            durationMinutes(
              s.actual.startTimeUtc ? new Date(s.actual.startTimeUtc) : null,
              s.actual.endTimeUtc ? new Date(s.actual.endTimeUtc) : null,
            )
          )
        }, 0)
        return {
          date,
          reconciledShifts: shifts,
          totals: { rosterMinutes, actualMinutes, varianceMinutes: actualMinutes - rosterMinutes },
        }
      })

    const variances = generateVarianceReport(reconciled)
    const compliance = validateComplianceRules({ reconciled, rules: input.rules })
    const status = calculateTimesheetStatus(compliance, variances)

    return {
      employeeId: input.employeeId,
      rangeStartUtc: range.start.toISOString(),
      rangeEndUtc: range.end.toISOString(),
      rosters: { count: roster.count, rosterIds: roster.rosterIds },
      actual: { count: actual.length },
      days,
      variances,
      compliance,
      status,
    }
  } catch (error) {
    console.error("[reconcileRange] Error fetching/reconciling range:", {
      ...input,
      error: error instanceof Error ? error.message : error,
    })
    throw error
  }
}

