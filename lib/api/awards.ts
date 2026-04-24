import { apiFetch } from './fetch-client'

const BASE_URL = '/api/awards'

export interface AwardLevelRate {
  level: string
  employmentType: 'casual' | 'part_time' | 'full_time'
  hourlyRate: number
  effectiveFrom: string
  effectiveTo?: string | null
}

export interface Award {
  _id: string
  name: string
  description: string | null
  isActive: boolean
  levelRates: AwardLevelRate[]
  rules: any[]
  availableTags?: { name: string; description?: string }[]
  awardTagIds?: string[]
  version?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAwardRequest {
  name: string
  description?: string
  isActive?: boolean
  levelRates?: AwardLevelRate[]
  rules?: any[]
}

export interface UpdateAwardRequest {
  name?: string
  description?: string
  isActive?: boolean
  levelRates?: AwardLevelRate[]
  rules?: any[]
}

export interface AwardVersion {
  _id: string
  name: string
  description?: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  changelog: string | null
  isCurrent: boolean
  rules: any[]
  levelRates: any[]
  availableTags: any[]
  createdAt?: string
  createdBy?: string
}

export interface EvaluateRulesRequest {
  awardId: string
  shiftDate: string
  startTime: string
  endTime: string
  startWallClock?: string
  endWallClock?: string
  employmentType: string
  awardTags?: string[]
  isPublicHoliday?: boolean
  dailyHoursWorked?: number
  weeklyHoursWorked?: number
}

// Get all awards
export async function getAwards(): Promise<{ awards: Award[] }> {
  return apiFetch<{ awards: Award[] }>(BASE_URL)
}

// Get award by ID
export async function getAward(id: string): Promise<{ award: Award }> {
  return apiFetch<{ award: Award }>(`${BASE_URL}/${encodeURIComponent(id)}`)
}

// Create award
export async function createAward(data: CreateAwardRequest): Promise<{ award: Award }> {
  return apiFetch<{ award: Award }>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update award
export async function updateAward(id: string, data: UpdateAwardRequest): Promise<{ award: Award }> {
  return apiFetch<{ award: Award }>(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete award
export async function deleteAward(id: string): Promise<void> {
  return apiFetch<void>(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// Get award versions
export async function getAwardVersions(awardId: string): Promise<{ versions: AwardVersion[] }> {
  return apiFetch<{ versions: AwardVersion[] }>(`${BASE_URL}/${encodeURIComponent(awardId)}/versions`)
}

// Create a new award version
export async function createAwardVersion(
  awardId: string,
  data: { changelog: string; effectiveFrom: string; versionBump: 'major' | 'minor' | 'patch' },
): Promise<{ version: AwardVersion }> {
  return apiFetch<{ version: AwardVersion }>(`${BASE_URL}/${encodeURIComponent(awardId)}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Evaluate award rules for a shift scenario
export async function evaluateAwardRules(data: EvaluateRulesRequest): Promise<any> {
  return apiFetch<any>(`${BASE_URL}/evaluate-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Get rule templates
export async function getRuleTemplates(params?: { search?: string; category?: string }): Promise<{ templates: any[] }> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.category) searchParams.set('category', params.category)
  const qs = searchParams.toString()
  return apiFetch<{ templates: any[] }>(`/api/rule-templates${qs ? `?${qs}` : ''}`)
}

// Create rule template
export async function createRuleTemplate(data: any): Promise<any> {
  return apiFetch<any>('/api/rule-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update rule template
export async function updateRuleTemplate(id: string, data: any): Promise<any> {
  return apiFetch<any>(`/api/rule-templates/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete rule template
export async function deleteRuleTemplate(id: string): Promise<void> {
  return apiFetch<void>(`/api/rule-templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
