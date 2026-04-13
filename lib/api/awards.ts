import { ApiResponse } from '@/lib/utils/api/api-response'

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
  levels: any[]
  createdAt: string
  updatedAt: string
}

export interface CreateAwardRequest {
  name: string
  description?: string
  isActive?: boolean
  levelRates?: AwardLevelRate[]
  levels?: any[]
}

export interface UpdateAwardRequest {
  name?: string
  description?: string
  isActive?: boolean
  levelRates?: AwardLevelRate[]
  levels?: any[]
}

// Get all awards
export async function getAwards(): Promise<{ awards: Award[] }> {
  const response = await fetch(BASE_URL, {
    credentials: 'include',
  })
  return response.json()
}

// Get award by ID
export async function getAward(id: string): Promise<ApiResponse<Award>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    credentials: 'include',
  })
  return response.json()
}

// Create award
export async function createAward(data: CreateAwardRequest): Promise<ApiResponse<Award>> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Update award
export async function updateAward(id: string, data: UpdateAwardRequest): Promise<ApiResponse<Award>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Delete award
export async function deleteAward(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return response.json()
}