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
  userId?: string
  locationId?: string
  /** Staff-safe roster view */
  publishedOnly?: boolean
}

// Get calendar events
export async function getCalendarEvents(filters: CalendarEventsFilters): Promise<{ data: { events: any[] } }> {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  })
  
  if (filters.locationId && filters.locationId !== 'all') {
    params.append('locationId', filters.locationId)
  }
  
  if (filters.userId && filters.userId !== 'all') {
    params.append('userId', filters.userId)
  }

  if (filters.publishedOnly) {
    params.append('publishedOnly', 'true')
  }
  
  
  const response = await fetch(`/api/calendar/events?${params.toString()}`, {
    credentials: 'include',
  })
  
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch events')
    } else {
      // If we get HTML instead of JSON, log it for debugging
      const text = await response.text()
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`)
    }
  }
  
  const data = await response.json()
  return data
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
  console.log('[createCalendarEvent] Creating event:', data)
  
  const response = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  console.log('[createCalendarEvent] Response status:', response.status)
  console.log('[createCalendarEvent] Response headers:', Object.fromEntries(response.headers.entries()))
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    console.log('[createCalendarEvent] Error response content-type:', contentType)
    
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      console.log('[createCalendarEvent] JSON error:', error)
      throw new Error(error.error || 'Failed to create event')
    } else {
      // If we get HTML instead of JSON, log it for debugging
      const text = await response.text()
      console.log('[createCalendarEvent] HTML error response:', text.substring(0, 500))
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`)
    }
  }
  
  const result = await response.json()
  console.log('[createCalendarEvent] Success response:', result)
  return result
}

export interface UpdateCalendarEventRequest {
  employeeId?: string
  roleId?: string
  locationId?: string
  startDate?: string
  startTime?: { hour: number; minute: number }
  endDate?: string
  endTime?: { hour: number; minute: number }
  breakMinutes?: number
  notes?: string
}

// Update calendar event
export async function updateCalendarEvent(id: string, data: UpdateCalendarEventRequest): Promise<{ success: boolean; data: CalendarEvent }> {
  console.log('[updateCalendarEvent] Updating event:', id, data)
  
  const response = await fetch(`/api/calendar/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  console.log('[updateCalendarEvent] Response status:', response.status)
  console.log('[updateCalendarEvent] Response headers:', Object.fromEntries(response.headers.entries()))
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    console.log('[updateCalendarEvent] Error response content-type:', contentType)
    
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      console.log('[updateCalendarEvent] JSON error:', error)
      throw new Error(error.error || 'Failed to update event')
    } else {
      // If we get HTML instead of JSON, log it for debugging
      const text = await response.text()
      console.log('[updateCalendarEvent] HTML error response:', text.substring(0, 500))
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`)
    }
  }
  
  const result = await response.json()
  console.log('[updateCalendarEvent] Success response:', result)
  return result
}

// Delete calendar event
export async function deleteCalendarEvent(id: string): Promise<{ success: boolean }> {
  console.log('[deleteCalendarEvent] Deleting event:', id)
  
  const response = await fetch(`/api/calendar/events/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  
  console.log('[deleteCalendarEvent] Response status:', response.status)
  console.log('[deleteCalendarEvent] Response headers:', Object.fromEntries(response.headers.entries()))
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    console.log('[deleteCalendarEvent] Error response content-type:', contentType)
    
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      console.log('[deleteCalendarEvent] JSON error:', error)
      throw new Error(error.error || 'Failed to delete event')
    } else {
      // If we get HTML instead of JSON, log it for debugging
      const text = await response.text()
      console.log('[deleteCalendarEvent] HTML error response:', text.substring(0, 500))
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`)
    }
  }
  
  const result = await response.json()
  console.log('[deleteCalendarEvent] Success response:', result)
  return result
}

// Transform CalendarEvent to IEvent format
export function calendarEventToIEvent(event: any): any {
  return {
    id: event.id,
    startDate: event.startDate,
    endDate: event.endDate,
    title: event.title,
    color: event.color || 'blue',
    description: event.description || '',
    user: event.user || {
      id: event.employeeId || '',
      name: '',
      picturePath: null,
      location: [],
      role: [],
      employer: [],
    },
  };
}