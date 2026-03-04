import { parseISO, differenceInMinutes, isSameDay } from "date-fns"
import type { IEvent } from "@/components/calendar/interfaces"

export type ConflictType = "overlap" | "exceeds_hours" | "exceeds_location_hours" | "exceeds_role_hours" | "none"
export type ConflictSeverity = "error" | "warning" | "none"

export interface ConflictInfo {
  type: ConflictType
  severity: ConflictSeverity
  message: string
}

/**
 * Check if two events overlap
 */
export function hasOverlap(event1: IEvent, event2: IEvent): boolean {
  if (event1._id === event2._id) return false
  if (event1.user?._id !== event2.user?._id) return false

  const start1 = parseISO(event1.startDate)
  const end1 = parseISO(event1.endDate)
  const start2 = parseISO(event2.startDate)
  const end2 = parseISO(event2.endDate)

  return start1 < end2 && start2 < end1
}

/**
 * Get all overlapping events for a given event
 */
export function getOverlappingEvents(
  event: IEvent,
  allEvents: IEvent[]
): IEvent[] {
  return allEvents.filter(
    (e) => e.user?._id === event.user?._id && hasOverlap(event, e) && e._id !== event._id
  )
}

/**
 * Calculate total hours for an employee on a specific date
 */
export function calculateDailyHours(
  userId: string,
  date: Date,
  allEvents: IEvent[]
): number {
  return allEvents
    .filter((event) => {
      if (event.user?._id !== userId) return false
      const eventDate = parseISO(event.startDate)
      return isSameDay(eventDate, date)
    })
    .reduce((total, event) => {
      const start = parseISO(event.startDate)
      const end = parseISO(event.endDate)
      const minutes = differenceInMinutes(end, start)
      return total + minutes / 60
    }, 0)
}

/**
 * Calculate total hours for an employee for a week
 */
export function calculateWeeklyHours(
  userId: string,
  weekStart: Date,
  allEvents: IEvent[]
): number {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return allEvents
    .filter((event) => {
      if (event.user?._id !== userId) return false
      const eventDate = parseISO(event.startDate)
      return eventDate >= weekStart && eventDate < weekEnd
    })
    .reduce((total, event) => {
      const start = parseISO(event.startDate)
      const end = parseISO(event.endDate)
      const minutes = differenceInMinutes(end, start)
      return total + minutes / 60
    }, 0)
}

/**
 * Detect conflicts for an event
 */
export function detectConflicts(
  event: IEvent,
  allEvents: IEvent[],
  constraints?: {
    maxWeeklyHours?: number
    maxDailyHours?: number
    locationHours?: { open: number; close: number }
    roleHours?: { start: number; end: number }
  }
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []

  // Check for overlaps
  const overlapping = getOverlappingEvents(event, allEvents)
  if (overlapping.length > 0) {
    conflicts.push({
      type: "overlap",
      severity: "error",
      message: `Conflicts with ${overlapping.length} other shift(s)`,
    })
  }

  // Check daily hours
  if (constraints?.maxDailyHours) {
    const dailyHours = calculateDailyHours(event.user?._id || "", parseISO(event.startDate), allEvents)
    const eventDuration = differenceInMinutes(
      parseISO(event.endDate),
      parseISO(event.startDate)
    ) / 60
    if (dailyHours + eventDuration > constraints.maxDailyHours) {
      conflicts.push({
        type: "exceeds_hours",
        severity: "warning",
        message: `Would exceed ${constraints.maxDailyHours}h daily limit`,
      })
    }
  }

  // Check weekly hours
  if (constraints?.maxWeeklyHours) {
    const weekStart = new Date(parseISO(event.startDate))
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    
    const weeklyHours = calculateWeeklyHours(event.user?._id || "", weekStart, allEvents)
    const eventDuration = differenceInMinutes(
      parseISO(event.endDate),
      parseISO(event.startDate)
    ) / 60
    
    if (weeklyHours + eventDuration > constraints.maxWeeklyHours * 1.1) {
      // 10% buffer
      conflicts.push({
        type: "exceeds_hours",
        severity: "error",
        message: `Would exceed ${constraints.maxWeeklyHours}h weekly limit`,
      })
    } else if (weeklyHours + eventDuration > constraints.maxWeeklyHours) {
      conflicts.push({
        type: "exceeds_hours",
        severity: "warning",
        message: `Approaching ${constraints.maxWeeklyHours}h weekly target`,
      })
    }
  }

  // Check location hours
  if (constraints?.locationHours) {
    const start = parseISO(event.startDate)
    const end = parseISO(event.endDate)
    const startHour = start.getHours()
    const endHour = end.getHours()

    if (
      startHour < constraints.locationHours.open ||
      endHour > constraints.locationHours.close
    ) {
      conflicts.push({
        type: "exceeds_location_hours",
        severity: "error",
        message: `Outside location hours (${constraints.locationHours.open}:00 - ${constraints.locationHours.close}:00)`,
      })
    }
  }

  // Check role hours
  if (constraints?.roleHours) {
    const start = parseISO(event.startDate)
    const end = parseISO(event.endDate)
    const startHour = start.getHours()
    const endHour = end.getHours()

    if (
      startHour < constraints.roleHours.start ||
      endHour > constraints.roleHours.end
    ) {
      conflicts.push({
        type: "exceeds_role_hours",
        severity: "warning",
        message: `Outside typical role hours (${constraints.roleHours.start}:00 - ${constraints.roleHours.end}:00)`,
      })
    }
  }

  return conflicts
}

/**
 * Get highest severity level from conflicts
 */
export function getConflictSeverity(conflicts: ConflictInfo[]): ConflictSeverity {
  if (conflicts.some((c) => c.severity === "error")) return "error"
  if (conflicts.some((c) => c.severity === "warning")) return "warning"
  return "none"
}
