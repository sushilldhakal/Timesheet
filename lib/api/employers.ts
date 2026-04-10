import type { CreateEmployerRequest, Employer, UpdateEmployerRequest } from '@/lib/types'

export interface EmployersResponse {
  employers: Employer[]
}

export interface EmployerResponse {
  employer: Employer
}

export async function getAll(): Promise<EmployersResponse> {
  const response = await fetch('/api/employers', {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })

  if (!response.ok) throw new Error('Failed to fetch employers')
  return response.json()
}

export async function getOne(id: string): Promise<EmployerResponse> {
  const response = await fetch(`/api/employers/${id}`, {
    credentials: 'include',
  })

  if (!response.ok) throw new Error('Failed to fetch employer')
  return response.json()
}

export async function create(data: CreateEmployerRequest): Promise<EmployerResponse> {
  const response = await fetch('/api/employers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create employer')
  }

  return response.json()
}

export async function update(id: string, data: UpdateEmployerRequest): Promise<EmployerResponse> {
  const response = await fetch(`/api/employers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to update employer')
  }

  return response.json()
}

export async function remove(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/employers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete employer')
  }

  return response.json()
}

