import type { CreateEmployerRequest, Employer, UpdateEmployerRequest } from '@/lib/types'
import { apiFetch } from './fetch-client'

export interface EmployerSettings {
  enableExternalHire?: boolean
  [key: string]: unknown
}

export interface EmployersResponse {
  employers: Employer[]
}

export interface EmployerResponse {
  employer: Employer
}

export async function getAll(): Promise<EmployersResponse> {
  return apiFetch<EmployersResponse>('/api/employers', {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })
}

export async function getOne(id: string): Promise<EmployerResponse> {
  return apiFetch<EmployerResponse>(`/api/employers/${id}`)
}

export async function create(data: CreateEmployerRequest): Promise<EmployerResponse> {
  return apiFetch<EmployerResponse>('/api/employers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function update(id: string, data: UpdateEmployerRequest): Promise<EmployerResponse> {
  return apiFetch<EmployerResponse>(`/api/employers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function remove(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/employers/${id}`, {
    method: 'DELETE',
  })
}

// Employer org-level settings

export async function getEmployerSettings(): Promise<EmployerSettings> {
  return apiFetch<EmployerSettings>('/api/employers/settings')
}

export async function updateEmployerSettings(
  data: Partial<EmployerSettings>
): Promise<EmployerSettings> {
  return apiFetch<EmployerSettings>('/api/employers/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

