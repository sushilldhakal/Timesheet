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

export interface LocationTeam {
  teamId: string
  teamName: string
  teamColor?: string
  effectiveFrom: string
  effectiveTo?: string | null
  isActive: boolean
  employeeCount: number
}

/** @deprecated use LocationTeam */
export type LocationRole = LocationTeam

export interface LocationTeamsResponse {
  teams: LocationTeam[]
}

/** @deprecated use LocationTeamsResponse */
export type LocationRolesResponse = LocationTeamsResponse

export interface EnableTeamRequest {
  teamId: string
  effectiveFrom: string
  effectiveTo?: string | null
}

/** @deprecated use EnableTeamRequest */
export type EnableRoleRequest = EnableTeamRequest

export async function getLocationTeams(locationId: string): Promise<LocationTeamsResponse> {
  return apiFetch<LocationTeamsResponse>(`/api/locations/${locationId}/teams`)
}

/** @deprecated use getLocationTeams */
export const getLocationRoles = getLocationTeams

export async function enableLocationTeam(
  locationId: string,
  data: EnableTeamRequest
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/locations/${locationId}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/** @deprecated use enableLocationTeam */
export const enableLocationRole = enableLocationTeam

export async function disableLocationTeam(
  locationId: string,
  teamId: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/locations/${locationId}/teams/${teamId}`, {
    method: 'DELETE',
  })
}

/** @deprecated use disableLocationTeam */
export const disableLocationRole = disableLocationTeam