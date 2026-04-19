import { apiFetch } from './fetch-client'

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
}): Promise<EmployeeReport[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.roleId) searchParams.set('roleId', params.roleId)
  const qs = searchParams.toString()
  return apiFetch<EmployeeReport[]>(`${BASE_URL}/employee-report${qs ? `?${qs}` : ''}`)
}

// Get no-shows report
export async function getNoShowsReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
}): Promise<NoShowReport[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  const qs = searchParams.toString()
  return apiFetch<NoShowReport[]>(`${BASE_URL}/no-shows${qs ? `?${qs}` : ''}`)
}

// Get punctuality report
export async function getPunctualityReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
}): Promise<PunctualityReport[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  const qs = searchParams.toString()
  return apiFetch<PunctualityReport[]>(`${BASE_URL}/punctuality${qs ? `?${qs}` : ''}`)
}

// Get variance report
export async function getVarianceReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
  minVariance?: number
}): Promise<VarianceReport[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.employeeId) searchParams.set('employeeId', params.employeeId)
  if (params?.minVariance) searchParams.set('minVariance', params.minVariance.toString())
  const qs = searchParams.toString()
  return apiFetch<VarianceReport[]>(`${BASE_URL}/variance${qs ? `?${qs}` : ''}`)
}

// Get weekly report
export async function getWeeklyReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
}): Promise<WeeklyReport[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  const qs = searchParams.toString()
  return apiFetch<WeeklyReport[]>(`${BASE_URL}/weekly-report${qs ? `?${qs}` : ''}`)
}

// Get labour cost analytics
export async function getLabourCostAnalytics(params?: {
  locationId?: string
  from?: string
  to?: string
}): Promise<{ breakdown: any[] }> {
  const searchParams = new URLSearchParams()
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.from) searchParams.set('from', params.from)
  if (params?.to) searchParams.set('to', params.to)
  const qs = searchParams.toString()
  return apiFetch<{ breakdown: any[] }>(`${BASE_URL}/labour-cost${qs ? `?${qs}` : ''}`)
}

// Generate labour cost analysis
export async function generateLabourCostAnalysis(params: {
  locationId: string
  from: string
  to: string
}): Promise<any> {
  const searchParams = new URLSearchParams({
    locationId: params.locationId,
    from: params.from,
    to: params.to,
  })
  return apiFetch<any>(`${BASE_URL}/labour-cost?${searchParams.toString()}`, {
    method: 'POST',
  })
}
