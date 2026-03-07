export interface LocationRole {
  roleId: string
  roleName: string
  roleColor?: string
  effectiveFrom: string
  effectiveTo?: string | null
  isActive: boolean
  employeeCount: number
}

export interface LocationRolesResponse {
  success: boolean
  data: {
    roles: LocationRole[]
  }
  metadata?: {
    count: number
    locationId: string
    date: string
  }
}

export interface EnableRoleRequest {
  roleId: string
  effectiveFrom: string
  effectiveTo?: string | null
}

// Get roles for a location
export async function getLocationRoles(locationId: string): Promise<LocationRolesResponse> {
  const response = await fetch(`/api/locations/${locationId}/roles`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch location roles')
  }
  
  return response.json()
}

// Enable role for location
export async function enableLocationRole(locationId: string, data: EnableRoleRequest): Promise<{ success: boolean }> {
  const response = await fetch(`/api/locations/${locationId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to enable role')
  }
  
  return response.json()
}

// Disable role for location
export async function disableLocationRole(locationId: string, roleId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/locations/${locationId}/roles/${roleId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to disable role')
  }
  
  return response.json()
}