import type { CreateRoleRequest, Role, UpdateRoleRequest } from '@/lib/types'

export interface RolesResponse {
  roles: Role[]
}

export interface RoleResponse {
  role: Role
}

export async function getAll(): Promise<RolesResponse> {
  const response = await fetch('/api/roles', {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })

  if (!response.ok) throw new Error('Failed to fetch roles')
  return response.json()
}

export async function getOne(id: string): Promise<RoleResponse> {
  const response = await fetch(`/api/roles/${id}`, {
    credentials: 'include',
  })

  if (!response.ok) throw new Error('Failed to fetch role')
  return response.json()
}

export async function create(data: CreateRoleRequest): Promise<RoleResponse> {
  const response = await fetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create role')
  }

  return response.json()
}

export async function update(id: string, data: UpdateRoleRequest): Promise<RoleResponse> {
  const response = await fetch(`/api/roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to update role')
  }

  return response.json()
}

export async function remove(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/roles/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete role')
  }

  return response.json()
}

const baseUrl = "/api/roles"

export async function getRolesAvailability(params?: {
  locationId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.locationId) searchParams.set("locationId", params.locationId)

  const url = searchParams.toString() ? `${baseUrl}/availability?${searchParams}` : `${baseUrl}/availability`
  const response = await fetch(url, {
    credentials: "include",
  })
  return response.json()
}