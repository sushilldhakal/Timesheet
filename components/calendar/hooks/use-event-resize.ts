import { useCallback } from "react"
import { parseISO, addMinutes } from "date-fns"
import { useUpdateEvent } from "./use-update-event"
import type { IEvent } from "@/components/calendar/interfaces"

interface ResizeOptions {
  minDuration?: number // minutes
  maxDuration?: number // minutes
  snapToIncrement?: number // minutes (15, 30, 60)
}

const DEFAULT_OPTIONS: ResizeOptions = {
  minDuration: 15,
  maxDuration: 720, // 12 hours
  snapToIncrement: 15,
}

export function useEventResize(options: ResizeOptions = {}) {
  const { updateEvent } = useUpdateEvent()
  const config = { ...DEFAULT_OPTIONS, ...options }

  // Helper to snap time to nearest increment
  const snapTime = useCallback(
    (date: Date): Date => {
      if (!config.snapToIncrement) return date
      const ms = config.snapToIncrement * 60 * 1000
      return new Date(Math.round(date.getTime() / ms) * ms)
    },
    [config.snapToIncrement]
  )

  // Resize from start (top edge)
  const resizeStart = useCallback(
    (event: IEvent, newStartTime: Date) => {
      const snappedStart = snapTime(newStartTime)
      const endDate = parseISO(event.endDate)

      // Calculate duration
      const durationMs = endDate.getTime() - parseISO(event.startDate).getTime()
      const durationMinutes = durationMs / (1000 * 60)

      // Validate duration constraints
      if (
        config.minDuration &&
        durationMinutes < config.minDuration
      ) {
        return // Don't resize if below minimum
      }

      // Prevent start from going past end
      if (snappedStart >= endDate) {
        return
      }

      updateEvent({
        ...event,
        startDate: snappedStart.toISOString(),
      })
    },
    [snapTime, config.minDuration, updateEvent]
  )

  // Resize from end (bottom edge)
  const resizeEnd = useCallback(
    (event: IEvent, newEndTime: Date) => {
      const snappedEnd = snapTime(newEndTime)
      const startDate = parseISO(event.startDate)

      // Calculate duration
      const durationMs = snappedEnd.getTime() - startDate.getTime()
      const durationMinutes = durationMs / (1000 * 60)

      // Validate duration constraints
      if (config.minDuration && durationMinutes < config.minDuration) {
        return
      }
      if (config.maxDuration && durationMinutes > config.maxDuration) {
        return
      }

      // Prevent end from going before start
      if (snappedEnd <= startDate) {
        return
      }

      updateEvent({
        ...event,
        endDate: snappedEnd.toISOString(),
      })
    },
    [snapTime, config.minDuration, config.maxDuration, updateEvent]
  )

  // Get duration in minutes
  const getDuration = useCallback((event: IEvent): number => {
    const start = parseISO(event.startDate)
    const end = parseISO(event.endDate)
    return (end.getTime() - start.getTime()) / (1000 * 60)
  }, [])

  // Change duration while keeping start time same
  const changeDuration = useCallback(
    (event: IEvent, durationMinutes: number) => {
      if (
        config.minDuration &&
        durationMinutes < config.minDuration
      ) {
        return
      }
      if (
        config.maxDuration &&
        durationMinutes > config.maxDuration
      ) {
        return
      }

      const startDate = parseISO(event.startDate)
      const newEndDate = addMinutes(startDate, durationMinutes)

      updateEvent({
        ...event,
        endDate: newEndDate.toISOString(),
      })
    },
    [config.minDuration, config.maxDuration, updateEvent]
  )

  return {
    resizeStart,
    resizeEnd,
    changeDuration,
    getDuration,
    snapTime,
  }
}
