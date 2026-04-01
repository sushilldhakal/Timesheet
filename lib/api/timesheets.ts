import { ApiResponse } from '@/lib/utils/api/api-response'

const BASE_URL = '/api/timesheets'

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
  employeeIds?: string[]
  employers?: string[]
  locations?: string[]
  roles?: string[]
  limit?: number
  offset?: number
}

export interface TimesheetResponse {
  timesheets: TimesheetRow[]
  totalWorkingHours: string
  totalBreakHours: string
  total: number
}

// Get timesheets with filters
export async function getTimesheets(filters: TimesheetFilters): Promise<TimesheetResponse> {
  const params = new URLSearchParams()
  params.set('startDate', filters.startDate)
  params.set('endDate', filters.endDate)
  params.set('limit', (filters.limit || 500).toString()) // API max limit is 500
  params.set('offset', (filters.offset || 0).toString())
  
  filters.employeeIds?.forEach(id => params.append('employeeId', id))
  filters.employers?.forEach(emp => params.append('employer', emp))
  filters.locations?.forEach(loc => params.append('location', loc))
  filters.roles?.forEach(role => params.append('role', role))

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `Failed to fetch timesheets (${response.status})`)
  }

  return response.json() as Promise<TimesheetResponse>
}