import { ApiResponse } from '@/lib/utils/api/api-response'

const BASE_URL = '/api/rosters'

export interface RosterWeek {
  weekId: string
  year: number
  weekNumber: number
  weekStartDate: string
  weekEndDate: string
  status: 'draft' | 'published' | 'locked'
  shifts: RosterShift[]
}

export interface RosterShift {
  _id: string
  employeeId: string | null
  date: string
  startTime: string
  endTime: string
  locationId: string
  roleId: string
  sourceScheduleId?: string | null
  estimatedCost: number
  notes: string
}

export interface CreateRosterRequest {
  weekId: string
  includeEmploymentTypes?: string[]
  locationIds?: string[]
}

export interface AddShiftRequest {
  employeeId?: string | null
  date: string
  startTime: string
  endTime: string
  locationId: string
  roleId: string
  sourceScheduleId?: string | null
  notes?: string
}

export interface UpdateShiftRequest {
  employeeId?: string | null
  date?: string
  startTime?: string
  endTime?: string
  locationId?: string
  roleId?: string
  sourceScheduleId?: string | null
  notes?: string
}

export interface GenerateRosterRequest {
  weekId: string
  mode: 'copy' | 'schedules'
  copyFromWeekId?: string
  includeEmploymentTypes?: string[]
  locationIds?: string[]
}

// Get roster for a specific week
export async function getRoster(weekId: string): Promise<ApiResponse<RosterWeek>> {
  const response = await fetch(`${BASE_URL}/${weekId}`, {
    credentials: 'include',
  })
  return response.json()
}

// Create a new roster for a week
export async function createRoster(data: CreateRosterRequest): Promise<ApiResponse<RosterWeek>> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Add a shift to a roster
export async function addShift(weekId: string, data: AddShiftRequest): Promise<ApiResponse<RosterShift>> {
  const response = await fetch(`${BASE_URL}/${weekId}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Update a shift in a roster
export async function updateShift(
  weekId: string, 
  shiftId: string, 
  data: UpdateShiftRequest
): Promise<ApiResponse<RosterShift>> {
  const response = await fetch(`${BASE_URL}/${weekId}/shifts/${shiftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Delete a shift from a roster
export async function deleteShift(weekId: string, shiftId: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${BASE_URL}/${weekId}/shifts/${shiftId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return response.json()
}

// Publish a roster
export async function publishRoster(weekId: string): Promise<ApiResponse<RosterWeek>> {
  const response = await fetch(`${BASE_URL}/${weekId}/publish`, {
    method: 'POST',
    credentials: 'include',
  })
  return response.json()
}

// Generate roster from schedules or copy from previous week
export async function generateRoster(data: GenerateRosterRequest): Promise<ApiResponse<{ weekId: string; shiftsCreated: number }>> {
  const response = await fetch(`${BASE_URL}/${data.weekId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}