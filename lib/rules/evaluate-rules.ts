import { connectDB } from "@/lib/db"
import AwardModel from "@/lib/db/schemas/award"
import type { AwardRule, RuleConditions } from "@/lib/validations/awards"
import { getConditionExplanation, type ConditionType } from "./condition-explanations"

interface EvaluateContext {
  awardId: string
  shiftDate: Date
  startTime: Date
  endTime: Date
  employmentType: string
  awardTags: string[]
  isPublicHoliday: boolean
  dailyHoursWorked: number
  weeklyHoursWorked: number
  locationId?: string
}

interface ConditionEvaluation {
  conditionName: string
  conditionValue: unknown
  met: boolean
  reason: string
}

interface RuleEvaluation {
  rule: AwardRule
  matched: boolean
  matchedConditions: ConditionEvaluation[]
  unmatchedConditions: {
    conditionName: string
    conditionValue: unknown
    reason: string
  }[]
  specificity: number
  priority: number
  totalScore: number
}

interface EvaluationResult {
  allRulesEvaluation: RuleEvaluation[]
  selectedRule: AwardRule | null
  selectedOutcome: AwardRule['outcome'] | null
  explanation: string
  error?: string
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function getDayOfWeek(date: Date): string {
  return DAY_NAMES[date.getDay()]
}

function evaluateConditionsForRule(
  rule: AwardRule,
  context: EvaluateContext
): { matched: ConditionEvaluation[]; unmatched: ConditionEvaluation[] } {
  const matched: ConditionEvaluation[] = []
  const unmatched: ConditionEvaluation[] = []
  const conditions = rule.conditions

  if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
    const dayOfWeek = getDayOfWeek(context.shiftDate)
    const met = conditions.daysOfWeek.includes(dayOfWeek as RuleConditions['daysOfWeek'] extends (infer T)[] | undefined ? T : never)
    const explanation = getConditionExplanation('daysOfWeek', conditions.daysOfWeek, dayOfWeek, met)
    const entry: ConditionEvaluation = {
      conditionName: 'daysOfWeek',
      conditionValue: conditions.daysOfWeek,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.timeRange) {
    const shiftHour = context.startTime.getHours()
    const { start, end } = conditions.timeRange
    let met: boolean
    if (end > start) {
      met = shiftHour >= start && shiftHour < end
    } else {
      met = shiftHour >= start || shiftHour < end
    }
    const explanation = getConditionExplanation('timeRange', conditions.timeRange, shiftHour, met)
    const entry: ConditionEvaluation = {
      conditionName: 'timeRange',
      conditionValue: conditions.timeRange,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.minHoursWorked !== undefined) {
    const shiftDuration = (context.endTime.getTime() - context.startTime.getTime()) / (1000 * 60 * 60)
    const met = shiftDuration >= conditions.minHoursWorked
    const explanation = getConditionExplanation('minHoursWorked', conditions.minHoursWorked, Number(shiftDuration.toFixed(2)), met)
    const entry: ConditionEvaluation = {
      conditionName: 'minHoursWorked',
      conditionValue: conditions.minHoursWorked,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.afterHoursWorked !== undefined) {
    const met = context.dailyHoursWorked > conditions.afterHoursWorked
    const explanation = getConditionExplanation('afterHoursWorked', conditions.afterHoursWorked, context.dailyHoursWorked, met)
    const entry: ConditionEvaluation = {
      conditionName: 'afterHoursWorked',
      conditionValue: conditions.afterHoursWorked,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.afterOvertimeHours !== undefined) {
    const overtimeHours = Math.max(0, context.dailyHoursWorked - 8)
    const met = overtimeHours > conditions.afterOvertimeHours
    const explanation = getConditionExplanation('afterOvertimeHours', conditions.afterOvertimeHours, Number(overtimeHours.toFixed(2)), met)
    const entry: ConditionEvaluation = {
      conditionName: 'afterOvertimeHours',
      conditionValue: conditions.afterOvertimeHours,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.weeklyHoursThreshold !== undefined) {
    const met = context.weeklyHoursWorked > conditions.weeklyHoursThreshold
    const explanation = getConditionExplanation('weeklyHoursThreshold', conditions.weeklyHoursThreshold, context.weeklyHoursWorked, met)
    const entry: ConditionEvaluation = {
      conditionName: 'weeklyHoursThreshold',
      conditionValue: conditions.weeklyHoursThreshold,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.employmentTypes && conditions.employmentTypes.length > 0) {
    const met = conditions.employmentTypes.includes(context.employmentType)
    const explanation = getConditionExplanation('employmentTypes', conditions.employmentTypes, context.employmentType, met)
    const entry: ConditionEvaluation = {
      conditionName: 'employmentTypes',
      conditionValue: conditions.employmentTypes,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.requiredTags && conditions.requiredTags.length > 0) {
    const met = conditions.requiredTags.every(tag => context.awardTags.includes(tag))
    const explanation = getConditionExplanation('requiredTags', conditions.requiredTags, context.awardTags, met)
    const entry: ConditionEvaluation = {
      conditionName: 'requiredTags',
      conditionValue: conditions.requiredTags,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.excludedTags && conditions.excludedTags.length > 0) {
    const met = !conditions.excludedTags.some(tag => context.awardTags.includes(tag))
    const explanation = getConditionExplanation('excludedTags', conditions.excludedTags, context.awardTags, met)
    const entry: ConditionEvaluation = {
      conditionName: 'excludedTags',
      conditionValue: conditions.excludedTags,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.isPublicHoliday !== undefined) {
    const met = context.isPublicHoliday === conditions.isPublicHoliday
    const explanation = getConditionExplanation('isPublicHoliday', conditions.isPublicHoliday, context.isPublicHoliday, met)
    const entry: ConditionEvaluation = {
      conditionName: 'isPublicHoliday',
      conditionValue: conditions.isPublicHoliday,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.isFirstShift !== undefined) {
    // In simulator context, we treat as first shift (true) by default
    const isFirst = true
    const met = isFirst === conditions.isFirstShift
    const explanation = getConditionExplanation('isFirstShift', conditions.isFirstShift, isFirst, met)
    const entry: ConditionEvaluation = {
      conditionName: 'isFirstShift',
      conditionValue: conditions.isFirstShift,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  if (conditions.isConsecutiveShift !== undefined) {
    // In simulator context, we treat as not consecutive (false) by default
    const isConsecutive = false
    const met = isConsecutive === conditions.isConsecutiveShift
    const explanation = getConditionExplanation('isConsecutiveShift', conditions.isConsecutiveShift, isConsecutive, met)
    const entry: ConditionEvaluation = {
      conditionName: 'isConsecutiveShift',
      conditionValue: conditions.isConsecutiveShift,
      met,
      reason: explanation.short,
    }
    ;(met ? matched : unmatched).push(entry)
  }

  return { matched, unmatched }
}

export async function evaluateAwardRules(context: EvaluateContext): Promise<EvaluationResult> {
  try {
    await connectDB()

    const award = await AwardModel.findById(context.awardId).lean()
    if (!award) {
      return {
        allRulesEvaluation: [],
        selectedRule: null,
        selectedOutcome: null,
        explanation: '',
        error: `Award not found (ID: ${context.awardId})`,
      }
    }

    const rules = (award.rules || []) as AwardRule[]

    if (rules.length === 0) {
      return {
        allRulesEvaluation: [],
        selectedRule: null,
        selectedOutcome: null,
        explanation: `Award "${award.name}" has no rules configured.`,
        error: 'No rules found in award',
      }
    }

    const activeRules = rules.filter(r => r.isActive !== false)

    const allRulesEvaluation: RuleEvaluation[] = activeRules.map(rule => {
      const { matched, unmatched } = evaluateConditionsForRule(rule, context)
      const allConditionsMet = unmatched.length === 0
      const specificity = matched.length
      const priority = rule.priority || 0
      const totalScore = (specificity * 100) + priority

      return {
        rule,
        matched: allConditionsMet,
        matchedConditions: matched,
        unmatchedConditions: unmatched.map(u => ({
          conditionName: u.conditionName,
          conditionValue: u.conditionValue,
          reason: u.reason,
        })),
        specificity,
        priority,
        totalScore,
      }
    })

    allRulesEvaluation.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1
      return b.totalScore - a.totalScore
    })

    const matchedRules = allRulesEvaluation.filter(r => r.matched)
    const selectedEval = matchedRules.length > 0 ? matchedRules[0] : null
    const selectedRule = selectedEval?.rule ?? null
    const selectedOutcome = selectedRule?.outcome ?? null

    const explanationParts: string[] = []
    for (const evaluation of allRulesEvaluation) {
      const status = evaluation.matched ? '✓' : '✗'
      const conditionSummary = evaluation.matchedConditions.length > 0
        ? evaluation.matchedConditions.map(c => `${c.conditionName} ✓`).join(', ')
        : 'always applies (0 conditions)'
      explanationParts.push(`${status} ${evaluation.rule.name}: ${conditionSummary}`)
    }

    if (selectedRule) {
      const sel = selectedEval!
      explanationParts.push('')
      explanationParts.push(
        `Selected: ${selectedRule.name} (specificity: ${sel.specificity}, priority: ${sel.priority}, score: ${sel.totalScore})`
      )
    } else {
      explanationParts.push('')
      explanationParts.push('No rule matched all conditions.')
    }

    return {
      allRulesEvaluation,
      selectedRule,
      selectedOutcome,
      explanation: explanationParts.join('\n'),
    }
  } catch (error) {
    return {
      allRulesEvaluation: [],
      selectedRule: null,
      selectedOutcome: null,
      explanation: '',
      error: error instanceof Error ? error.message : 'Unknown error during evaluation',
    }
  }
}
