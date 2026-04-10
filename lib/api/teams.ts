import type { CreateTeamRequest, Team, UpdateTeamRequest } from '@/lib/types'

export interface TeamsResponse {
  teams: Team[]
}

export interface TeamResponse {
  team: Team
}

export async function getAll(): Promise<TeamsResponse> {
  const response = await fetch('/api/teams', {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Failed to fetch teams')
  }
  return response.json()
}

export async function getOne(id: string): Promise<TeamResponse> {
  const response = await fetch(`/api/teams/${id}`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Failed to fetch team')
  }
  return response.json()
}

export async function create(data: CreateTeamRequest): Promise<TeamResponse> {
  const response = await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { error?: string }).error || 'Failed to create team')
  }

  return response.json()
}

export async function update(id: string, data: UpdateTeamRequest): Promise<TeamResponse> {
  const response = await fetch(`/api/teams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { error?: string }).error || 'Failed to update team')
  }

  return response.json()
}

export async function remove(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/teams/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { error?: string }).error || 'Failed to delete team')
  }

  return response.json()
}

const baseUrl = '/api/teams'

export async function getTeamsAvailability(params?: { locationId?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.locationId) searchParams.set('locationId', params.locationId)

  const url = searchParams.toString()
    ? `${baseUrl}/availability?${searchParams}`
    : `${baseUrl}/availability`

  const response = await fetch(url, { credentials: 'include', cache: 'no-store' })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Failed to fetch team availability')
  }
  return response.json()
}
