export type ComplianceSeverity = "ERROR" | "WARNING"

export type ComplianceRuleType =
  | "MAX_HOURS_PER_WEEK"
  | "MIN_REST_HOURS_BETWEEN_SHIFTS"
  | "MAX_CONSECUTIVE_DAYS"
  | "ROSTER_VARIANCE_THRESHOLD"

export type ComplianceRuleConfig = {
  maxHoursPerWeek?: number
  minRestHoursBetweenShifts?: number
  maxConsecutiveDays?: number
  rosterVarianceThresholdMinutes?: number
}

export type ComplianceCheck = {
  id: string
  type: ComplianceRuleType
  pass: boolean
  severity: ComplianceSeverity
  message: string
  block: boolean
  context?: Record<string, unknown>
}

export type ShiftForCompliance = {
  source: "actual" | "roster"
  date: string // YYYY-MM-DD (local/ISO day)
  startTimeUtc: string // ISO
  endTimeUtc: string // ISO
  rosterShiftId?: string | null
  varianceMinutes?: {
    start?: number | null
    end?: number | null
  }
}

function minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (60 * 1000))
}

function clampToDay(d: Date) {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function runComplianceChecks(input: { shifts: ShiftForCompliance[]; rules?: ComplianceRuleConfig }): {
  checks: ComplianceCheck[]
  summary: { passing: number; total: number; blockingFailures: number }
} {
  const rules: Required<ComplianceRuleConfig> = {
    maxHoursPerWeek: input.rules?.maxHoursPerWeek ?? 38,
    minRestHoursBetweenShifts: input.rules?.minRestHoursBetweenShifts ?? 10,
    maxConsecutiveDays: input.rules?.maxConsecutiveDays ?? 6,
    rosterVarianceThresholdMinutes: input.rules?.rosterVarianceThresholdMinutes ?? 30,
  }

  const shifts = [...(input.shifts ?? [])].sort((a, b) => {
    const aStart = Date.parse(a.startTimeUtc)
    const bStart = Date.parse(b.startTimeUtc)
    return aStart - bStart
  })

  const checks: ComplianceCheck[] = []

  // 1) Max hours per week (sum of shift durations)
  const totalMinutes = shifts.reduce((sum, s) => {
    const start = new Date(s.startTimeUtc)
    const end = new Date(s.endTimeUtc)
    const mins = Math.max(0, minutesBetween(start, end))
    return sum + mins
  }, 0)
  const maxMinutes = Math.round(rules.maxHoursPerWeek * 60)
  checks.push({
    id: "max-hours-per-week",
    type: "MAX_HOURS_PER_WEEK",
    pass: totalMinutes <= maxMinutes,
    severity: "ERROR",
    block: true,
    message:
      totalMinutes <= maxMinutes
        ? `Weekly hours within limit (${(totalMinutes / 60).toFixed(2)}h / ${rules.maxHoursPerWeek}h)`
        : `Weekly hours exceed limit (${(totalMinutes / 60).toFixed(2)}h / ${rules.maxHoursPerWeek}h)`,
    context: { totalMinutes, maxMinutes, maxHoursPerWeek: rules.maxHoursPerWeek },
  })

  // 2) Min rest hours between shifts (adjacent)
  for (let i = 1; i < shifts.length; i++) {
    const prev = shifts[i - 1]
    const cur = shifts[i]
    const prevEnd = new Date(prev.endTimeUtc)
    const curStart = new Date(cur.startTimeUtc)
    const restMinutes = minutesBetween(prevEnd, curStart)
    const minRestMinutes = Math.round(rules.minRestHoursBetweenShifts * 60)
    const pass = restMinutes >= minRestMinutes
    checks.push({
      id: `min-rest-${i}`,
      type: "MIN_REST_HOURS_BETWEEN_SHIFTS",
      pass,
      severity: "ERROR",
      block: true,
      message: pass
        ? `Rest period ok (${restMinutes}m >= ${minRestMinutes}m)`
        : `Rest period too short (${restMinutes}m < ${minRestMinutes}m)`,
      context: {
        prev: { date: prev.date, endTimeUtc: prev.endTimeUtc, source: prev.source },
        cur: { date: cur.date, startTimeUtc: cur.startTimeUtc, source: cur.source },
        restMinutes,
        minRestMinutes,
      },
    })
  }

  // 3) Max consecutive days with any work
  const daysWorked = new Set<string>()
  for (const s of shifts) daysWorked.add(s.date)
  const uniqueDays = [...daysWorked].sort()
  let longest = 0
  let current = 0
  for (let i = 0; i < uniqueDays.length; i++) {
    if (i === 0) {
      current = 1
      longest = 1
      continue
    }
    const prev = new Date(uniqueDays[i - 1] + "T00:00:00.000Z")
    const cur = new Date(uniqueDays[i] + "T00:00:00.000Z")
    const deltaDays = Math.round((clampToDay(cur).getTime() - clampToDay(prev).getTime()) / (24 * 60 * 60 * 1000))
    if (deltaDays === 1) current++
    else current = 1
    longest = Math.max(longest, current)
  }
  checks.push({
    id: "max-consecutive-days",
    type: "MAX_CONSECUTIVE_DAYS",
    pass: longest <= rules.maxConsecutiveDays,
    severity: "WARNING",
    block: false,
    message:
      longest <= rules.maxConsecutiveDays
        ? `Consecutive days ok (${longest} / ${rules.maxConsecutiveDays})`
        : `Too many consecutive days (${longest} / ${rules.maxConsecutiveDays})`,
    context: { longest, maxConsecutiveDays: rules.maxConsecutiveDays, daysWorked: uniqueDays },
  })

  // 4) Roster variance threshold (per shift, if variance present)
  const threshold = rules.rosterVarianceThresholdMinutes
  const withVariance = shifts.filter((s) => s.varianceMinutes?.start != null || s.varianceMinutes?.end != null)
  for (let i = 0; i < withVariance.length; i++) {
    const s = withVariance[i]
    const startVar = s.varianceMinutes?.start
    const endVar = s.varianceMinutes?.end
    const startOk = startVar == null ? true : Math.abs(startVar) <= threshold
    const endOk = endVar == null ? true : Math.abs(endVar) <= threshold
    const pass = startOk && endOk
    checks.push({
      id: `roster-variance-${i}`,
      type: "ROSTER_VARIANCE_THRESHOLD",
      pass,
      severity: "WARNING",
      block: false,
      message: pass
        ? `Roster variance within ${threshold}m`
        : `Roster variance exceeds ${threshold}m`,
      context: {
        date: s.date,
        rosterShiftId: s.rosterShiftId ?? null,
        varianceMinutes: { start: startVar ?? null, end: endVar ?? null },
        thresholdMinutes: threshold,
      },
    })
  }

  const passing = checks.filter((c) => c.pass).length
  const blockingFailures = checks.filter((c) => !c.pass && c.block).length
  return { checks, summary: { passing, total: checks.length, blockingFailures } }
}

