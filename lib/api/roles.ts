import { apiFetch } from './fetch-client'
import type { CreateRoleRequest, Role, UpdateRoleRequest } from '@/lib/types'

export interface RolesResponse {
  roles: Role[]
}

export interface RoleResponse {
  role: Role
}

export async function getAll(): Promise<RolesResponse> {
  return apiFetch<RolesResponse>('/api/roles', {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
}

export async function getOne(id: string): Promise<RoleResponse> {
  return apiFetch<RoleResponse>(`/api/roles/${id}`)
}

export async function create(data: CreateRoleRequest): Promise<RoleResponse> {
  return apiFetch<RoleResponse>('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function update(id: string, data: UpdateRoleRequest): Promise<RoleResponse> {
  return apiFetch<RoleResponse>(`/api/roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function remove(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/roles/${id}`, { method: 'DELETE' })
}

const baseUrl = "/api/roles"

export async function getRolesAvailability(params?: {
  locationId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.locationId) searchParams.set("locationId", params.locationId)

  const url = searchParams.toString() ? `${baseUrl}/availability?${searchParams}` : `${baseUrl}/availability`
  return apiFetch(url)
}