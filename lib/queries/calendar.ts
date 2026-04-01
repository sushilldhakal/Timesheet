import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as calendarApi from '@/lib/api/calendar'

// Query keys
export const calendarKeys = {
  all: ['calendar'] as const,
  events: (filters: calendarApi.CalendarEventsFilters) => [...calendarKeys.all, 'events', filters] as const,
}

// Get calendar events
export function useCalendarEvents(filters: calendarApi.CalendarEventsFilters) {
  return useQuery({
    queryKey: calendarKeys.events(filters),
    queryFn: () => calendarApi.getCalendarEvents(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create calendar event
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: calendarApi.createCalendarEvent,
  })
}

// Update calendar event
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: calendarApi.UpdateCalendarEventRequest }) => 
      calendarApi.updateCalendarEvent(id, data),
  })
}

// Delete calendar event
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: calendarApi.deleteCalendarEvent,
  })
}
// Bulk delete — single DB round-trip, used by conflict resolution
// Does NOT auto-invalidate: caller explicitly calls refetchEvents() once done
export function useBulkDeleteCalendarEvents() {
  return useMutation({
    mutationFn: (ids: string[]) => calendarApi.bulkDeleteCalendarEvents(ids),
  })
}
