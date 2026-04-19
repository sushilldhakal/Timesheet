import { apiFetch } from './fetch-client'

const BASE_URL = '/api/dashboard'

export interface DashboardStats {
  dailyTimeline: Array<{
    hour: string
    clockIn: number
    breakIn: number
    breakOut: number
    clockOut: number
  }>
  locationDistribution: Array<{
    name: string
    value: number
    fill: string
  }>
  attendanceByDay: Array<{
    day: string
    count: number
  }>
  weeklyMonthly: Array<{
    period: string
    totalHours: number
    activeEmployees: number
    attendanceRate: number
  }>
  roleStaffingByRole: Array<{
    name: string
    count: number
    color?: string
  }>
  employerMix: Array<{
    month: string
    [key: string]: number | string
  }>
  employerCategories: Array<{
    name: string
    color?: string
  }>
}

export interface HoursSummary {
  date: string
  totalHours: number
  totalCost: number
  employeeCount: number
  locationBreakdown: Array<{
    locationId: string
    locationName: string
    hours: number
    cost: number
    employeeCount: number
  }>
}

export interface InactiveEmployee {
  id: string
  name: string
  pin: string
  lastActivity: string | null
  daysSinceLastActivity: number | null
  roles: string[]
  locations: string[]
}

export interface LocationStats {
  locationId: string
  locationName: string
  totalEmployees: number
  activeEmployees: number
  totalHours: number
  totalCost: number
  averageHoursPerEmployee: number
}

export interface RoleStats {
  roleId: string
  roleName: string
  totalEmployees: number
  activeEmployees: number
  totalHours: number
  totalCost: number
  averageHoursPerEmployee: number
}

export interface UserStats {
  userId: string
  email: string
  role: string
  lastLogin: string | null
  totalActions: number
  managedEmployees: number
  managedLocations: number
}

// Get dashboard stats
export async function getDashboardStats(params?: {
  timelineDate?: string
}): Promise<DashboardStats> {
  const searchParams = new URLSearchParams()
  if (params?.timelineDate) searchParams.set('timelineDate', params.timelineDate)
  const qs = searchParams.toString()
  return apiFetch<DashboardStats>(`${BASE_URL}/stats${qs ? `?${qs}` : ''}`)
}

// Get hours summary
export async function getHoursSummary(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
}): Promise<HoursSummary> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  const qs = searchParams.toString()
  return apiFetch<HoursSummary>(`${BASE_URL}/hours-summary${qs ? `?${qs}` : ''}`)
}

// Get inactive employees
export async function getInactiveEmployees(params?: {
  days?: number
  locationId?: string
}): Promise<InactiveEmployee[]> {
  const searchParams = new URLSearchParams()
  if (params?.days) searchParams.set('days', params.days.toString())
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  const qs = searchParams.toString()
  return apiFetch<InactiveEmployee[]>(`${BASE_URL}/inactive-employees${qs ? `?${qs}` : ''}`)
}

// Get location stats
export async function getLocationStats(params?: {
  startDate?: string
  endDate?: string
}): Promise<LocationStats[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  const qs = searchParams.toString()
  return apiFetch<LocationStats[]>(`${BASE_URL}/location${qs ? `?${qs}` : ''}`)
}

// Get role stats
export async function getRoleStats(params?: {
  startDate?: string
  endDate?: string
}): Promise<RoleStats[]> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  const qs = searchParams.toString()
  return apiFetch<RoleStats[]>(`${BASE_URL}/role${qs ? `?${qs}` : ''}`)
}

// Get user stats
export async function getUserStats(): Promise<UserStats[]> {
  return apiFetch<UserStats[]>(`${BASE_URL}/user`)
}

// Get notification count
export async function getNotificationCount(): Promise<{ count: number; unread: number }> {
  return apiFetch<{ count: number; unread: number }>('/api/notifications/count')
}
