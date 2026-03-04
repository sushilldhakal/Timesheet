import { useCallback } from "react"
import { parseISO, addDays, addWeeks, differenceInMinutes } from "date-fns"
import { useUpdateEvent } from "./use-update-event"
import { useDeleteEvent } from "./use-delete-event"
import type { IEvent } from "@/components/calendar/interfaces"

export interface ShiftTemplate {
  id: string
  name: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  color?: string
  title?: string
}

export const PRESET_TEMPLATES: ShiftTemplate[] = [
  {
    id: "morning",
    name: "Morning Shift",
    startHour: 6,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
    color: "blue",
  },
  {
    id: "afternoon",
    name: "Afternoon Shift",
    startHour: 14,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    color: "green",
  },
  {
    id: "evening",
    name: "Evening Shift",
    startHour: 16,
    startMinute: 0,
    endHour: 0,
    endMinute: 0, // midnight
    color: "purple",
  },
  {
    id: "closing",
    name: "Closing Shift",
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 59,
    color: "orange",
  },
  {
    id: "full-day",
    name: "Full Day",
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    color: "red",
  },
]

export function useBulkOperations() {
  const { updateEvent } = useUpdateEvent()
  const { deleteEvent } = useDeleteEvent()

  /**
   * Create event from template
   */
  const createFromTemplate = useCallback(
    (template: ShiftTemplate, date: Date, userId: string, locationId?: string): IEvent => {
      const startDate = new Date(date)
      startDate.setHours(template.startHour, template.startMinute, 0, 0)

      const endDate = new Date(date)
      let endHour = template.endHour
      if (endHour < template.startHour) {
        // Handle midnight wrapping
        endDate.setDate(endDate.getDate() + 1)
      }
      endDate.setHours(endHour, template.endMinute, 0, 0)

      return {
        _id: "", // Will be assigned by server
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        title: template.title || template.name,
        color: template.color || "blue",
        user: {
          _id: userId,
          name: "", // Will be filled by UI
        },
        locationId: locationId || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
    []
  )

  /**
   * Copy shift to multiple days
   */
  const copyToMultipleDays = useCallback(
    (event: IEvent, targetDates: Date[]) => {
      const duration = differenceInMinutes(parseISO(event.endDate), parseISO(event.startDate))

      targetDates.forEach((date) => {
        const startDate = new Date(date)
        const originalStart = parseISO(event.startDate)
        startDate.setHours(originalStart.getHours(), originalStart.getMinutes())

        const endDate = new Date(startDate)
        endDate.setMinutes(endDate.getMinutes() + duration)

        updateEvent({
          ...event,
          _id: `${event._id}_${date.getTime()}`, // Temporary ID for new events
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
      })
    },
    [updateEvent]
  )

  /**
   * Copy shift to same day each week for N weeks
   */
  const copyToMultipleWeeks = useCallback(
    (event: IEvent, numberOfWeeks: number) => {
      const dates: Date[] = []
      for (let i = 1; i < numberOfWeeks; i++) {
        dates.push(addWeeks(parseISO(event.startDate), i))
      }
      copyToMultipleDays(event, dates)
    },
    [copyToMultipleDays]
  )

  /**
   * Bulk update multiple events
   */
  const bulkUpdate = useCallback(
    (
      events: IEvent[],
      updates: {
        startHour?: number
        startMinute?: number
        duration?: number
        color?: string
        title?: string
      }
    ) => {
      events.forEach((event) => {
        let newStartDate = parseISO(event.startDate)
        let newEndDate = parseISO(event.endDate)

        // Update start time
        if (updates.startHour !== undefined) {
          newStartDate = new Date(newStartDate)
          newStartDate.setHours(updates.startHour, updates.startMinute || 0)
        }

        // Update duration
        if (updates.duration !== undefined) {
          newEndDate = new Date(newStartDate)
          newEndDate.setMinutes(newEndDate.getMinutes() + updates.duration)
        }

        updateEvent({
          ...event,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
          ...(updates.color && { color: updates.color }),
          ...(updates.title && { title: updates.title }),
        })
      })
    },
    [updateEvent]
  )

  /**
   * Bulk delete events
   */
  const bulkDelete = useCallback(
    (events: IEvent[]) => {
      events.forEach((event) => {
        deleteEvent(event._id)
      })
    },
    [deleteEvent]
  )

  /**
   * Assign template to multiple employees on same day
   */
  const assignTemplateToMultiple = useCallback(
    (template: ShiftTemplate, date: Date, userIds: string[], locationId?: string) => {
      userIds.forEach((userId) => {
        const event = createFromTemplate(template, date, userId, locationId)
        updateEvent({
          ...event,
          _id: `${template.id}_${userId}_${date.getTime()}`,
        })
      })
    },
    [createFromTemplate, updateEvent]
  )

  /**
   * Get recurring shift days for a week (e.g., Mon/Wed/Fri)
   */
  const getRecurringDays = useCallback((weekStart: Date, dayOfWeeks: number[]): Date[] => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      if (dayOfWeeks.includes(date.getDay())) {
        dates.push(date)
      }
    }
    return dates
  }, [])

  return {
    createFromTemplate,
    copyToMultipleDays,
    copyToMultipleWeeks,
    bulkUpdate,
    bulkDelete,
    assignTemplateToMultiple,
    getRecurringDays,
    PRESET_TEMPLATES,
  }
}
