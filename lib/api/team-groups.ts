import type { CreateTeamGroupRequest, TeamGroup, UpdateTeamGroupRequest } from '@/lib/types'
import { apiFetch } from './fetch-client'

export interface TeamGroupsResponse {
  teamGroups: TeamGroup[]
}

export interface TeamGroupResponse {
  teamGroup: TeamGroup
}

export async function getAll(): Promise<TeamGroupsResponse> {
  return apiFetch<TeamGroupsResponse>('/api/team-groups', {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
}

export async function getOne(id: string): Promise<TeamGroupResponse> {
  return apiFetch<TeamGroupResponse>(`/api/team-groups/${id}`, {
    cache: 'no-store',
  })
}

export async function create(data: CreateTeamGroupRequest): Promise<TeamGroupResponse> {
  return apiFetch<TeamGroupResponse>('/api/team-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function update(id: string, data: UpdateTeamGroupRequest): Promise<TeamGroupResponse> {
  return apiFetch<TeamGroupResponse>(`/api/team-groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function remove(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/team-groups/${id}`, {
    method: 'DELETE',
  })
}
