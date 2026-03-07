import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as shiftSwapsApi from '@/lib/api/shift-swaps'

// Query keys
export const shiftSwapKeys = {
  all: ['shift-swaps'] as const,
  list: (params?: { 
    status?: string
    requesterId?: string
    targetId?: string
    startDate?: string
    endDate?: string 
  }) => [...shiftSwapKeys.all, 'list', params] as const,
  detail: (id: string) => [...shiftSwapKeys.all, 'detail', id] as const,
}

// Get all shift swap requests
export function useShiftSwaps(params?: {
  status?: string
  requesterId?: string
  targetId?: string
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: shiftSwapKeys.list(params),
    queryFn: () => shiftSwapsApi.getShiftSwaps(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get a specific shift swap request
export function useShiftSwap(id: string) {
  return useQuery({
    queryKey: shiftSwapKeys.detail(id),
    queryFn: () => shiftSwapsApi.getShiftSwap(id),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Create a new shift swap request
export function useCreateShiftSwap() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: shiftSwapsApi.createShiftSwap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all })
    },
  })
}

// Respond to a shift swap request
export function useRespondToShiftSwap() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: shiftSwapsApi.RespondToShiftSwapRequest }) =>
      shiftSwapsApi.respondToShiftSwap(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all })
    },
  })
}

// Cancel a shift swap request
export function useCancelShiftSwap() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: shiftSwapsApi.cancelShiftSwap,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all })
    },
  })
}

// Delete a shift swap request
export function useDeleteShiftSwap() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: shiftSwapsApi.deleteShiftSwap,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: shiftSwapKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all })
    },
  })
}