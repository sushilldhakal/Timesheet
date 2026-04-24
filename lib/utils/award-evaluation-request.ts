/**
 * Shared helper for building timezone-safe award evaluation request payloads.
 * 
 * This ensures all UI testing surfaces (TestScenariosTab, TestAwardDialog, RuleSimulator)
 * construct payloads the same way, preventing timezone-related bugs.
 * 
 * Key principles:
 * 1. shiftDate uses noon anchor (YYYY-MM-DDT12:00:00) to preserve calendar date
 * 2. startTime/endTime carry real timestamps for duration calculation
 * 3. startWallClock/endWallClock carry literal time strings for time-range evaluation
 * 4. Overnight shifts are handled correctly (endTime next day if needed)
 */

export interface BuildEvaluationRequestParams {
  awardId: string
  dateString: string // YYYY-MM-DD format
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  employmentType: string
  awardTags?: string[]
  isPublicHoliday?: boolean
  weeklyHoursWorked?: number
}

export interface EvaluationRequestPayload {
  awardId: string
  shiftDate: string // ISO string with noon anchor
  startTime: string // ISO string
  endTime: string // ISO string
  startWallClock: string // HH:MM
  endWallClock: string // HH:MM
  employmentType: string
  awardTags: string[]
  isPublicHoliday: boolean
  dailyHoursWorked: number
  weeklyHoursWorked: number
}

/**
 * Calculate shift duration in hours from HH:MM time strings.
 * Handles overnight shifts correctly.
 */
function calculateShiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let hours = (eh + em / 60) - (sh + sm / 60)
  if (hours <= 0) hours += 24 // overnight shift
  return Math.round(hours * 100) / 100
}

/**
 * Build a timezone-safe award evaluation request payload.
 * 
 * This is the SINGLE SOURCE OF TRUTH for constructing evaluation requests
 * from all UI testing surfaces.
 * 
 * @param params - Input parameters from the UI
 * @returns Payload ready to send to the evaluate-rules API
 */
export function buildEvaluationRequest(params: BuildEvaluationRequestParams): EvaluationRequestPayload {
  const {
    awardId,
    dateString,
    startTime,
    endTime,
    employmentType,
    awardTags = [],
    isPublicHoliday = false,
    weeklyHoursWorked = 0,
  } = params

  // 1. shiftDate: noon-anchored to preserve calendar date regardless of timezone
  const shiftDateLocal = new Date(`${dateString}T12:00:00`)
  const shiftDate = shiftDateLocal.toISOString()

  // 2. startTime: real timestamp for the shift start
  const startLocal = new Date(`${dateString}T${startTime}:00`)
  const startTimeISO = startLocal.toISOString()

  // 3. endTime: real timestamp for the shift end, handle overnight
  const endLocal = new Date(`${dateString}T${endTime}:00`)
  if (endLocal <= startLocal) {
    endLocal.setDate(endLocal.getDate() + 1) // overnight shift
  }
  const endTimeISO = endLocal.toISOString()

  // 4. Wall-clock times: literal strings for time-range evaluation
  const startWallClock = startTime
  const endWallClock = endTime

  // 5. Calculate shift duration
  const dailyHoursWorked = calculateShiftHours(startTime, endTime)

  return {
    awardId,
    shiftDate,
    startTime: startTimeISO,
    endTime: endTimeISO,
    startWallClock,
    endWallClock,
    employmentType,
    awardTags,
    isPublicHoliday,
    dailyHoursWorked,
    weeklyHoursWorked,
  }
}

/**
 * Get the next occurrence of a specific day of week from today.
 * Used by TestAwardDialog to convert day-of-week selection to a concrete date.
 * 
 * IMPORTANT: Uses local date parts (getFullYear, getMonth, getDate) instead of
 * toISOString() to avoid UTC timezone shift bugs.
 * 
 * @param dayOfWeek - Day name (lowercase)
 * @returns YYYY-MM-DD string for the next occurrence of that day
 */
export function getNextDayOfWeek(dayOfWeek: string): string {
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayOfWeek)
  if (dayIndex === -1) throw new Error(`Invalid day of week: ${dayOfWeek}`)
  
  const today = new Date()
  const diff = (dayIndex - today.getDay() + 7) % 7
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + diff)
  
  // Build YYYY-MM-DD from local date parts to avoid UTC shift
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}
