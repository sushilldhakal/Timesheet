import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as setupApi from '@/lib/api/setup'

// Query keys
export const setupKeys = {
  all: ['setup'] as const,
  status: () => [...setupKeys.all, 'status'] as const,
}

// Get setup status
export function useSetupStatus() {
  return useQuery({
    queryKey: setupKeys.status(),
    queryFn: setupApi.fetchSetupStatus,
    staleTime: 0, // Always fresh
    retry: 1, // Only retry once to avoid long delays
    retryDelay: 500, // Wait 500ms before retry
  })
}

// Create admin user
export function useCreateAdmin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: setupApi.createAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setupKeys.status() })
    },
  })
}