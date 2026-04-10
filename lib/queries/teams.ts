import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as teamsApi from '@/lib/api/teams'
import type { UpdateTeamRequest } from '@/lib/types'

export const teamKeys = {
  all: ['teams'] as const,
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
}

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => teamsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => teamsApi.getOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamRequest }) =>
      teamsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.id) })
    },
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: teamsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}

export function useTeamsAvailability(params?: {
  locationId?: string
}) {
  return useQuery({
    queryKey: ["teams", "availability", params],
    queryFn: () => teamsApi.getTeamsAvailability(params),
    enabled: !!params?.locationId,
    gcTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}
