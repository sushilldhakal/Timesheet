export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  locationId?: string
  employeeId?: string
  type?: string
  status?: string
}

export interface CalendarEventsResponse {
  events: CalendarEvent[]
}

export interface CalendarEventsFilters {
  startDate: string
  endDate: string
  locationId?: string
}

// Get calendar events
export async function getCalendarEvents(filters: CalendarEventsFilters): Promise<{ data: CalendarEvent[] }> {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  })
  
  if (filters.locationId) {
    params.append('locationId', filters.locationId)
  }
  
  const response = await fetch(`/api/calendar/events?${params.toString()}`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch events')
  }
  
  return response.json()
}


export interface CreateCalendarEventRequest {
  employeeId?: string
  roleId: string
  locationId: string
  employerId: string
  startDate: string
  startTime: { hour: number; minute: number }
  endDate: string
  endTime: { hour: number; minute: number }
  breakMinutes?: number
  notes?: string
}

// Create calendar event
export async function createCalendarEvent(data: CreateCalendarEventRequest): Promise<{ success: boolean; data: CalendarEvent }> {
  const response = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create event')
  }
  
  return response.json()
}
// Transform CalendarEvent to IEvent format
export function calendarEventToIEvent(event: CalendarEvent): any {
  return {
    id: event.id,
    startDate: event.start,
    endDate: event.end,
    title: event.title,
    color: 'blue' as const,
    description: '',
    user: {
      id: event.employeeId || '',
      name: '',
      picturePath: null,
      location: [],
      role: [],
      employer: [],
    },
  };
}
