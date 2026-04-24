import { apiFetch } from './fetch-client'

const BASE_URL = '/api/timesheets'

export type TimesheetDashboardView = 'day' | 'week' | 'month'

export interface TimesheetRow {
  date: string
  employeeId: string
  name: string
  pin: string
  comment: string
  employer: string
  role: string
  location: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
}

export interface TimesheetFilters {
  startDate: string
  endDate: string
  view?: TimesheetDashboardView
  employeeIds?: string[]
  employers?: string[]
  locations?: string[]
  roles?: string[]
  limit?: number
  offset?: number
  /** Pass '1' to include dailyShiftId, status, locationId, roleId, rosterShiftId, varianceMinutes, flags */
  includeSchedule?: '1'
}

export interface TimesheetResponse {
  /** Shape depends on `view`: day = raw rows; week/month = server-aggregated rows */
  timesheets: TimesheetRow[] | Record<string, unknown>[]
  totalWorkingHours: string
  totalBreakHours: string
  total: number
  limit: number
  offset: number
  totalWorkingMinutes?: number
  totalBreakMinutes?: number
}

// Get timesheets with filters
export async function getTimesheets(filters: TimesheetFilters): Promise<TimesheetResponse> {
  const params = new URLSearchParams()
  params.set('startDate', filters.startDate)
  params.set('endDate', filters.endDate)
  params.set('view', filters.view ?? 'day')
  params.set('limit', String(filters.limit ?? 50))
  params.set('offset', String(filters.offset ?? 0))

  filters.employeeIds?.forEach(id => params.append('employeeId', id))
  filters.employers?.forEach(emp => params.append('employer', emp))
  filters.locations?.forEach(loc => params.append('location', loc))
  filters.roles?.forEach(role => params.append('role', role))
  if (filters.includeSchedule) params.set('includeSchedule', filters.includeSchedule)

  return apiFetch<TimesheetResponse>(`${BASE_URL}?${params.toString()}`)
}

// Update a daily shift
export async function updateDailyShift(id: string, data: Partial<TimesheetRow> & { roleId?: string }): Promise<{ success: boolean; shift: TimesheetRow }> {
  return apiFetch<{ success: boolean; shift: TimesheetRow }>(`/api/daily-shifts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Approve a single daily shift
export async function approveDailyShift(id: string): Promise<{ success: boolean; shift: TimesheetRow }> {
  return apiFetch<{ success: boolean; shift: TimesheetRow }>(`/api/daily-shifts/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

// Reject a single daily shift
export async function rejectDailyShift(id: string, reason?: string): Promise<{ success: boolean; shift: TimesheetRow }> {
  return apiFetch<{ success: boolean; shift: TimesheetRow }>(`/api/daily-shifts/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason ? { reason } : {}),
  })
}

// Bulk approve shifts
export async function bulkApproveShifts(ids: string[]): Promise<{ success: boolean; approvedCount: number }> {
  return apiFetch<{ success: boolean; approvedCount: number }>('/api/daily-shifts/bulk-approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

// Bulk reject shifts
export async function bulkRejectShifts(ids: string[], reason: string): Promise<{ success: boolean; rejectedCount: number }> {
  return apiFetch<{ success: boolean; rejectedCount: number }>('/api/daily-shifts/bulk-reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, reason }),
  })
}

// Get shifts for approval
export async function getShiftsForApproval(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{ shifts: TimesheetRow[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  const qs = searchParams.toString()
  return apiFetch<{ shifts: TimesheetRow[]; total: number }>(`/api/daily-shifts/approval${qs ? `?${qs}` : ''}`)
}
