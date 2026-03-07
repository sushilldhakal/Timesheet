import { useQuery } from '@tanstack/react-query'
import * as flagsApi from '@/lib/api/flags'

// Query keys
export const flagKeys = {
  all: ['flags'] as const,
  filtered: (filters: flagsApi.FlagsFilters) => [...flagKeys.all, 'filtered', filters] as const,
}

// Get flags with filters
export function useFlags(filters: flagsApi.FlagsFilters = {}) {
  return useQuery({
    queryKey: flagKeys.filtered(filters),
    queryFn: () => flagsApi.getFlags(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}