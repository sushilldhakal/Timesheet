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

  return apiFetch<TimesheetResponse>(`${BASE_URL}?${params.toString()}`)
}
