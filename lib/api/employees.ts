export interface Employee {
  id: string
  name: string
  pin: string
  roles?: Array<{
    id: string
    role: {
      id: string
      name: string
      color?: string
    }
    location: {
      id: string
      name: string
      address: string
      lat?: number
      lng?: number
      geofence: {
        radius: number
        mode: string
      }
      hours: {
        opening?: number
        closing?: number
        workingDays: number[]
      }
    }
    validFrom: string
    validTo: string | null
    isActive: boolean
  }>
  employers?: Array<{
    id: string
    name: string
    color?: string
  }>
  locations?: Array<{
    id: string
    name: string
    address: string
    lat?: number
    lng?: number
    geofence: {
      radius: number
      mode: string
    }
    hours: {
      opening?: number
      closing?: number
      workingDays: number[]
    }
  }>
  email: string
  phone: string
  homeAddress: string
  dob: string
  gender?: string
  comment: string
  img: string
  employmentType?: string
  standardHoursPerWeek?: number | null
  award?: {
    id: string
    name: string
    level: string
    description: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateEmployeeRequest {
  name: string
  email?: string
  phone?: string
  pin: string
  homeAddress?: string
  dob?: string
  gender?: string
  comment?: string
  role?: string[]
  employer?: string[]
  location?: string[]
  employmentType?: string
  standardHoursPerWeek?: number | null
  awardId?: string
  awardLevel?: string
  profileImage?: string
  password?: string
  sendSetupEmail?: boolean
}

export interface UpdateEmployeeRequest {
  name?: string
  email?: string
  phone?: string
  pin?: string
  dob?: string
  homeAddress?: string
  gender?: string
  comment?: string
  role?: string[]
  employer?: string[]
  location?: string[]
  employmentType?: string
  standardHoursPerWeek?: number | null
  awardId?: string
  awardLevel?: string
  awards?: string[]
  profileImage?: string
}

export interface GetEmployeesParams {
  limit?: number
  offset?: number
  search?: string
  sortBy?: string
  order?: 'asc' | 'desc'
  location?: string
  role?: string
  employer?: string
}

export interface EmployeesResponse {
  employees: Employee[]
  total: number
  limit: number
  offset: number
}

export interface EmployeeResponse {
  employee: Employee
}

export interface GeneratePinResponse {
  pin: string
}

export interface CheckPinResponse {
  available: boolean
}

export interface TimesheetEntry {
  id: string
  date: string
  clockIn?: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  totalHours?: number
  status?: string
}

export interface EmployeeTimesheetResponse {
  data: TimesheetEntry[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface UpdateTimesheetRequest {
  clockIn?: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
}

export interface AwardHistoryEntry {
  awardId: string
  awardLevel: string
  employmentType: string
  effectiveFrom: string
  effectiveTo: string | null
  overridingRate: number | null
  awardName: string
  isActive: boolean
}

export interface EmployeeAwardHistoryResponse {
  history: AwardHistoryEntry[]
}

export interface AwardEmployeeRequest {
  awardId: string
  awardLevel: string
  employmentType: string
  effectiveFrom: string
  overridingRate?: number
}

export interface EmployeeRoleAssignment {
  id: string
  employeeId: string
  roleId: string
  roleName: string
  roleColor?: string
  locationId: string
  locationName: string
  locationColor?: string
  validFrom: string
  validTo: string | null
  isActive: boolean
  notes?: string
  assignedAt: string
}

export interface CreateEmployeeRoleRequest {
  roleId: string
  locationId: string
  validFrom?: string
  validTo?: string | null
  notes?: string
}

export interface EmployeeRoleAssignmentResponse {
  assignment: EmployeeRoleAssignment
}

export interface EmployeeRolesResponse {
  success: boolean
  data: {
    assignments: EmployeeRoleAssignment[]
  }
}

// Get all employees
export async function getEmployees(params?: GetEmployeesParams): Promise<EmployeesResponse> {
  const searchParams = new URLSearchParams()
  
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params?.order) searchParams.set('order', params.order)
  if (params?.location) searchParams.set('location', params.location)
  if (params?.role) searchParams.set('role', params.role)
  if (params?.employer) searchParams.set('employer', params.employer)
  
  const url = `/api/employees${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch employees')
  }
  
  return response.json()
}

// Get employee by ID
export async function getEmployee(id: string): Promise<EmployeeResponse> {
  const response = await fetch(`/api/employees/${id}`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch employee')
  }
  
  return response.json()
}

// Create employee
export async function createEmployee(data: CreateEmployeeRequest): Promise<EmployeeResponse> {
  const response = await fetch('/api/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create employee')
  }
  
  return response.json()
}

// Update employee
export async function updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<EmployeeResponse> {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update employee')
  }
  
  return response.json()
}

// Delete employee
export async function deleteEmployee(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete employee')
  }
  
  return response.json()
}

// Generate PIN
export async function generatePin(): Promise<GeneratePinResponse> {
  const response = await fetch('/api/employees/generate-pin', {
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate PIN')
  }
  
  return response.json()
}

// Check PIN availability
export async function checkPin(pin: string): Promise<CheckPinResponse> {
  const response = await fetch(`/api/employees/check-pin?pin=${pin}`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to check PIN')
  }
  
  return response.json()
}

// Get employee timesheet
export async function getEmployeeTimesheet(id: string, params?: URLSearchParams): Promise<EmployeeTimesheetResponse> {
  const url = params 
    ? `/api/employees/${id}/timesheet?${params.toString()}`
    : `/api/employees/${id}/timesheet`
  
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch employee timesheet')
  }
  
  return response.json()
}

// Update employee timesheet
export async function updateEmployeeTimesheet(
  employeeId: string, 
  data: UpdateTimesheetRequest
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/employees/${employeeId}/timesheet`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update timesheet')
  }
  
  return response.json()
}

// Get employee award history
export async function getEmployeeAwardHistory(id: string): Promise<EmployeeAwardHistoryResponse> {
  const response = await fetch(`/api/employees/${id}/award-history`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch award history')
  }
  
  return response.json()
}

// Award employee
export async function awardEmployee(id: string, data: AwardEmployeeRequest): Promise<{ success: boolean }> {
  const response = await fetch(`/api/employees/${id}/award`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to award employee')
  }
  
  return response.json()
}

// Create employee role assignment
export async function createEmployeeRole(
  employeeId: string, 
  data: CreateEmployeeRoleRequest
): Promise<EmployeeRoleAssignmentResponse> {
  const response = await fetch(`/api/employees/${employeeId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign role to employee')
  }
  
  return response.json()
}

// Get employee role assignments
export async function getEmployeeRoles(
  employeeId: string,
  params?: { locationId?: string; date?: string; includeInactive?: boolean }
): Promise<EmployeeRolesResponse> {
  const searchParams = new URLSearchParams()
  
  if (params?.locationId) searchParams.set('locationId', params.locationId)
  if (params?.date) searchParams.set('date', params.date)
  if (params?.includeInactive) searchParams.set('includeInactive', 'true')
  
  const url = `/api/employees/${employeeId}/roles${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch employee roles')
  }
  
  return response.json()
}

// Delete employee role assignment
export async function deleteEmployeeRole(
  employeeId: string,
  assignmentId: string
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/employees/${employeeId}/roles/${assignmentId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete employee role assignment')
  }
  
  return response.json()
}


export interface EmployeeAvailabilityResponse {
  available: boolean
  reason?: string
  conflicts?: any[]
}

// Get employee availability
export async function getEmployeeAvailability(
  employeeId: string,
  params?: { date?: string; locationId?: string }
): Promise<EmployeeAvailabilityResponse> {
  const searchParams = new URLSearchParams()
  if (params?.date) searchParams.append('date', params.date)
  if (params?.locationId) searchParams.append('locationId', params.locationId)
  
  const url = searchParams.toString() 
    ? `/api/employees/${employeeId}/availability?${searchParams.toString()}`
    : `/api/employees/${employeeId}/availability`
  
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get employee availability')
  }
  
  return response.json()
}
