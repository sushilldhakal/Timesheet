import { DailyTimesheetRow } from "@/lib/types/timesheet"
import { ShiftContext } from "@/lib/validations/awards"

/**
 * Employee context for shift processing
 */
export interface EmployeeContext {
  id: string
  employmentType: string // 'casual', 'full_time', 'part_time'
  baseRate: number // Hourly rate for cost calculation
  awardTags?: string[] // Award tags applied to this employee/shift
}

/**
 * Convert a DailyTimesheetRow to ShiftContext for AwardEngine processing
 * 
 * @param entry - The timesheet row from our system
 * @param employee - Employee context (id, employmentType, baseRate, awardTags)
 * @param weeklyHoursWorkedSoFar - Hours worked this week before this shift
 * @param isPublicHoliday - Whether this date is a public holiday
 * @param rosteredStart - Optional rostered start time for roster variance checks
 * @param rosteredEnd - Optional rostered end time for roster variance checks
 * @returns ShiftContext ready for AwardEngine.processShift()
 */
export function timesheetEntryToShiftContext(
  entry: DailyTimesheetRow,
  employee: EmployeeContext,
  weeklyHoursWorkedSoFar: number = 0,
  isPublicHoliday: boolean = false,
  rosteredStart?: Date,
  rosteredEnd?: Date
): ShiftContext {
  // Parse date and times into proper Date objects
  const shiftDate = new Date(entry.date)
  
  // Combine date with time strings to create full timestamps
  const startTime = parseTimeOnDate(entry.date, entry.clockIn)
  const endTime = parseTimeOnDate(entry.date, entry.clockOut)
  
  // Handle breaks - convert break times to break periods
  const breaks: Array<{ startTime: Date; endTime: Date; isPaid: boolean }> = []
  
  if (entry.breakIn && entry.breakOut) {
    const breakStart = parseTimeOnDate(entry.date, entry.breakIn)
    const breakEnd = parseTimeOnDate(entry.date, entry.breakOut)
    
    // Assume unpaid breaks by default (most common case)
    // This could be enhanced to check break rules or employee settings
    breaks.push({
      startTime: breakStart,
      endTime: breakEnd,
      isPaid: false
    })
  }

  const extraBreaks = (entry as any)?.breaks as undefined | Array<{ startTime: Date; endTime: Date; isPaid: boolean }>
  if (Array.isArray(extraBreaks)) {
    for (const b of extraBreaks) {
      if (!b?.startTime || !b?.endTime) continue
      const startTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime)
      const endTime = b.endTime instanceof Date ? b.endTime : new Date(b.endTime)
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) continue
      if (endTime <= startTime) continue
      breaks.push({
        startTime,
        endTime,
        isPaid: !!b.isPaid,
      })
    }
  }

  // Deduplicate breaks by (start,end,isPaid)
  const seen = new Set<string>()
  const dedupedBreaks = breaks.filter((b) => {
    const key = `${b.startTime.getTime()}-${b.endTime.getTime()}-${b.isPaid ? 1 : 0}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  
  // Calculate daily hours worked (including this shift)
  const shiftHours = entry.totalMinutes / 60
  const dailyHoursWorked = shiftHours // Assuming one shift per day
  
  // Calculate consecutive shifts (would need additional data from DB)
  // For now, default to 0 - this could be enhanced with shift history
  const consecutiveShifts = 0
  
  return {
    employeeId: employee.id,
    employmentType: employee.employmentType,
    baseRate: employee.baseRate,
    startTime,
    endTime,
    awardTags: employee.awardTags || [],
    rosteredStart,
    rosteredEnd,
    isPublicHoliday,
    weeklyHoursWorked: weeklyHoursWorkedSoFar,
    dailyHoursWorked,
    consecutiveShifts,
    breaks: dedupedBreaks
  }
}

/**
 * Parse a time string (HH:MM format) on a specific date
 * 
 * @param dateStr - Date string (YYYY-MM-DD format)
 * @param timeStr - Time string (HH:MM format)
 * @returns Date object with the combined date and time in local timezone
 */
function parseTimeOnDate(dateStr: string, timeStr: string): Date {
  if (!timeStr || timeStr.trim() === '') {
    throw new Error(`Invalid time string: "${timeStr}" for date: "${dateStr}"`)
  }
  
  // Parse the time (assuming HH:MM format)
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: "${timeStr}". Expected HH:MM format.`)
  }
  
  // Create date in local timezone to avoid UTC conversion issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const result = new Date(year, month - 1, day, hours, minutes, 0, 0)
  
  return result
}

/**
 * Convert AwardEngine payLines to Tanda-compatible format for comparison
 * 
 * @param payLines - PayLineItem[] from AwardEngine result
 * @returns Array in Tanda award_interpretation format
 */
export function payLinesToTandaFormat(payLines: Array<{
  units: number
  from: Date
  to: Date
  name: string
  exportName: string
  cost: number
  multiplier?: number
}>) {
  return payLines.map(line => ({
    units: line.units,
    from: line.from.toISOString(),
    to: line.to.toISOString(),
    name: line.name,
    exportName: line.exportName,
    cost: line.cost,
    multiplier: line.multiplier || 1.0
  }))
}

/**
 * Validate that a DailyTimesheetRow has the minimum required fields for processing
 * 
 * @param entry - The timesheet row to validate
 * @throws Error if required fields are missing
 */
export function validateTimesheetEntry(entry: DailyTimesheetRow): void {
  if (!entry.date) {
    throw new Error('Timesheet entry missing required field: date')
  }
  
  if (!entry.clockIn) {
    throw new Error('Timesheet entry missing required field: clockIn')
  }
  
  if (!entry.clockOut) {
    throw new Error('Timesheet entry missing required field: clockOut')
  }
  
  if (typeof entry.totalMinutes !== 'number' || entry.totalMinutes <= 0) {
    throw new Error('Timesheet entry has invalid totalMinutes')
  }
}