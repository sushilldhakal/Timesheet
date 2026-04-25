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
  const json = await apiFetch<AvailabilityConstraintsResponse | AvailabilityConstraint[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/availability`,
  )
  // API returns `{ constraints }`; tolerate a raw array if anything upstream changes.
  if (Array.isArray(json)) return { constraints: json }
  if (json && typeof json === "object" && "constraints" in json && Array.isArray((json as AvailabilityConstraintsResponse).constraints)) {
    return json as AvailabilityConstraintsResponse
  }
  return { constraints: [] }
}

// Create an availability constraint for an employee
export async function createAvailabilityConstraint(
  employeeId: string,
  data: Omit<AvailabilityConstraint, '_id' | 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>,
): Promise<AvailabilityConstraint> {
  const json = await apiFetch<{ constraint: AvailabilityConstraint }>(
    `/api/employees/${encodeURIComponent(employeeId)}/availability`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  )
  if (!json?.constraint) throw new Error('Invalid response from server')
  return json.constraint
}

// Update an availability constraint for an employee
export async function updateAvailabilityConstraint(
  employeeId: string,
  constraintId: string,
  data: Partial<Omit<AvailabilityConstraint, '_id' | 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>>,
): Promise<AvailabilityConstraint> {
  const json = await apiFetch<{ constraint: AvailabilityConstraint }>(
    `/api/employees/${encodeURIComponent(employeeId)}/availability?constraintId=${encodeURIComponent(constraintId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  )
  if (!json?.constraint) throw new Error('Invalid response from server')
  return json.constraint
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
