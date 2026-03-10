import type { FlagIssueType, FlagRow } from "@/lib/types/flags"

export interface FlagsResponse {
  items: FlagRow[]
  total: number
}

export interface FlagsFilters {
  limit?: number
  offset?: number
  filter?: FlagIssueType
  sortBy?: string
  order?: 'asc' | 'desc'
}

// Get flags with filters
export async function getFlags(filters: FlagsFilters = {}): Promise<FlagsResponse> {
  const params = new URLSearchParams()
  
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  if (filters.filter) params.set('filter', filters.filter)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.order) params.set('order', filters.order)
  
  const response = await fetch(`/api/flags?${params.toString()}`, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch flags')
  }
  
  return response.json()
}