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
  userName: string
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
}) {
  const searchParams = new URLSearchParams()
  if (params?.timelineDate) searchParams.set('timelineDate', params.timelineDate)
  
  const url = searchParams.toString() ? `${BASE_URL}/stats?${searchParams}` : `${BASE_URL}/stats`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get hours summary
export async function getHoursSummary(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  
  const url = searchParams.toString() ? `${BASE_URL}/hours-summary?${searchParams}` : `${BASE_URL}/hours-summary`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get inactive employees
export async function getInactiveEmployees(params?: {
  days?: number
  locationId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.days) searchParams.set('days', params.days.toString())
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  
  const url = searchParams.toString() ? `${BASE_URL}/inactive-employees?${searchParams}` : `${BASE_URL}/inactive-employees`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get location stats
export async function getLocationStats(params?: {
  startDate?: string
  endDate?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  
  const url = searchParams.toString() ? `${BASE_URL}/location?${searchParams}` : `${BASE_URL}/location`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get role stats
export async function getRoleStats(params?: {
  startDate?: string
  endDate?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  
  const url = searchParams.toString() ? `${BASE_URL}/role?${searchParams}` : `${BASE_URL}/role`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get user stats
export async function getUserStats() {
  const response = await fetch(`${BASE_URL}/user`, {
    credentials: 'include',
  })
  return response.json()
}