import { apiFetch } from './fetch-client'

const BASE_URL = '/api/scheduling/templates'

export interface SchedulingTemplate {
  _id?: string
  id?: string
  weekId: string
  name: string
  data: any
  createdAt?: string
  updatedAt?: string
}

export interface CreateTemplateRequest {
  weekId: string
  name: string
  data: any
}

export interface ApplyTemplateRequest {
  weekId: string
  data: any
}

// Save a scheduling template
export async function saveSchedulingTemplate(data: CreateTemplateRequest): Promise<{ template: SchedulingTemplate }> {
  return apiFetch<{ template: SchedulingTemplate }>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

// Delete a scheduling template
export async function deleteSchedulingTemplate(templateId: string): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${templateId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

// Apply a scheduling template
export async function applySchedulingTemplate(templateId: string, data: ApplyTemplateRequest): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${templateId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}
