import { ISchedule } from "../db/schemas/schedule"

export interface DailyPattern {
  dayOfWeek: number
  startTime: Date
  endTime: Date
  rotationWeek?: number
}

/**
 * Rotation Calculator
 * Calculates current rotation week and selects appropriate pattern
 */
export class RotationCalculator {
  /**
   * Calculate the current week in a rotation cycle
   * @param anchorDate - The starting date of the rotation cycle
   * @param targetDate - The date to calculate rotation week for
   * @param cycleLength - Number of weeks in the rotation cycle
   * @returns The current rotation week (0-indexed)
   */
  getCurrentRotationWeek(
    anchorDate: Date,
    targetDate: Date,
    cycleLength: number
  ): number {
    // Calculate the number of days between anchor and target
    const daysDifference = Math.floor(
      (targetDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate the number of weeks
    const weeksDifference = Math.floor(daysDifference / 7)

    // Calculate the current week in the rotation cycle (0-indexed)
    const rotationWeek = weeksDifference % cycleLength

    return rotationWeek
  }

  /**
   * Get the pattern for a specific date
   * @param schedule - The schedule configuration
   * @param targetDate - The date to get pattern for
   * @returns The daily pattern or null if not found
   */
  getPatternForDate(
    schedule: ISchedule,
    targetDate: Date
  ): DailyPattern | null {
    const dayOfWeek = targetDate.getDay() // 0=Sunday, 6=Saturday

    // Check if this is a rotating schedule
    if (!schedule.isRotating) {
      // Non-rotating: check if this day is in the schedule
      if (schedule.dayOfWeek.includes(dayOfWeek)) {
        return {
          dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        }
      }
      return null
    }

    // Rotating schedule: calculate current rotation week
    if (!schedule.rotationStartDate || !schedule.rotationCycle) {
      console.error("Rotating schedule missing rotationStartDate or rotationCycle")
      return null
    }

    const rotationWeek = this.getCurrentRotationWeek(
      schedule.rotationStartDate,
      targetDate,
      schedule.rotationCycle
    )

    // For now, we'll use a simple approach where the schedule applies to all weeks
    // In a more complex implementation, you would store multiple patterns per rotation week
    // and select the appropriate one based on rotationWeek
    
    // Check if this day is in the schedule for the current rotation week
    if (schedule.dayOfWeek.includes(dayOfWeek)) {
      return {
        dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        rotationWeek,
      }
    }

    return null
  }

  /**
   * Calculate the next rotation start date
   * @param anchorDate - The starting date of the rotation cycle
   * @param cycleLength - Number of weeks in the rotation cycle
   * @returns The date when the next rotation cycle starts
   */
  calculateNextRotationStart(
    anchorDate: Date,
    cycleLength: number
  ): Date {
    const now = new Date()
    const currentRotationWeek = this.getCurrentRotationWeek(anchorDate, now, cycleLength)
    
    // Calculate weeks until next cycle
    const weeksUntilNextCycle = cycleLength - currentRotationWeek
    
    // Calculate the next rotation start date
    const nextRotationStart = new Date(now)
    nextRotationStart.setDate(nextRotationStart.getDate() + (weeksUntilNextCycle * 7))
    
    return nextRotationStart
  }

  /**
   * Check if a date falls within a specific rotation week
   * @param anchorDate - The starting date of the rotation cycle
   * @param targetDate - The date to check
   * @param cycleLength - Number of weeks in the rotation cycle
   * @param expectedWeek - The expected rotation week (0-indexed)
   * @returns True if the date falls in the expected rotation week
   */
  isInRotationWeek(
    anchorDate: Date,
    targetDate: Date,
    cycleLength: number,
    expectedWeek: number
  ): boolean {
    const currentWeek = this.getCurrentRotationWeek(anchorDate, targetDate, cycleLength)
    return currentWeek === expectedWeek
  }
}
