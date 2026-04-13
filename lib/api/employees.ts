import { apiFetch } from "./fetch-client"

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
  password?: string
  sendSetupEmail?: boolean
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

export interface EmployeeFiltersResponse {
  roles: Array<{ name: string; count: number }>
  employers: Array<{ name: string; count: number }>
  locations: Array<{ name: string; count: number }>
}

// Get employee filters
export async function getEmployeeFilters(): Promise<EmployeeFiltersResponse> {
  return apiFetch<EmployeeFiltersResponse>('/api/employees/filters')
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
  return apiFetch<EmployeesResponse>(url)
}

// Get employee by ID
export async function getEmployee(id: string): Promise<EmployeeResponse> {
  return apiFetch<EmployeeResponse>(`/api/employees/${id}`)
}

// Create employee
export async function createEmployee(data: CreateEmployeeRequest): Promise<EmployeeResponse> {
  return apiFetch<EmployeeResponse>('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update employee
export async function updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<EmployeeResponse> {
  return apiFetch<EmployeeResponse>(`/api/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete employee
export async function deleteEmployee(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/employees/${id}`, { method: 'DELETE' })
}

// Generate PIN
export async function generatePin(): Promise<GeneratePinResponse> {
  return apiFetch<GeneratePinResponse>('/api/employees/generate-pin')
}

// Check PIN availability
export async function checkPin(pin: string): Promise<CheckPinResponse> {
  return apiFetch<CheckPinResponse>(`/api/employees/check-pin?pin=${pin}`)
}

// Get employee timesheet
export async function getEmployeeTimesheet(id: string, params?: URLSearchParams): Promise<EmployeeTimesheetResponse> {
  const url = params 
    ? `/api/employees/${id}/timesheet?${params.toString()}`
    : `/api/employees/${id}/timesheet`
  return apiFetch<EmployeeTimesheetResponse>(url)
}

// Update employee timesheet
export async function updateEmployeeTimesheet(
  employeeId: string, 
  data: UpdateTimesheetRequest
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/employees/${employeeId}/timesheet`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Get employee award history
export async function getEmployeeAwardHistory(id: string): Promise<EmployeeAwardHistoryResponse> {
  return apiFetch<EmployeeAwardHistoryResponse>(`/api/employees/${id}/award-history`)
}

// Award employee
export async function awardEmployee(id: string, data: AwardEmployeeRequest): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/employees/${id}/award`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Create employee role assignment
export async function createEmployeeRole(
  employeeId: string, 
  data: CreateEmployeeRoleRequest
): Promise<EmployeeRoleAssignmentResponse> {
  return apiFetch<EmployeeRoleAssignmentResponse>(`/api/employees/${employeeId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
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
  return apiFetch<EmployeeRolesResponse>(url)
}

// Delete employee role assignment
export async function deleteEmployeeRole(
  employeeId: string,
  assignmentId: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/employees/${employeeId}/roles/${assignmentId}`, {
    method: 'DELETE',
  })
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
  
  return apiFetch<EmployeeAvailabilityResponse>(url)
}

// ─── Employee Payroll & Compliance Types ─────────────────

export interface EmployeeTaxInfo {
  id: string
  countrySnapshot: string
  taxIdMasked: string
  taxIdType: string
  bankAccountMasked: string
  bankRoutingMasked: string
  bankRoutingType: string
  bankAccountName: string
  bankName: string | null
  countryName: string
  currency: string
}

export interface EmployeeBankDetails {
  id: string
  employeeId: string
  accountNumber: string
  bsbCode: string
  accountHolderName: string
  bankName?: string | null
  accountType?: string | null
}

export interface EmployeeContract {
  id: string
  employeeId: string
  startDate: string
  endDate?: string | null
  contractType: string
  noticePeriod?: number | null
  probationPeriodEnd?: string | null
  contractTermsUrl?: string | null
  salary?: number | null
  wageType: string
  isActive: boolean
}

export interface EmployeeQualification {
  id: string
  employeeId: string
  qualificationName: string
  issuingBody: string
  issueDate: string
  expiryDate?: string | null
  licenseNumber?: string | null
  status: string
  documentUrl?: string | null
}

export interface ComplianceAlert {
  type: string
  field: string
  message: string
  expiryDate?: string
}

export interface EmployeeComplianceRecord {
  id: string
  employeeId: string
  wwcStatus?: string | null
  wwcNumber?: string | null
  wwcExpiryDate?: string | null
  policeClearanceStatus?: string | null
  policeClearanceNumber?: string | null
  policeClearanceExpiryDate?: string | null
  foodHandlingStatus?: string | null
  foodHandlingExpiryDate?: string | null
  healthSafetyCertifications?: string[]
  inductionCompleted: boolean
  inductionDate?: string | null
  inductionDocUrl?: string | null
  codeOfConductSigned: boolean
  codeOfConductDate?: string | null
  codeOfConductDocUrl?: string | null
  lastComplianceCheckDate?: string | null
  alerts?: ComplianceAlert[]
}

// ─── Tax Info ────────────────────────────────────────────
export async function getEmployeeTaxInfo(employeeId: string): Promise<{ taxInfo: EmployeeTaxInfo }> {
  return apiFetch(`/api/employees/${employeeId}/tax-info`)
}

export async function createEmployeeTaxInfo(employeeId: string, data: Record<string, unknown>): Promise<{ taxInfo: EmployeeTaxInfo }> {
  return apiFetch(`/api/employees/${employeeId}/tax-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateEmployeeTaxInfo(employeeId: string, data: Record<string, unknown>): Promise<{ taxInfo: EmployeeTaxInfo }> {
  return apiFetch(`/api/employees/${employeeId}/tax-info`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ─── Bank Details ────────────────────────────────────────
export async function getEmployeeBankDetails(employeeId: string): Promise<{ bankDetails: EmployeeBankDetails }> {
  return apiFetch(`/api/employees/${employeeId}/bank-details`)
}

export async function createEmployeeBankDetails(employeeId: string, data: Record<string, unknown>): Promise<{ bankDetails: EmployeeBankDetails }> {
  return apiFetch(`/api/employees/${employeeId}/bank-details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateEmployeeBankDetails(employeeId: string, data: Record<string, unknown>): Promise<{ bankDetails: EmployeeBankDetails }> {
  return apiFetch(`/api/employees/${employeeId}/bank-details`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ─── Contracts ───────────────────────────────────────────
export async function getEmployeeContracts(employeeId: string): Promise<{ contracts: EmployeeContract[] }> {
  return apiFetch(`/api/employees/${employeeId}/contract`)
}

export async function createEmployeeContract(employeeId: string, data: Record<string, unknown>): Promise<{ contract: EmployeeContract }> {
  return apiFetch(`/api/employees/${employeeId}/contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateEmployeeContract(employeeId: string, data: Record<string, unknown>): Promise<{ contract: EmployeeContract }> {
  return apiFetch(`/api/employees/${employeeId}/contract`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ─── Qualifications ──────────────────────────────────────
export async function getEmployeeQualifications(employeeId: string): Promise<{ qualifications: EmployeeQualification[] }> {
  return apiFetch(`/api/employees/${employeeId}/qualifications`)
}

export async function createEmployeeQualification(employeeId: string, data: Record<string, unknown>): Promise<{ qualification: EmployeeQualification }> {
  return apiFetch(`/api/employees/${employeeId}/qualifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateEmployeeQualification(employeeId: string, data: Record<string, unknown>): Promise<{ qualification: EmployeeQualification }> {
  return apiFetch(`/api/employees/${employeeId}/qualifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteEmployeeQualification(employeeId: string, qualificationId: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/employees/${employeeId}/qualifications?qualificationId=${qualificationId}`, {
    method: 'DELETE',
  })
}

// ─── Compliance ──────────────────────────────────────────
export async function getEmployeeCompliance(employeeId: string): Promise<{ compliance: EmployeeComplianceRecord }> {
  return apiFetch(`/api/employees/${employeeId}/compliance`)
}

export async function updateEmployeeCompliance(employeeId: string, data: Record<string, unknown>): Promise<{ compliance: EmployeeComplianceRecord }> {
  return apiFetch(`/api/employees/${employeeId}/compliance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
