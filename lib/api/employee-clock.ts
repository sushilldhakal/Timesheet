import { ApiResponse } from '@/lib/utils/api/api-response'

const BASE_URL = '/api/employee'

export interface EmployeeLoginRequest {
  pin: string
  lat?: number
  lng?: number
}

export interface EmployeeLoginResponse {
  employee: {
    id: string
    name: string
    pin: string
    role: string
  }
  punches: {
    clockIn?: string
    breakIn?: string
    breakOut?: string
    clockOut?: string
  }
  location: {
    lat: number
    lng: number
  }
  isBirthday: boolean
  detectedLocation: string
  geofenceWarning?: boolean
}

export interface ClockRequest {
  type: 'in' | 'break' | 'endBreak' | 'out'
  imageUrl?: string
  date?: string
  time?: string
  lat?: string
  lng?: string
  noPhoto?: boolean
  offline?: boolean
  offlineTimestamp?: string
  employeePin?: string
}

export interface ClockResponse {
  success: boolean
  message: string
  punches: {
    clockIn?: string
    breakIn?: string
    breakOut?: string
    clockOut?: string
  }
  employee?: {
    id: string
    name: string
    pin: string
    role: string
  }
  detectedLocation?: string
}

export interface EmployeeProfile {
  id: string
  name: string
  pin: string
  email: string
  phone: string
  role: string
  location: string
  img?: string
  lastClockInImage?: string
  isBirthday: boolean
  homeAddress?: string
  employer?: string
  employmentType?: string
  dob?: string
  comment?: string
  standardHoursPerWeek?: number | null
  award?: { id: string; name: string; level: string } | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface TimesheetEntry {
  date: string
  clockIn?: string
  breakIn?: string
  breakOut?: string
  clockOut?: string
  totalHours: string
  breakHours: string
}

export interface UploadResponse {
  success: boolean
  url: string
  message: string
}

// Employee login with PIN
export async function employeeLogin(data: EmployeeLoginRequest): Promise<ApiResponse<EmployeeLoginResponse>> {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Employee logout
export async function employeeLogout(): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  return response.json()
}

// Get current employee profile
export async function getEmployeeProfile(): Promise<{ data: { employee: EmployeeProfile } }> {
  const response = await fetch(`${BASE_URL}/me`, {
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({} as any))
    throw new Error(error?.error || 'Failed to load employee profile')
  }
  const json = await response.json()

  // The backend may return either:
  // - { employee: EmployeeProfile }
  // - { data: { employee: EmployeeProfile } }
  // - EmployeeProfile (flat)
  const employee: EmployeeProfile | undefined =
    (json?.data?.employee as EmployeeProfile | undefined) ??
    (json?.employee as EmployeeProfile | undefined) ??
    (json as EmployeeProfile | undefined)

  if (!employee || typeof employee !== 'object') {
    throw new Error('Invalid employee profile response')
  }

  return { data: { employee } }
}

// Clock in/out/break
export async function clockAction(data: ClockRequest): Promise<ApiResponse<ClockResponse>> {
  const response = await fetch(`${BASE_URL}/clock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Change password
export async function changeEmployeePassword(data: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${BASE_URL}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Get employee timesheet
export async function getEmployeeTimesheet(params?: {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<{ data: TimesheetEntry[]; total: number }>> {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  
  const url = searchParams.toString() ? `${BASE_URL}/timesheet?${searchParams}` : `${BASE_URL}/timesheet`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Upload file (image)
export async function uploadFile(file: File): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  return response.json()
}

// Create offline session
export async function createOfflineSession(data: {
  employeeId: string
  pin: string
  offline: boolean
}): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${BASE_URL}/offline-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}