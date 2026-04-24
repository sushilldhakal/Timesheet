import { Award, AwardRule, ShiftContext, PayLineItem, AwardEngineResult, RuleConditions, TimeSegment } from "@/lib/validations/awards"

// ─── Timezone-safe date helpers ───────────────────────────
// All rule evaluation that depends on "what day/hour is this shift" must use
// the YYYY-MM-DD string and HH:MM wall-clock time that the caller supplied,
// NOT getDay()/getHours() on a UTC Date object.  When the browser and server
// are in different timezones a UTC Date can be one calendar day off.

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const
type DayName = typeof DAY_NAMES[number]

/**
 * Return the day-of-week for a YYYY-MM-DD string without any timezone conversion.
 * Falls back to date.getDay() when no string is available (processShift path where
 * the segment Date was constructed from a local timestamp on the same machine).
 */
function dayNameFromDateString(dateStr: string | undefined, fallbackDate: Date): DayName {
  if (dateStr) {
    // Parse the date components directly — no timezone involved
    const [y, m, d] = dateStr.split('-').map(Number)
    const localDate = new Date(y, m - 1, d)
    return DAY_NAMES[localDate.getDay()]
  }
  return DAY_NAMES[fallbackDate.getDay()]
}

/**
 * Return the wall-clock hour (0-23) from an ISO string or a Date.
 * When the ISO string is available we read the HH part directly so the result
 * is always the local wall-clock hour the user typed, regardless of UTC offset.
 */
function wallClockHour(isoString: string | undefined, fallbackDate: Date): number {
  if (isoString) {
    // ISO format: "2026-04-25T09:00:00.000Z" or "2026-04-25T09:00:00"
    // The T-separated time part gives us the wall-clock hour the client sent.
    const timePart = isoString.split('T')[1]
    if (timePart) return parseInt(timePart.slice(0, 2), 10)
  }
  return fallbackDate.getHours()
}

/**
 * Core Award Engine - Implements Tanda-style rule evaluation
 *
 * Key Features:
 * 1. Rule Specificity - Most specific rule wins
 * 2. Time Segment Processing - 15-minute intervals with cumulative hour tracking
 * 3. Award Tag Overrides - Manual rule modifications
 * 4. Rule Stacking - stackable rules (allowances) apply alongside the winner
 * 5. Cost Calculation - Produces dollar amounts using baseRate
 * 6. Line Item Output - Tanda-style pay lines for export
 *
 * evaluateRulesForContext() is the shared entry point used by both processShift()
 * and the evaluate-rules API, ensuring the simulator and costing engine always agree.
 */
export class AwardEngine {
  private award: Award

  constructor(award: Award) {
    this.award = award
  }

  // ─── Public: shift costing ────────────────────────────────

  processShift(context: ShiftContext): AwardEngineResult {
    const timeSegments = this.createTimeSegments(context.startTime, context.endTime)

    const payLines: PayLineItem[] = []
    const breakEntitlements: any[] = []
    const leaveAccruals: any[] = []

    // Cumulative hours at the START of each segment (threshold semantics: >= threshold → OT)
    let cumulativeDailyHours = context.dailyHoursWorked
    let cumulativeWeeklyHours = context.weeklyHoursWorked

    for (const segment of timeSegments) {
      const segmentHours = this.getSegmentDurationMinutes(segment.start, segment.end) / 60

      const segmentContext: ShiftContext = {
        ...context,
        dailyHoursWorked: cumulativeDailyHours,
        weeklyHoursWorked: cumulativeWeeklyHours,
      }

      const applicableRules = this.findApplicableRules(segment, segmentContext)
      const nonStackableRules = applicableRules.filter(r => !r.canStack)
      const stackableRules = applicableRules.filter(r => r.canStack)
      const winningRule = this.selectMostSpecificRule(nonStackableRules)

      if (winningRule) {
        const payLine = this.createPayLineItem(winningRule, segment.start, segment.end, segmentHours, context.baseRate)
        if (payLine) payLines.push(payLine)

        if (winningRule.outcome.type === 'break') {
          // Emit break entitlement once per rule, not once per segment
          const alreadyEmitted = breakEntitlements.some(b => b.name === winningRule.name)
          if (!alreadyEmitted) {
            breakEntitlements.push({
              startTime: segment.start,
              durationMinutes: winningRule.outcome.durationMinutes || 0,
              isPaid: winningRule.outcome.isPaid || false,
              name: winningRule.name,
              exportName: winningRule.outcome.exportName,
            })
          }
        }

        if (winningRule.outcome.type === 'leave') {
          leaveAccruals.push({
            type: winningRule.outcome.leaveType || 'annual',
            hoursAccrued: segmentHours * (winningRule.outcome.accrualRate || 0),
            exportName: winningRule.outcome.exportName,
          })
        }
      }

      // Stackable rules (e.g. allowances) apply on top of the winner
      for (const stackableRule of stackableRules) {
        const stackPayLine = this.createPayLineItem(stackableRule, segment.start, segment.end, segmentHours, context.baseRate)
        if (stackPayLine) payLines.push(stackPayLine)
      }

      // Advance cumulative counters for the next segment
      cumulativeDailyHours += segmentHours
      cumulativeWeeklyHours += segmentHours
    }

    const consolidatedPayLines = this.consolidatePayLines(payLines)
    const totalCost = consolidatedPayLines.reduce((sum, line) => sum + line.cost, 0)
    const totalHours = consolidatedPayLines.reduce((sum, line) => sum + line.units, 0)

    return { payLines: consolidatedPayLines, totalCost, totalHours, breakEntitlements, leaveAccruals }
  }

  // ─── Public: single-point evaluation (simulator / API) ───

  /**
   * Evaluate all rules for a single point-in-time context.
   * Uses the same condition logic as processShift so the simulator and
   * the costing engine always pick the same winning rule for the same input.
   */
  evaluateRulesForContext(context: {
    shiftDate: Date
    startTime: Date
    endTime: Date
    startWallClock?: string
    endWallClock?: string
    employmentType: string
    awardTags: string[]
    isPublicHoliday: boolean
    dailyHoursWorked: number
    weeklyHoursWorked: number
  }): {
    allRulesEvaluation: Array<{
      rule: AwardRule
      matched: boolean
      matchedConditions: Array<{ conditionName: string; conditionValue: unknown; met: boolean; reason: string }>
      unmatchedConditions: Array<{ conditionName: string; conditionValue: unknown; reason: string }>
      specificity: number
      priority: number
      totalScore: number
    }>
    selectedRule: AwardRule | null
    selectedOutcome: AwardRule['outcome'] | null
    explanation: string
  } {
    const segment = { start: context.startTime, end: context.endTime }
    const shiftContext: ShiftContext = {
      employeeId: '',
      employmentType: context.employmentType,
      baseRate: 0,
      startTime: context.startTime,
      endTime: context.endTime,
      // Pass the YYYY-MM-DD string so evaluateConditions can do timezone-safe day-of-week
      shiftDate: context.shiftDate.toISOString().slice(0, 10),
      awardTags: context.awardTags,
      isPublicHoliday: context.isPublicHoliday,
      weeklyHoursWorked: context.weeklyHoursWorked,
      dailyHoursWorked: context.dailyHoursWorked,
      consecutiveShifts: 0,
      breaks: [],
    }

    // Extract wall-clock hour: prefer explicit startWallClock (e.g. "09:00") from the client.
    // This is the PRIMARY path for all UI testing surfaces (TestScenariosTab, TestAwardDialog, RuleSimulator).
    // Fallbacks exist only for legacy compatibility with processShift() path.
    let wallHour: number
    if (context.startWallClock) {
      // PRIMARY: Explicit wall-clock time from UI (e.g., "09:00")
      const [h] = context.startWallClock.split(':').map(Number)
      wallHour = h
    } else {
      // LEGACY FALLBACK: For processShift() path where wall-clock is not provided
      const startIso = context.startTime.toISOString()
      wallHour = wallClockHour(startIso, context.startTime)
    }
    const segmentWithHour = { ...segment, startHour: wallHour }

    const activeRules = (this.award.rules || []).filter((r: AwardRule) => r.isActive !== false)

    const allRulesEvaluation = activeRules.map((rule: AwardRule) => {
      // Build per-condition detail for the UI
      const matchedConditions: Array<{ conditionName: string; conditionValue: unknown; met: boolean; reason: string }> = []
      const unmatchedConditions: Array<{ conditionName: string; conditionValue: unknown; reason: string }> = []

      // Describe all conditions (including tags) for the UI
      this.describeConditions(rule, context, shiftContext, segmentWithHour, matchedConditions, unmatchedConditions)

      // Determine matched flag from described conditions
      // A rule matches if ALL conditions are met (no unmatched conditions)
      const matched = unmatchedConditions.length === 0

      const specificity = this.calculateSpecificity(rule.conditions)
      const priority = rule.priority || 0
      const totalScore = (specificity * 100) + priority

      return { rule, matched, matchedConditions, unmatchedConditions, specificity, priority, totalScore }
    })

    allRulesEvaluation.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1
      return b.totalScore - a.totalScore
    })

    const matchedNonStack = allRulesEvaluation.filter(r => r.matched && !r.rule.canStack)
    const selectedEntry = matchedNonStack[0] ?? null
    const selectedRule = selectedEntry?.rule ?? null
    const selectedOutcome = selectedRule?.outcome ?? null

    const explanationParts = allRulesEvaluation.map(e => {
      const status = e.matched ? '✓' : '✗'
      const summary = e.matchedConditions.length > 0
        ? e.matchedConditions.map(c => `${c.conditionName} ✓`).join(', ')
        : 'always applies (0 conditions)'
      return `${status} ${e.rule.name}: ${summary}`
    })
    if (selectedRule) {
      explanationParts.push('')
      explanationParts.push(`Selected: ${selectedRule.name} (specificity: ${selectedEntry!.specificity}, priority: ${selectedEntry!.priority}, score: ${selectedEntry!.totalScore})`)
    } else {
      explanationParts.push('')
      explanationParts.push('No rule matched all conditions.')
    }

    return { allRulesEvaluation, selectedRule, selectedOutcome, explanation: explanationParts.join('\n') }
  }

  // ─── Private helpers ──────────────────────────────────────

  private describeConditions(
    rule: AwardRule,
    context: { shiftDate: Date; startTime: Date; endTime: Date; employmentType: string; awardTags: string[]; isPublicHoliday: boolean; dailyHoursWorked: number; weeklyHoursWorked: number },
    shiftContext: ShiftContext,
    segment: { start: Date; end: Date; startHour?: number },
    matched: Array<{ conditionName: string; conditionValue: unknown; met: boolean; reason: string }>,
    unmatched: Array<{ conditionName: string; conditionValue: unknown; reason: string }>
  ) {
    const c = rule.conditions
    const push = (name: string, value: unknown, met: boolean, reason: string) => {
      if (met) matched.push({ conditionName: name, conditionValue: value, met, reason })
      else unmatched.push({ conditionName: name, conditionValue: value, reason })
    }

    // Timezone-safe: use the YYYY-MM-DD string from shiftDate ISO, not getDay() on a UTC Date
    const shiftDateStr = context.shiftDate.toISOString().slice(0, 10)
    const dayOfWeek = dayNameFromDateString(shiftDateStr, context.shiftDate)
    // Timezone-safe: use pre-extracted wall-clock hour when available
    const startHour = segment.startHour !== undefined ? segment.startHour : context.startTime.getHours()

    if (c.daysOfWeek?.length) {
      const met = c.daysOfWeek.includes(dayOfWeek as any)
      push('daysOfWeek', c.daysOfWeek, met, met ? `${dayOfWeek} ∈ [${c.daysOfWeek.join(',')}]` : `${dayOfWeek} ∉ [${c.daysOfWeek.join(',')}]`)
    }
    if (c.timeRange) {
      const h = startHour
      const { start, end } = c.timeRange
      const met = end > start ? (h >= start && h < end) : (h >= start || h < end)
      push('timeRange', c.timeRange, met, met ? `${h}:00 in range ${start}-${end}` : `${h}:00 outside range ${start}-${end}`)
    }
    if (c.minHoursWorked !== undefined) {
      const dur = (context.endTime.getTime() - context.startTime.getTime()) / 3600000
      const met = dur >= c.minHoursWorked
      push('minHoursWorked', c.minHoursWorked, met, met ? `${dur.toFixed(2)}h >= ${c.minHoursWorked}h` : `${dur.toFixed(2)}h < ${c.minHoursWorked}h`)
    }
    if (c.afterHoursWorked !== undefined) {
      const met = context.dailyHoursWorked >= c.afterHoursWorked
      push('afterHoursWorked', c.afterHoursWorked, met, met ? `${context.dailyHoursWorked.toFixed(2)}h >= ${c.afterHoursWorked}h` : `${context.dailyHoursWorked.toFixed(2)}h < ${c.afterHoursWorked}h`)
    }
    if (c.afterOvertimeHours !== undefined) {
      const ot = Math.max(0, context.dailyHoursWorked - 8)
      const met = ot >= c.afterOvertimeHours
      push('afterOvertimeHours', c.afterOvertimeHours, met, met ? `${ot.toFixed(2)}h OT >= ${c.afterOvertimeHours}h` : `${ot.toFixed(2)}h OT < ${c.afterOvertimeHours}h`)
    }
    if (c.weeklyHoursThreshold !== undefined) {
      const met = context.weeklyHoursWorked >= c.weeklyHoursThreshold
      push('weeklyHoursThreshold', c.weeklyHoursThreshold, met, met ? `${context.weeklyHoursWorked.toFixed(2)}h >= ${c.weeklyHoursThreshold}h` : `${context.weeklyHoursWorked.toFixed(2)}h < ${c.weeklyHoursThreshold}h`)
    }
    if (c.employmentTypes?.length) {
      const met = c.employmentTypes.includes(context.employmentType)
      push('employmentTypes', c.employmentTypes, met, met ? `${context.employmentType} ∈ [${c.employmentTypes.join(',')}]` : `${context.employmentType} ∉ [${c.employmentTypes.join(',')}]`)
    }
    if (c.requiredTags?.length) {
      const met = c.requiredTags.every(t => context.awardTags.includes(t))
      push('requiredTags', c.requiredTags, met, met ? `All required tags present` : `Missing: [${c.requiredTags.filter(t => !context.awardTags.includes(t)).join(',')}]`)
    }
    if (c.excludedTags?.length) {
      const met = !c.excludedTags.some(t => context.awardTags.includes(t))
      push('excludedTags', c.excludedTags, met, met ? `No excluded tags present` : `Excluded tag present`)
    }
    if (c.isPublicHoliday !== undefined) {
      const met = context.isPublicHoliday === c.isPublicHoliday
      push('isPublicHoliday', c.isPublicHoliday, met, met ? `Public holiday matches` : `Public holiday mismatch (got ${context.isPublicHoliday})`)
    }
  }

  private createPayLineItem(rule: AwardRule, startTime: Date, endTime: Date, hours: number, baseRate: number): PayLineItem | null {
    const outcome = rule.outcome
    switch (outcome.type) {
      case 'ordinary':
      case 'overtime': {
        const multiplier = outcome.multiplier || 1.0
        return {
          units: hours,
          from: startTime,
          to: endTime,
          name: rule.name,
          exportName: outcome.exportName,
          ordinaryHours: outcome.type === 'ordinary' ? hours : 0,
          cost: hours * baseRate * multiplier,
          baseRate,
          multiplier,
          ruleId: rule.id,
        }
      }
      case 'allowance': {
        return {
          units: hours,
          from: startTime,
          to: endTime,
          name: rule.name,
          exportName: outcome.exportName,
          ordinaryHours: 0,
          cost: outcome.flatRate || 0,
          baseRate,
          ruleId: rule.id,
        }
      }
      case 'toil': {
        return {
          units: hours * (outcome.accrualMultiplier || 1.0),
          from: startTime,
          to: endTime,
          name: rule.name,
          exportName: outcome.exportName,
          ordinaryHours: 0,
          cost: 0,
          baseRate,
          ruleId: rule.id,
        }
      }
      default:
        return null
    }
  }

  private consolidatePayLines(payLines: PayLineItem[]): PayLineItem[] {
    if (payLines.length === 0) return []
    const consolidated: PayLineItem[] = []
    let current = { ...payLines[0] }
    for (let i = 1; i < payLines.length; i++) {
      const next = payLines[i]
      if (
        current.exportName === next.exportName &&
        current.baseRate === next.baseRate &&
        current.multiplier === next.multiplier &&
        current.to.getTime() === next.from.getTime()
      ) {
        current.units += next.units
        current.ordinaryHours += next.ordinaryHours
        current.cost += next.cost
        current.to = next.to
      } else {
        consolidated.push(current)
        current = { ...next }
      }
    }
    consolidated.push(current)
    return consolidated
  }

  private createTimeSegments(startTime: Date, endTime: Date): Array<{ start: Date; end: Date }> {
    const segments: Array<{ start: Date; end: Date }> = []
    const segmentMs = 15 * 60 * 1000
    let currentTime = new Date(startTime)
    while (currentTime < endTime) {
      const segmentEnd = new Date(currentTime.getTime() + segmentMs)
      const actualEnd = segmentEnd > endTime ? endTime : segmentEnd
      segments.push({ start: new Date(currentTime), end: actualEnd })
      currentTime = segmentEnd
    }
    return segments
  }

  private findApplicableRules(segment: { start: Date; end: Date }, context: ShiftContext): AwardRule[] {
    return this.award.rules.filter(rule => {
      if (!rule.isActive) return false
      if (!this.checkTagConditions(rule, context.awardTags)) return false
      return this.evaluateConditions(rule.conditions, segment, context)
    })
  }

  selectMostSpecificRule(rules: AwardRule[]): AwardRule | null {
    if (rules.length === 0) return null
    if (rules.length === 1) return rules[0]
    const scored = rules.map(rule => ({
      rule,
      specificity: this.calculateSpecificity(rule.conditions),
      priority: rule.priority,
    }))
    scored.sort((a, b) => {
      if (a.specificity !== b.specificity) return b.specificity - a.specificity
      return b.priority - a.priority
    })
    return scored[0].rule
  }

  calculateSpecificity(conditions: RuleConditions): number {
    let score = 0
    if (conditions.daysOfWeek) score += 10 - conditions.daysOfWeek.length
    if (conditions.timeRange) score += 20 - (conditions.timeRange.end - conditions.timeRange.start)
    if (conditions.afterHoursWorked !== undefined) score += 15
    if (conditions.afterOvertimeHours !== undefined) score += 20
    if (conditions.weeklyHoursThreshold !== undefined) score += 10
    if (conditions.employmentTypes) score += 15 - conditions.employmentTypes.length
    if (conditions.outsideRoster) score += 25
    if (conditions.isPublicHoliday) score += 30
    if (conditions.requiredTags && conditions.requiredTags.length > 0) score += 35
    return score
  }

  checkTagConditions(rule: AwardRule, awardTags: string[]): boolean {
    if (rule.conditions.requiredTags) {
      if (!rule.conditions.requiredTags.every(tag => awardTags.includes(tag))) return false
    }
    if (rule.conditions.excludedTags) {
      if (rule.conditions.excludedTags.some(tag => awardTags.includes(tag))) return false
    }
    return true
  }

  evaluateConditions(conditions: RuleConditions, segment: { start: Date; end: Date; startHour?: number }, context: ShiftContext): boolean {
    if (conditions.daysOfWeek) {
      // Use shiftDate string when available for timezone-safe day-of-week
      const dayName = dayNameFromDateString(context.shiftDate, segment.start)
      if (!conditions.daysOfWeek.includes(dayName)) return false
    }

    if (conditions.timeRange) {
      // Use pre-extracted wall-clock hour when available (API path), else getHours() (server-local path)
      const segmentHour = segment.startHour !== undefined ? segment.startHour : segment.start.getHours()
      const { start, end } = conditions.timeRange
      if (end > start) {
        if (segmentHour < start || segmentHour >= end) return false
      } else {
        if (segmentHour < start && segmentHour >= end) return false
      }
    }

    const shiftDuration = (context.endTime.getTime() - context.startTime.getTime()) / 3600000
    if (conditions.minHoursWorked !== undefined && shiftDuration < conditions.minHoursWorked) return false

    // Threshold semantics: cumulative hours at segment START >= threshold → rule applies
    if (conditions.afterHoursWorked !== undefined && context.dailyHoursWorked < conditions.afterHoursWorked) return false

    if (conditions.afterOvertimeHours !== undefined) {
      const overtimeHours = Math.max(0, context.dailyHoursWorked - 8)
      if (overtimeHours < conditions.afterOvertimeHours) return false
    }

    if (conditions.weeklyHoursThreshold !== undefined && context.weeklyHoursWorked < conditions.weeklyHoursThreshold) return false

    if (conditions.employmentTypes && !conditions.employmentTypes.includes(context.employmentType)) return false

    if (conditions.outsideRoster && context.rosteredStart && context.rosteredEnd) {
      const isOutsideRoster = context.startTime < context.rosteredStart || context.endTime > context.rosteredEnd
      if (!isOutsideRoster) return false
    }

    if (conditions.isPublicHoliday !== undefined && conditions.isPublicHoliday !== context.isPublicHoliday) return false

    return true
  }

  private getDayName(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    return days[date.getDay()]
  }

  private getSegmentDurationMinutes(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / 60000
  }
}

export function processShiftWithAward(award: Award, context: ShiftContext): AwardEngineResult {
  const engine = new AwardEngine(award)
  return engine.processShift(context)
}

export const COMMON_AWARD_TAGS = {
  TOIL: 'TOIL',
  BROKEN_SHIFT: 'BrokenShift',
  PUBLIC_HOLIDAY_OVERRIDE: 'PublicHolidayOverride',
  RETURN_TO_DUTY: 'ReturnToDuty',
  SICK_LEAVE: 'SickLeave',
  ANNUAL_LEAVE: 'AnnualLeave',
} as const
