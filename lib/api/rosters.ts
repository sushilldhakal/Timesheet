import { apiFetch } from './fetch-client'
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
  return apiFetch<ApiResponse<RosterWeek>>(`${BASE_URL}/${weekId}`)
}

// Create a new roster for a week
export async function createRoster(data: CreateRosterRequest): Promise<ApiResponse<RosterWeek>> {
  return apiFetch<ApiResponse<RosterWeek>>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Add a shift to a roster
export async function addShift(weekId: string, data: AddShiftRequest): Promise<ApiResponse<RosterShift>> {
  return apiFetch<ApiResponse<RosterShift>>(`${BASE_URL}/${weekId}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update a shift in a roster
export async function updateShift(
  weekId: string, 
  shiftId: string, 
  data: UpdateShiftRequest
): Promise<ApiResponse<RosterShift>> {
  return apiFetch<ApiResponse<RosterShift>>(`${BASE_URL}/${weekId}/shifts/${shiftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete a shift from a roster
export async function deleteShift(weekId: string, shiftId: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`${BASE_URL}/${weekId}/shifts/${shiftId}`, {
    method: 'DELETE',
  })
}

/** Publish only shifts matching location + roles (shift-level status). */
export async function publishRosterScoped(
  weekId: string,
  body: { locationId: string; roleIds: string[] }
): Promise<ApiResponse<RosterWeek & { publishedCount?: number }>> {
  return apiFetch<ApiResponse<RosterWeek & { publishedCount?: number }>>(`${BASE_URL}/${weekId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Legacy: publish entire roster document status (PUT). */
export async function publishRosterAll(weekId: string): Promise<ApiResponse<RosterWeek>> {
  return apiFetch<ApiResponse<RosterWeek>>(`${BASE_URL}/${weekId}/publish`, {
    method: 'PUT',
  })
}

// Publish roster (wrapper for publishRosterAll)
export async function publishRoster(weekId: string): Promise<ApiResponse<RosterWeek>> {
  return publishRosterAll(weekId)
}

export async function autoFillRoster(
  weekId: string,
  body: {
    locationId: string
    managedRoles: string[]
    employmentTypes?: Array<"FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACT">
    replaceDrafts?: boolean
  }
): Promise<
  ApiResponse<{
    successCount: number
    failureCount: number
    skippedCount: number
    violations: unknown[]
    skippedEmployees?: Array<{ employeeId: string; employeeName: string; reason: string }>
  }>
> {
  return apiFetch<ApiResponse<{
    successCount: number
    failureCount: number
    skippedCount: number
    violations: unknown[]
    skippedEmployees?: Array<{ employeeId: string; employeeName: string; reason: string }>
  }>>(`${BASE_URL}/${weekId}/auto-fill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// Optimize roster
export async function optimizeRoster(weekId: string): Promise<ApiResponse<{ message: string; optimizedCount: number }>> {
  return apiFetch<ApiResponse<{ message: string; optimizedCount: number }>>(`${BASE_URL}/${weekId}/optimize`, {
    method: 'POST',
  })
}

// Copy roster week
export async function copyRosterWeek(fromWeekId: string, toWeekId: string): Promise<ApiResponse<{ message: string; copiedCount: number }>> {
  return apiFetch<ApiResponse<{ message: string; copiedCount: number }>>(`${BASE_URL}/${toWeekId}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromWeekId }),
  })
}

// Clear roster week
export async function clearRosterWeek(weekId: string): Promise<ApiResponse<{ message: string; deletedCount: number }>> {
  return apiFetch<ApiResponse<{ message: string; deletedCount: number }>>(`${BASE_URL}/${weekId}/clear`, {
    method: 'DELETE',
  })
}

// Generate roster from schedules or copy from previous week
export async function generateRoster(data: GenerateRosterRequest): Promise<ApiResponse<{ weekId: string; shiftsCreated: number }>> {
  return apiFetch<ApiResponse<{ weekId: string; shiftsCreated: number }>>(`${BASE_URL}/${data.weekId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}