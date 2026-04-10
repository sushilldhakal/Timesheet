import { apiFetch } from './fetch-client'
import type { CreateTeamRequest, Team, UpdateTeamRequest } from '@/lib/types'

export interface TeamsResponse {
  teams: Team[]
}

export interface TeamResponse {
  team: Team
}

export async function getAll(): Promise<TeamsResponse> {
  return apiFetch<TeamsResponse>('/api/teams', {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
}

export async function getOne(id: string): Promise<TeamResponse> {
  return apiFetch<TeamResponse>(`/api/teams/${id}`)
}

export async function create(data: CreateTeamRequest): Promise<TeamResponse> {
  return apiFetch<TeamResponse>('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function update(id: string, data: UpdateTeamRequest): Promise<TeamResponse> {
  return apiFetch<TeamResponse>(`/api/teams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function remove(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/teams/${id}`, { method: 'DELETE' })
}

const baseUrl = "/api/teams"

export async function getTeamsAvailability(params?: {
  locationId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.locationId) searchParams.set("locationId", params.locationId)

  const url = searchParams.toString() ? `${baseUrl}/availability?${searchParams}` : `${baseUrl}/availability`
  return apiFetch(url)
}
