import type { CreateTeamGroupRequest, TeamGroup, UpdateTeamGroupRequest } from '@/lib/types'

export interface TeamGroupsResponse {
  teamGroups: TeamGroup[]
}

export interface TeamGroupResponse {
  teamGroup: TeamGroup
}

export async function getAll(): Promise<TeamGroupsResponse> {
  const response = await fetch('/api/team-groups', {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Failed to fetch team groups')
  }
  return response.json()
}

export async function getOne(id: string): Promise<TeamGroupResponse> {
  const response = await fetch(`/api/team-groups/${id}`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || 'Failed to fetch team group')
  }
  return response.json()
}

export async function create(data: CreateTeamGroupRequest): Promise<TeamGroupResponse> {
  const response = await fetch('/api/team-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { error?: string }).error || 'Failed to create team group')
  }

  return response.json()
}

export async function update(id: string, data: UpdateTeamGroupRequest): Promise<TeamGroupResponse> {
  const response = await fetch(`/api/team-groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { error?: string }).error || 'Failed to update team group')
  }

  return response.json()
}

export async function remove(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/team-groups/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { error?: string }).error || 'Failed to delete team group')
  }

  return response.json()
}
