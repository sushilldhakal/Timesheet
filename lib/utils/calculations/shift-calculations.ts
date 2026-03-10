import { differenceInMinutes } from "date-fns"
import type { IClockEvent } from "@/lib/db/schemas/daily-shift"

/**
 * Calculate total break minutes from breakIn and breakOut
 * @param breakIn Break start event
 * @param breakOut Break end event
 * @returns Total break minutes
 */
export function calculateTotalBreakMinutes(
  breakIn: IClockEvent | undefined,
  breakOut: IClockEvent | undefined
): number {
  if (!breakIn?.time || !breakOut?.time) {
    return 0
  }

  try {
    const start = new Date(breakIn.time)
    const end = new Date(breakOut.time)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0
    }
    
    const minutes = differenceInMinutes(end, start)
    return minutes > 0 ? minutes : 0
  } catch (error) {
    return 0
  }
}

/**
 * Calculate total working hours (clock-in to clock-out minus breaks)
 * @param clockIn Clock-in event
 * @param clockOut Clock-out event
 * @param totalBreakMinutes Total break time in minutes
 * @returns Total working hours as decimal
 */
export function calculateTotalWorkingHours(
  clockIn: IClockEvent | undefined,
  clockOut: IClockEvent | undefined,
  totalBreakMinutes: number
): number | undefined {
  if (!clockIn?.time || !clockOut?.time) {
    return undefined
  }

  try {
    const start = new Date(clockIn.time)
    const end = new Date(clockOut.time)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return undefined
    }
    
    const totalMinutes = differenceInMinutes(end, start)
    if (totalMinutes < 0) {
      return undefined
    }
    
    const workingMinutes = totalMinutes - totalBreakMinutes
    return Number((workingMinutes / 60).toFixed(2))
  } catch (error) {
    return undefined
  }
}

/**
 * Update all computed fields for a shift
 * @param clockIn Clock-in event
 * @param clockOut Clock-out event
 * @param breakIn Break start event
 * @param breakOut Break end event
 * @returns Object with computed fields
 */
export function updateComputedFields(
  clockIn: IClockEvent | undefined,
  clockOut: IClockEvent | undefined,
  breakIn: IClockEvent | undefined,
  breakOut: IClockEvent | undefined
): {
  totalBreakMinutes: number
  totalWorkingHours?: number
} {
  const totalBreakMinutes = calculateTotalBreakMinutes(breakIn, breakOut)
  const totalWorkingHours = calculateTotalWorkingHours(clockIn, clockOut, totalBreakMinutes)

  return {
    totalBreakMinutes,
    totalWorkingHours,
  }
}
