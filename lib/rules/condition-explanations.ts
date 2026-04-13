export type ConditionType =
  | 'daysOfWeek'
  | 'timeRange'
  | 'minHoursWorked'
  | 'afterHoursWorked'
  | 'afterOvertimeHours'
  | 'weeklyHoursThreshold'
  | 'employmentTypes'
  | 'requiredTags'
  | 'excludedTags'
  | 'isPublicHoliday'
  | 'isFirstShift'
  | 'isConsecutiveShift'

export function getConditionExplanation(
  type: ConditionType,
  conditionValue: unknown,
  contextValue: unknown,
  met: boolean
): { short: string; long: string } {
  switch (type) {
    case 'daysOfWeek': {
      const days = conditionValue as string[]
      const currentDay = contextValue as string
      const dayList = days.join(', ')
      return met
        ? {
            short: `Day is ${currentDay}, in [${dayList}]`,
            long: `This rule applies on ${formatDayList(days)}. Today is ${currentDay}, so this condition is met.`,
          }
        : {
            short: `Day is ${currentDay}, not in [${dayList}]`,
            long: `This rule applies on ${formatDayList(days)}. Today is ${currentDay}, so this condition is NOT met.`,
          }
    }

    case 'timeRange': {
      const range = conditionValue as { start: number; end: number }
      const hour = contextValue as number
      const rangeStr = `${formatHour(range.start)}-${formatHour(range.end)}`
      return met
        ? {
            short: `Shift starts at ${formatHour(hour)}, within ${rangeStr}`,
            long: `This rule applies during ${rangeStr}. The shift starts at ${formatHour(hour)}, so this condition is met.`,
          }
        : {
            short: `Shift starts at ${formatHour(hour)}, outside ${rangeStr}`,
            long: `This rule applies during ${rangeStr}. The shift starts at ${formatHour(hour)}, so this condition is NOT met.`,
          }
    }

    case 'minHoursWorked': {
      const minHours = conditionValue as number
      const worked = contextValue as number
      return met
        ? {
            short: `Worked ${worked}h, meets ${minHours}h minimum`,
            long: `This rule requires at least ${minHours} hours of work. The shift is ${worked} hours, so this condition is met.`,
          }
        : {
            short: `Worked ${worked}h, need ${minHours}h minimum`,
            long: `This rule requires at least ${minHours} hours of work. The shift is ${worked} hours, so this condition is NOT met.`,
          }
    }

    case 'afterHoursWorked': {
      const threshold = conditionValue as number
      const worked = contextValue as number
      return met
        ? {
            short: `Worked ${worked}h, exceeds ${threshold}h threshold`,
            long: `This rule applies after ${threshold} hours of daily work. You've worked ${worked} hours, so this condition is met.`,
          }
        : {
            short: `Worked ${worked}h, need ${threshold}+ hours`,
            long: `This rule applies after ${threshold} hours of daily work. You've worked ${worked} hours, so this condition is NOT met yet.`,
          }
    }

    case 'afterOvertimeHours': {
      const threshold = conditionValue as number
      const otHours = contextValue as number
      return met
        ? {
            short: `${otHours}h overtime, exceeds ${threshold}h OT threshold`,
            long: `This rule applies after ${threshold} overtime hours. Current overtime is ${otHours} hours, so this condition is met.`,
          }
        : {
            short: `${otHours}h overtime, need ${threshold}+ OT hours`,
            long: `This rule applies after ${threshold} overtime hours. Current overtime is ${otHours} hours, so this condition is NOT met.`,
          }
    }

    case 'weeklyHoursThreshold': {
      const threshold = conditionValue as number
      const weeklyHours = contextValue as number
      return met
        ? {
            short: `${weeklyHours}h weekly, exceeds ${threshold}h weekly threshold`,
            long: `This rule applies after ${threshold} weekly hours. You've worked ${weeklyHours} hours this week, so this condition is met.`,
          }
        : {
            short: `${weeklyHours}h weekly, need ${threshold}+ weekly hours`,
            long: `This rule applies after ${threshold} weekly hours. You've worked ${weeklyHours} hours this week, so this condition is NOT met.`,
          }
    }

    case 'employmentTypes': {
      const types = conditionValue as string[]
      const current = contextValue as string
      const typeList = types.map(formatEmploymentType).join(', ')
      return met
        ? {
            short: `${formatEmploymentType(current)} is in [${typeList}]`,
            long: `This rule applies to ${typeList} employees. Current type is ${formatEmploymentType(current)}, so this condition is met.`,
          }
        : {
            short: `${formatEmploymentType(current)} not in [${typeList}]`,
            long: `This rule applies to ${typeList} employees. Current type is ${formatEmploymentType(current)}, so this condition is NOT met.`,
          }
    }

    case 'requiredTags': {
      const required = conditionValue as string[]
      const applied = contextValue as string[]
      const reqList = required.join(', ')
      const appList = applied.length > 0 ? applied.join(', ') : 'none'
      return met
        ? {
            short: `Required tags [${reqList}] present`,
            long: `This rule requires the [${reqList}] tag(s). Applied tags are [${appList}], so this condition is met.`,
          }
        : {
            short: `Requires [${reqList}] tag, applied tags are [${appList}]`,
            long: `This rule requires the [${reqList}] tag(s) to be applied. Only [${appList}] is applied, so this condition is NOT met.`,
          }
    }

    case 'excludedTags': {
      const excluded = conditionValue as string[]
      const applied = contextValue as string[]
      const exList = excluded.join(', ')
      const appList = applied.length > 0 ? applied.join(', ') : 'none'
      const hasExcluded = excluded.some(t => (applied as string[]).includes(t))
      return met
        ? {
            short: `No excluded tags [${exList}] present`,
            long: `This rule is excluded when [${exList}] tag(s) are applied. Applied tags are [${appList}], so this condition is met (no conflict).`,
          }
        : {
            short: `Excluded tag [${excluded.find(t => applied.includes(t))}] is present`,
            long: `This rule is excluded when [${exList}] tag(s) are applied. Applied tags include [${appList}], which conflicts, so this condition is NOT met.`,
          }
    }

    case 'isPublicHoliday': {
      const required = conditionValue as boolean
      const actual = contextValue as boolean
      return met
        ? {
            short: required ? 'Is a public holiday' : 'Not a public holiday',
            long: required
              ? 'This rule applies on public holidays. Today is a public holiday, so this condition is met.'
              : 'This rule applies on non-holiday days. Today is not a public holiday, so this condition is met.',
          }
        : {
            short: required ? 'Not a public holiday (requires holiday)' : 'Is a public holiday (requires non-holiday)',
            long: required
              ? 'This rule applies on public holidays. Today is NOT a public holiday, so this condition is NOT met.'
              : 'This rule applies on non-holiday days. Today IS a public holiday, so this condition is NOT met.',
          }
    }

    case 'isFirstShift': {
      const required = conditionValue as boolean
      const actual = contextValue as boolean
      return met
        ? {
            short: 'This is the first shift',
            long: 'This rule applies to the first shift of the day. This is the first shift, so this condition is met.',
          }
        : {
            short: 'Not the first shift',
            long: 'This rule applies to the first shift of the day. This is NOT the first shift, so this condition is NOT met.',
          }
    }

    case 'isConsecutiveShift': {
      const required = conditionValue as boolean
      const actual = contextValue as boolean
      return met
        ? {
            short: 'Is a consecutive shift',
            long: 'This rule applies to consecutive (back-to-back) shifts. This is a consecutive shift, so this condition is met.',
          }
        : {
            short: 'Not a consecutive shift',
            long: 'This rule applies to consecutive (back-to-back) shifts. This is NOT a consecutive shift, so this condition is NOT met.',
          }
    }

    default:
      return {
        short: `Unknown condition: ${type}`,
        long: `Unknown condition type "${type}" cannot be evaluated.`,
      }
  }
}

function formatDayList(days: string[]): string {
  if (days.length === 1) return days[0] + 's'
  if (days.length === 2) return `${days[0]}s and ${days[1]}s`
  return days.slice(0, -1).map(d => d + 's').join(', ') + ', and ' + days[days.length - 1] + 's'
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:00 ${ampm}`
}

function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
