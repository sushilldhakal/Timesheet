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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

// Update calendar event
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: calendarApi.UpdateCalendarEventRequest }) => 
      calendarApi.updateCalendarEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

// Delete calendar event
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: calendarApi.deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}