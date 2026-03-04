import { useMemo, useCallback } from "react"
import { parseISO, isSameDay, differenceInMinutes } from "date-fns"
import type { IEvent, IUser } from "@/components/calendar/interfaces"

export interface RosterGap {
  date: Date
  startHour: number
  endHour: number
  requiredStaff: number
  currentStaff: number
  availableEmployees: IUser[]
}

export interface EmployeeOverload {
  user: IUser
  weeklyHours: number
  targetHours: number
  percentageOfTarget: number
}

/**
 * Get smart suggestions for roster planning
 */
export function useRosterSuggestions(
  events: IEvent[],
  users: IUser[],
  constraints?: {
    defaultRequiredStaff?: number
    maxWeeklyHours?: number
    locationHours?: { open: number; close: number }
  }
) {
  const config = {
    defaultRequiredStaff: constraints?.defaultRequiredStaff || 2,
    maxWeeklyHours: constraints?.maxWeeklyHours || 40,
    locationHours: constraints?.locationHours || { open: 9, close: 17 },
  }

  /**
   * Find gaps in roster (times with insufficient staff)
   */
  const findRosterGaps = useCallback(
    (weekStart: Date, weekEnd: Date): RosterGap[] => {
      const gaps: RosterGap[] = []

      // Check each day of the week
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d)

        // Check each hour of the day
        for (let hour = config.locationHours.open; hour < config.locationHours.close; hour++) {
          const checkTime = new Date(currentDate)
          checkTime.setHours(hour, 0, 0, 0)
          const nextHour = new Date(checkTime)
          nextHour.setHours(hour + 1, 0, 0, 0)

          // Count staff working at this hour
          const staffAtThisHour = events.filter((event) => {
            const eventStart = parseISO(event.startDate)
            const eventEnd = parseISO(event.endDate)
            return isSameDay(eventStart, currentDate) && eventStart < nextHour && eventEnd > checkTime
          })

          // Find gap if under required staff
          if (staffAtThisHour.length < config.defaultRequiredStaff) {
            const gap: RosterGap = {
              date: currentDate,
              startHour: hour,
              endHour: hour + 1,
              requiredStaff: config.defaultRequiredStaff,
              currentStaff: staffAtThisHour.length,
              availableEmployees: users.filter((user) => {
                // Check if user is available at this time (no other shift)
                const hasConflict = events.some((event) => {
                  const eventStart = parseISO(event.startDate)
                  const eventEnd = parseISO(event.endDate)
                  return event.user?._id === user._id && isSameDay(eventStart, currentDate) && eventStart < nextHour && eventEnd > checkTime
                })
                return !hasConflict
              }),
            }

            gaps.push(gap)
          }
        }
      }

      return gaps
    },
    [config, events]
  )

  /**
   * Find overloaded employees
   */
  const findOverloadedEmployees = useCallback(
    (weekStart: Date, weekEnd: Date): EmployeeOverload[] => {
      const overloaded: EmployeeOverload[] = []

      users.forEach((user) => {
        const userEvents = events.filter(
          (e) => e.user?._id === user._id && parseISO(e.startDate) >= weekStart && parseISO(e.startDate) <= weekEnd
        )

        const weeklyHours = userEvents.reduce((total, event) => {
          const start = parseISO(event.startDate)
          const end = parseISO(event.endDate)
          const minutes = differenceInMinutes(end, start)
          return total + minutes / 60
        }, 0)

        const targetHours = config.maxWeeklyHours
        const percentage = (weeklyHours / targetHours) * 100

        if (weeklyHours > targetHours) {
          overloaded.push({
            user,
            weeklyHours,
            targetHours,
            percentageOfTarget: percentage,
          })
        }
      })

      return overloaded
    },
    [events, users, config.maxWeeklyHours]
  )

  /**
   * Suggest employees to fill a gap
   */
  const suggestForGap = useCallback(
    (gap: RosterGap): IUser[] => {
      const staffNeeded = gap.requiredStaff - gap.currentStaff
      const available = gap.availableEmployees

      // Sort by: least hours this week → longest availability
      return available
        .map((user) => {
          const userHours = events
            .filter((e) => e.user?._id === user._id && isSameDay(parseISO(e.startDate), gap.date))
            .reduce((total, event) => {
              const start = parseISO(event.startDate)
              const end = parseISO(event.endDate)
              return total + differenceInMinutes(end, start) / 60
            }, 0)

          return { user, hoursToday: userHours }
        })
        .sort((a, b) => a.hoursToday - b.hoursToday)
        .slice(0, staffNeeded)
        .map((x) => x.user)
    },
    [events]
  )

  /**
   * Get quick statistics
   */
  const getRosterStats = useMemo(() => {
    return {
      totalShifts: events.length,
      totalStaff: users.length,
      scheduledStaff: Array.from(new Set(events.map((e) => e.user?._id))).length,
      unscheduledStaff: users.filter((u) => !events.some((e) => e.user?._id === u._id)).length,
    }
  }, [events, users])

  /**
   * Calculate coverage percentage
   */
  const calculateCoveragePercentage = useCallback(
    (date: Date): number => {
      const dayEvents = events.filter((e) => isSameDay(parseISO(e.startDate), date))
      const hoursInDay = config.locationHours.close - config.locationHours.open
      const requiredStaffHours = hoursInDay * config.defaultRequiredStaff

      const staffHoursProvided = dayEvents.reduce((total, event) => {
        const start = parseISO(event.startDate)
        const end = parseISO(event.endDate)
        return total + differenceInMinutes(end, start) / 60
      }, 0)

      return (staffHoursProvided / requiredStaffHours) * 100
    },
    [events, config]
  )

  return {
    findRosterGaps,
    findOverloadedEmployees,
    suggestForGap,
    getRosterStats,
    calculateCoveragePercentage,
  }
}
