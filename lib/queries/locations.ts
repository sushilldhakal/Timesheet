import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as locationsApi from '@/lib/api/locations'
import type { UpdateLocationRequest } from '@/lib/types'

export const locationKeys = {
  all: ['locations'] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
  teams: (locationId: string) => [...locationKeys.all, locationId, 'teams'] as const,
}

type UseLocationsOpts = { listMode?: boolean; enabled?: boolean }

export function useLocations(opts?: UseLocationsOpts) {
  const listMode = opts?.listMode === true
  const enabled = opts?.enabled !== undefined ? opts.enabled : true
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: () => locationsApi.getAll(),
    enabled,
    staleTime: listMode ? 0 : 5 * 60 * 1000,
    refetchOnMount: listMode ? 'always' : true,
  })
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => locationsApi.getOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationRequest }) =>
      locationsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: locationsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
    },
  })
}

export function useLocationTeams(locationId: string | null) {
  return useQuery({
    queryKey: locationKeys.teams(locationId || ''),
    queryFn: () => locationsApi.getLocationTeams(locationId!),
    enabled: !!locationId,
    staleTime: 2 * 60 * 1000,
  })
}

/** @deprecated use useLocationTeams */
export const useLocationRoles = useLocationTeams

export function useEnableLocationTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      locationId,
      data,
    }: {
      locationId: string
      data: locationsApi.EnableTeamRequest
    }) => locationsApi.enableLocationTeam(locationId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.teams(variables.locationId) })
    },
  })
}

/** @deprecated use useEnableLocationTeam */
export const useEnableLocationRole = useEnableLocationTeam

export function useDisableLocationTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ locationId, teamId }: { locationId: string; teamId: string }) =>
      locationsApi.disableLocationTeam(locationId, teamId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.teams(variables.locationId) })
    },
  })
}

/** @deprecated use useDisableLocationTeam */
export const useDisableLocationRole = useDisableLocationTeam