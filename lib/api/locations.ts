import { apiFetch } from './fetch-client'
import type { CreateLocationRequest, Location, UpdateLocationRequest } from '@/lib/types'

export interface LocationsResponse {
  locations: Location[]
}

export interface LocationResponse {
  location: Location
}

export async function getAll(): Promise<LocationsResponse> {
  return apiFetch<LocationsResponse>('/api/locations', {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
}

export async function getOne(id: string): Promise<LocationResponse> {
  return apiFetch<LocationResponse>(`/api/locations/${id}`)
}

export async function create(data: CreateLocationRequest): Promise<LocationResponse> {
  return apiFetch<LocationResponse>('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function update(id: string, data: UpdateLocationRequest): Promise<LocationResponse> {
  return apiFetch<LocationResponse>(`/api/locations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function remove(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/locations/${id}`, { method: 'DELETE' })
}

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
  return apiFetch<LocationRolesResponse>(`/api/locations/${locationId}/roles`)
}

// Enable role for location
export async function enableLocationRole(locationId: string, data: EnableRoleRequest): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/locations/${locationId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Disable role for location
export async function disableLocationRole(locationId: string, roleId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/locations/${locationId}/roles/${roleId}`, { method: 'DELETE' })
}