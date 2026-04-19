import { apiFetch } from './fetch-client'

export interface AwardTag {
  id: string
  name: string
  description?: string
  color?: string
  isActive: boolean
}

export interface AwardTagsResponse {
  awardTags: AwardTag[]
}

// Get all award tags
export async function getAwardTags(): Promise<AwardTagsResponse> {
  return apiFetch<AwardTagsResponse>('/api/award-tags')
}