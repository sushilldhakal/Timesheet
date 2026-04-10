import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as teamGroupsApi from '@/lib/api/team-groups'
import type { UpdateTeamGroupRequest } from '@/lib/types'

export const teamGroupKeys = {
  all: ['teamGroups'] as const,
  detail: (id: string) => [...teamGroupKeys.all, 'detail', id] as const,
}

type UseTeamGroupsOpts = { /** Admin pages: refetch on every visit so list matches DB */ listMode?: boolean }

export function useTeamGroups(opts?: UseTeamGroupsOpts) {
  const listMode = opts?.listMode === true
  return useQuery({
    queryKey: teamGroupKeys.all,
    queryFn: () => teamGroupsApi.getAll(),
    staleTime: listMode ? 0 : 5 * 60 * 1000,
    refetchOnMount: listMode ? 'always' : true,
  })
}

export function useTeamGroup(id: string) {
  return useQuery({
    queryKey: teamGroupKeys.detail(id),
    queryFn: () => teamGroupsApi.getOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTeamGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: teamGroupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamGroupKeys.all })
    },
  })
}

export function useUpdateTeamGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamGroupRequest }) =>
      teamGroupsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teamGroupKeys.all })
      queryClient.invalidateQueries({ queryKey: teamGroupKeys.detail(variables.id) })
    },
  })
}

export function useDeleteTeamGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: teamGroupsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamGroupKeys.all })
    },
  })
}
