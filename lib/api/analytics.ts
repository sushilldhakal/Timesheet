import { ApiResponse } from '@/lib/utils/api-response'

const BASE_URL = '/api/analytics'

export interface EmployeeReport {
  employeeId: string
  employeeName: string
  pin: string
  totalHours: number
  totalShifts: number
  averageHoursPerShift: number
  punctualityScore: number
  noShowCount: number
  lateCount: number
  earlyLeaveCount: number
  overtimeHours: number
  breakVariance: number
  locations: string[]
  roles: string[]
}

export interface NoShowReport {
  date: string
  employeeId: string
  employeeName: string
  pin: string
  scheduledStartTime: string
  scheduledEndTime: string
  locationName: string
  roleName: string
  noShowType: 'complete' | 'late_arrival' | 'early_departure'
  minutesLate?: number
  minutesEarly?: number
}

export interface PunctualityReport {
  employeeId: string
  employeeName: string
  pin: string
  totalShifts: number
  onTimeShifts: number
  lateShifts: number
  earlyShifts: number
  averageLateness: number
  punctualityPercentage: number
  worstLateness: number
  bestEarliness: number
}

export interface VarianceReport {
  date: string
  employeeId: string
  employeeName: string
  pin: string
  scheduledHours: number
  actualHours: number
  variance: number
  variancePercentage: number
  scheduledBreakMinutes: number
  actualBreakMinutes: number
  breakVariance: number
  locationName: string
  roleName: string
}

export interface WeeklyReport {
  weekId: string
  weekStartDate: string
  weekEndDate: string
  totalEmployees: number
  totalHours: number
  totalCost: number
  averageHoursPerEmployee: number
  punctualityScore: number
  noShowCount: number
  overtimeHours: number
  locationBreakdown: Array<{
    locationId: string
    locationName: string
    employeeCount: number
    totalHours: number
    totalCost: number
    punctualityScore: number
  }>
  roleBreakdown: Array<{
    roleId: string
    roleName: string
    employeeCount: number
    totalHours: number
    totalCost: number
    averageHoursPerEmployee: number
  }>
}

// Get employee report
export async function getEmployeeReport(params?: {
  startDate?: string
  endDate?: string
  employeeId?: string
  locationId?: string
  roleId?: string
}): Promise<ApiResponse<EmployeeReport[]>> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.roleId) searchParams.set('roleId', params.roleId)
  
  const url = searchParams.toString() ? `${BASE_URL}/employee-report?${searchParams}` : `${BASE_URL}/employee-report`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get no-shows report
export async function getNoShowsReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
}): Promise<ApiResponse<NoShowReport[]>> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  
  const url = searchParams.toString() ? `${BASE_URL}/no-shows?${searchParams}` : `${BASE_URL}/no-shows`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get punctuality report
export async function getPunctualityReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
}): Promise<ApiResponse<PunctualityReport[]>> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  
  const url = searchParams.toString() ? `${BASE_URL}/punctuality?${searchParams}` : `${BASE_URL}/punctuality`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get variance report
export async function getVarianceReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
  minVariance?: number
}): Promise<ApiResponse<VarianceReport[]>> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  if (params?.minVariance) searchParams.set('minVariance', params.minVariance.toString())
  
  const url = searchParams.toString() ? `${BASE_URL}/variance?${searchParams}` : `${BASE_URL}/variance`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get weekly report
export async function getWeeklyReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
}): Promise<ApiResponse<WeeklyReport[]>> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  
  const url = searchParams.toString() ? `${BASE_URL}/weekly-report?${searchParams}` : `${BASE_URL}/weekly-report`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}