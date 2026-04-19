import { apiFetch } from './fetch-client'

export interface AvailabilityConstraint {
  _id?: string
  id?: string
  employeeId?: string
  unavailableDays?: number[]
  unavailableTimeRanges?: Array<{ start: string; end: string }>
  preferredShiftTypes?: string[]
  maxConsecutiveDays?: number | null
  minRestHours?: number | null
  temporaryStartDate?: string | null
  temporaryEndDate?: string | null
  reason?: string
  createdAt?: string
  updatedAt?: string
}

export interface AvailabilityConstraintsResponse {
  constraints: AvailabilityConstraint[]
}

// Get availability constraints for an employee
export async function getEmployeeAvailability(employeeId: string): Promise<AvailabilityConstraintsResponse> {
  return apiFetch<AvailabilityConstraintsResponse>(`/api/employees/${encodeURIComponent(employeeId)}/availability`)
}

// Create an availability constraint for an employee
export async function createAvailabilityConstraint(
  employeeId: string,
  data: Omit<AvailabilityConstraint, '_id' | 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>,
): Promise<AvailabilityConstraint> {
  return apiFetch<AvailabilityConstraint>(`/api/employees/${encodeURIComponent(employeeId)}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update an availability constraint for an employee
export async function updateAvailabilityConstraint(
  employeeId: string,
  constraintId: string,
  data: Partial<Omit<AvailabilityConstraint, '_id' | 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>>,
): Promise<AvailabilityConstraint> {
  return apiFetch<AvailabilityConstraint>(
    `/api/employees/${encodeURIComponent(employeeId)}/availability?constraintId=${encodeURIComponent(constraintId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  )
}

// Delete an availability constraint for an employee
export async function deleteEmployeeAvailability(employeeId: string, constraintId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/api/employees/${encodeURIComponent(employeeId)}/availability?constraintId=${encodeURIComponent(constraintId)}`,
    { method: 'DELETE' },
  )
}

// Get availability constraints for multiple employees
export async function getBulkEmployeeAvailability(
  employeeIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, AvailabilityConstraint[]>> {
  const results: Record<string, AvailabilityConstraint[]> = {}
  
  for (const employeeId of employeeIds) {
    try {
      const response = await getEmployeeAvailability(employeeId)
      results[employeeId] = response.constraints || []
    } catch (error) {
      results[employeeId] = []
    }
  }
  
  return results
}
