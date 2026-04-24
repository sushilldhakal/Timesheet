import { connectDB } from "@/lib/db"
import AwardModel from "@/lib/db/schemas/award"
import { AwardEngine } from "@/lib/engines/award-engine"
import type { AwardRule } from "@/lib/validations/awards"

interface EvaluateContext {
  awardId: string
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
  locationId?: string
}

interface EvaluationResult {
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
  error?: string
}

/**
 * Evaluate award rules for a single shift context.
 *
 * Delegates entirely to AwardEngine.evaluateRulesForContext so the simulator,
 * the Test Award dialog, and the costing engine all use the same rule-selection
 * logic and will always agree on the winning rule for the same input.
 */
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

    if (!award.rules || award.rules.length === 0) {
      return {
        allRulesEvaluation: [],
        selectedRule: null,
        selectedOutcome: null,
        explanation: `Award "${award.name}" has no rules configured.`,
        error: 'No rules found in award',
      }
    }

    const engine = new AwardEngine(award as any)
    const result = engine.evaluateRulesForContext({
      shiftDate: context.shiftDate,
      startTime: context.startTime,
      endTime: context.endTime,
      startWallClock: context.startWallClock,
      endWallClock: context.endWallClock,
      employmentType: context.employmentType,
      awardTags: context.awardTags,
      isPublicHoliday: context.isPublicHoliday,
      dailyHoursWorked: context.dailyHoursWorked,
      weeklyHoursWorked: context.weeklyHoursWorked,
    })

    return result

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
