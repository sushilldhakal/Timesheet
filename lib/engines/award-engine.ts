import { Award, AwardRule, ShiftContext, PayLineItem, AwardEngineResult, RuleConditions, TimeSegment } from "@/lib/validations/awards"

/**
 * Core Award Engine - Implements Tanda-style rule evaluation
 * 
 * Key Features:
 * 1. Rule Specificity - Most specific rule wins
 * 2. Time Segment Processing - Calculate pay per minute
 * 3. Award Tag Overrides - Manual rule modifications
 * 4. Rule Competition - Rules compete against each other
 * 5. Cost Calculation - Produces dollar amounts using baseRate
 * 6. Line Item Output - Tanda-style pay lines for export
 */
export class AwardEngine {
  private award: Award
  
  constructor(award: Award) {
    this.award = award
  }

  /**
   * Main entry point - Process a shift and return pay breakdown as line items
   */
  processShift(context: ShiftContext): AwardEngineResult {
    // Step 1: Split shift into time segments (e.g., 15-minute intervals)
    const timeSegments = this.createTimeSegments(context.startTime, context.endTime)
    
    // Step 2: For each segment, find the most specific applicable rule
    const payLines: PayLineItem[] = []
    const breakEntitlements: any[] = []
    const leaveAccruals: any[] = []
    
    for (const segment of timeSegments) {
      const applicableRules = this.findApplicableRules(segment, context)
      const winningRule = this.selectMostSpecificRule(applicableRules)
      
      if (winningRule) {
        const segmentHours = this.getSegmentDurationMinutes(segment.start, segment.end) / 60
        
        // Create pay line item based on rule outcome
        const payLine = this.createPayLineItem(
          winningRule,
          segment.start,
          segment.end,
          segmentHours,
          context.baseRate
        )
        
        if (payLine) {
          payLines.push(payLine)
        }
        
        // Handle breaks and leave accruals
        if (winningRule.outcome.type === 'break') {
          breakEntitlements.push({
            startTime: segment.start,
            durationMinutes: winningRule.outcome.durationMinutes || 0,
            isPaid: winningRule.outcome.isPaid || false,
            name: winningRule.name,
            exportName: winningRule.outcome.exportName,
          })
        }
        
        if (winningRule.outcome.type === 'leave') {
          leaveAccruals.push({
            type: winningRule.outcome.leaveType || 'annual',
            hoursAccrued: segmentHours * (winningRule.outcome.accrualRate || 0),
            exportName: winningRule.outcome.exportName,
          })
        }
      }
    }
    
    // Step 3: Consolidate adjacent identical pay lines
    const consolidatedPayLines = this.consolidatePayLines(payLines)
    
    // Step 4: Calculate totals
    const totalCost = consolidatedPayLines.reduce((sum, line) => sum + line.cost, 0)
    const totalHours = consolidatedPayLines.reduce((sum, line) => sum + line.units, 0)
    
    return {
      payLines: consolidatedPayLines,
      totalCost,
      totalHours,
      breakEntitlements,
      leaveAccruals,
    }
  }

  /**
   * Create a pay line item from a rule outcome
   */
  private createPayLineItem(
    rule: AwardRule,
    startTime: Date,
    endTime: Date,
    hours: number,
    baseRate: number
  ): PayLineItem | null {
    const outcome = rule.outcome
    
    switch (outcome.type) {
      case 'ordinary':
      case 'overtime': {
        const multiplier = outcome.multiplier || 1.0
        const cost = hours * baseRate * multiplier
        const ordinaryHours = outcome.type === 'ordinary' ? hours : 0
        
        return {
          units: hours,
          from: startTime,
          to: endTime,
          name: rule.name,
          exportName: outcome.exportName,
          ordinaryHours,
          cost,
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
        // TOIL doesn't generate immediate cost, but tracks accrual
        return {
          units: hours * (outcome.accrualMultiplier || 1.0),
          from: startTime,
          to: endTime,
          name: rule.name,
          exportName: outcome.exportName,
          ordinaryHours: 0,
          cost: 0, // No immediate cost for TOIL
          baseRate,
          ruleId: rule.id,
        }
      }
      
      default:
        return null
    }
  }

  /**
   * Consolidate adjacent pay lines with same rule/rate
   */
  private consolidatePayLines(payLines: PayLineItem[]): PayLineItem[] {
    if (payLines.length === 0) return []
    
    const consolidated: PayLineItem[] = []
    let current = { ...payLines[0] }
    
    for (let i = 1; i < payLines.length; i++) {
      const next = payLines[i]
      
      // Can consolidate if same rule and rates
      if (
        current.exportName === next.exportName &&
        current.baseRate === next.baseRate &&
        current.multiplier === next.multiplier &&
        current.to.getTime() === next.from.getTime()
      ) {
        // Merge the segments
        current.units += next.units
        current.ordinaryHours += next.ordinaryHours
        current.cost += next.cost
        current.to = next.to
      } else {
        // Different rule/rate, start new segment
        consolidated.push(current)
        current = { ...next }
      }
    }
    
    consolidated.push(current)
    return consolidated
  }

  /**
   * Create time segments for processing (15-minute intervals)
   */
  private createTimeSegments(startTime: Date, endTime: Date): Array<{ start: Date; end: Date }> {
    const segments: Array<{ start: Date; end: Date }> = []
    const segmentMinutes = 15 // 15-minute segments
    
    let currentTime = new Date(startTime)
    
    while (currentTime < endTime) {
      const segmentEnd = new Date(currentTime.getTime() + (segmentMinutes * 60 * 1000))
      const actualEnd = segmentEnd > endTime ? endTime : segmentEnd
      
      segments.push({
        start: new Date(currentTime),
        end: actualEnd
      })
      
      currentTime = segmentEnd
    }
    
    return segments
  }

  /**
   * Find all rules that could apply to this time segment
   */
  private findApplicableRules(
    segment: { start: Date; end: Date }, 
    context: ShiftContext
  ): AwardRule[] {
    return this.award.rules.filter(rule => {
      if (!rule.isActive) return false
      
      // Check award tag conditions first (these can override everything)
      if (!this.checkTagConditions(rule, context.awardTags)) return false
      
      // Check all other conditions
      return this.evaluateConditions(rule.conditions, segment, context)
    })
  }

  /**
   * CRITICAL: Rule Specificity Algorithm
   * The rule with the most specific conditions wins
   */
  private selectMostSpecificRule(rules: AwardRule[]): AwardRule | null {
    if (rules.length === 0) return null
    if (rules.length === 1) return rules[0]
    
    // Calculate specificity score for each rule
    const rulesWithScores = rules.map(rule => ({
      rule,
      specificity: this.calculateSpecificity(rule.conditions),
      priority: rule.priority
    }))
    
    // Sort by specificity first, then priority
    rulesWithScores.sort((a, b) => {
      if (a.specificity !== b.specificity) {
        return b.specificity - a.specificity // Higher specificity wins
      }
      return b.priority - a.priority // Higher priority wins if same specificity
    })
    
    return rulesWithScores[0].rule
  }

  /**
   * Calculate rule specificity score
   * More conditions = more specific = higher score
   */
  private calculateSpecificity(conditions: RuleConditions): number {
    let score = 0
    
    // Day conditions (more specific days = higher score)
    if (conditions.daysOfWeek) {
      score += 10 - conditions.daysOfWeek.length // Fewer days = more specific
    }
    
    // Time conditions
    if (conditions.timeRange) {
      const duration = conditions.timeRange.end - conditions.timeRange.start
      score += 20 - duration // Shorter time range = more specific
    }
    
    // Hours conditions
    if (conditions.afterHoursWorked !== undefined) score += 15
    if (conditions.afterOvertimeHours !== undefined) score += 20 // More specific than daily hours
    if (conditions.weeklyHoursThreshold !== undefined) score += 10
    
    // Employment type conditions
    if (conditions.employmentTypes) {
      score += 15 - conditions.employmentTypes.length // Fewer types = more specific
    }
    
    // Special conditions (very specific)
    if (conditions.outsideRoster) score += 25
    if (conditions.isPublicHoliday) score += 30
    if (conditions.requiredTags && conditions.requiredTags.length > 0) score += 35
    
    return score
  }

  /**
   * Check if award tags allow this rule to apply
   */
  private checkTagConditions(rule: AwardRule, awardTags: string[]): boolean {
    // If rule requires specific tags, check they're present
    if (rule.conditions.requiredTags) {
      const hasAllRequired = rule.conditions.requiredTags.every(tag => 
        awardTags.includes(tag)
      )
      if (!hasAllRequired) return false
    }
    
    // If rule is excluded by tags, don't apply
    if (rule.conditions.excludedTags) {
      const hasExcluded = rule.conditions.excludedTags.some(tag => 
        awardTags.includes(tag)
      )
      if (hasExcluded) return false
    }
    
    return true
  }

  /**
   * Evaluate all rule conditions for a time segment
   */
  private evaluateConditions(
    conditions: RuleConditions,
    segment: { start: Date; end: Date },
    context: ShiftContext
  ): boolean {
    // Day of week check
    if (conditions.daysOfWeek) {
      const dayName = this.getDayName(segment.start)
      if (!conditions.daysOfWeek.includes(dayName)) return false
    }
    
    // Time range check
    if (conditions.timeRange) {
      const segmentHour = segment.start.getHours()
      const { start, end } = conditions.timeRange
      
      if (end > start) {
        // Normal range (e.g., 9-17)
        if (segmentHour < start || segmentHour >= end) return false
      } else {
        // Overnight range (e.g., 22-6)
        if (segmentHour < start && segmentHour >= end) return false
      }
    }
    
    // Hours worked checks
    const shiftDuration = (context.endTime.getTime() - context.startTime.getTime()) / (1000 * 60 * 60)
    
    if (conditions.minHoursWorked !== undefined && shiftDuration < conditions.minHoursWorked) {
      return false
    }
    
    if (conditions.afterHoursWorked !== undefined && context.dailyHoursWorked <= conditions.afterHoursWorked) {
      return false
    }
    
    if (conditions.afterOvertimeHours !== undefined) {
      const overtimeHours = Math.max(0, context.dailyHoursWorked - 8) // Assuming 8 hour standard day
      if (overtimeHours <= conditions.afterOvertimeHours) return false
    }
    
    if (conditions.weeklyHoursThreshold !== undefined && context.weeklyHoursWorked <= conditions.weeklyHoursThreshold) {
      return false
    }
    
    // Employment type check
    if (conditions.employmentTypes && !conditions.employmentTypes.includes(context.employmentType)) {
      return false
    }
    
    // Roster variance check
    if (conditions.outsideRoster && context.rosteredStart && context.rosteredEnd) {
      const isOutsideRoster = 
        context.startTime < context.rosteredStart || 
        context.endTime > context.rosteredEnd
      if (!isOutsideRoster) return false
    }
    
    // Public holiday check
    if (conditions.isPublicHoliday !== undefined && conditions.isPublicHoliday !== context.isPublicHoliday) {
      return false
    }
    
    return true
  }

  /**
   * Aggregate processed segments into final result
   */
  private aggregateResults(segments: TimeSegment[]): AwardEngineResult {
    // This method is now replaced by the line-item approach above
    // Keeping for backward compatibility but should not be used
    throw new Error("aggregateResults is deprecated - use processShift with line items")
  }

  /**
   * Helper methods
   */
  private getDayName(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    return days[date.getDay()]
  }

  private getSegmentDurationMinutes(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60)
  }
}

/**
 * Factory function to create and use the award engine
 */
export function processShiftWithAward(award: Award, context: ShiftContext): AwardEngineResult {
  const engine = new AwardEngine(award)
  return engine.processShift(context)
}

/**
 * Utility function to create award tags for common scenarios
 */
export const COMMON_AWARD_TAGS = {
  TOIL: 'TOIL',
  BROKEN_SHIFT: 'BrokenShift', 
  PUBLIC_HOLIDAY_OVERRIDE: 'PublicHolidayOverride',
  RETURN_TO_DUTY: 'ReturnToDuty',
  SICK_LEAVE: 'SickLeave',
  ANNUAL_LEAVE: 'AnnualLeave'
} as const