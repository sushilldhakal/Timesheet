import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as awardsApi from '@/lib/api/awards'

// Query keys
export const awardKeys = {
  all: ['awards'] as const,
  detail: (id: string) => [...awardKeys.all, 'detail', id] as const,
}

// Get all awards
export function useAwards() {
  return useQuery({
    queryKey: awardKeys.all,
    queryFn: awardsApi.getAwards,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get award by ID
export function useAward(id: string) {
  return useQuery({
    queryKey: awardKeys.detail(id),
    queryFn: () => awardsApi.getAward(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create award
export function useCreateAward() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardsApi.createAward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.all })
    },
  })
}

// Update award
export function useUpdateAward() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: awardsApi.UpdateAwardRequest }) =>
      awardsApi.updateAward(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: awardKeys.all })
      queryClient.invalidateQueries({ queryKey: awardKeys.detail(variables.id) })
    },
  })
}

// Delete award
export function useDeleteAward() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: awardsApi.deleteAward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: awardKeys.all })
    },
  })
}