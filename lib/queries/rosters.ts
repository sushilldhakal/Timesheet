import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as rostersApi from '@/lib/api/rosters'

// Query keys
export const rosterKeys = {
  all: ['rosters'] as const,
  week: (weekId: string) => [...rosterKeys.all, 'week', weekId] as const,
}

// Get roster for a specific week
export function useRoster(weekId: string) {
  return useQuery({
    queryKey: rosterKeys.week(weekId),
    queryFn: () => rostersApi.getRoster(weekId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create a new roster
export function useCreateRoster() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: rostersApi.createRoster,
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(rosterKeys.week(data.data.weekId), data)
        queryClient.invalidateQueries({ queryKey: rosterKeys.all })
      }
    },
  })
}

// Add a shift to a roster
export function useAddShift() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ weekId, data }: { weekId: string; data: rostersApi.AddShiftRequest }) =>
      rostersApi.addShift(weekId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.week(variables.weekId) })
    },
  })
}

// Update a shift in a roster
export function useUpdateShift() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      weekId, 
      shiftId, 
      data 
    }: { 
      weekId: string
      shiftId: string
      data: rostersApi.UpdateShiftRequest 
    }) => rostersApi.updateShift(weekId, shiftId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.week(variables.weekId) })
    },
  })
}

// Delete a shift from a roster
export function useDeleteShift() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ weekId, shiftId }: { weekId: string; shiftId: string }) =>
      rostersApi.deleteShift(weekId, shiftId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.week(variables.weekId) })
    },
  })
}

// Publish a roster
export function usePublishRoster() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: rostersApi.publishRosterAll,
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(rosterKeys.week(data.data.weekId), data)
        queryClient.invalidateQueries({ queryKey: rosterKeys.all })
      }
    },
  })
}

// Generate roster from schedules or copy from previous week
export function useGenerateRoster() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: rostersApi.generateRoster,
    onSuccess: (data) => {
      if (data.success && data.data) {
        queryClient.setQueryData(rosterKeys.week(data.data.weekId), data)
        queryClient.invalidateQueries({ queryKey: rosterKeys.all })
      }
    },
  })
}