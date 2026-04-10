import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as locationsApi from '@/lib/api/locations'
import type { UpdateLocationRequest } from '@/lib/types'

export const locationKeys = {
  all: ['locations'] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
  roles: (locationId: string) => [...locationKeys.all, locationId, 'roles'] as const,
}

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: () => locationsApi.getAll(),
    staleTime: 5 * 60 * 1000,
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

export function useLocationRoles(locationId: string | null) {
  return useQuery({
    queryKey: locationKeys.roles(locationId || ''),
    queryFn: () => locationsApi.getLocationRoles(locationId!),
    enabled: !!locationId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useEnableLocationRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      locationId,
      data,
    }: {
      locationId: string
      data: locationsApi.EnableRoleRequest
    }) => locationsApi.enableLocationRole(locationId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.roles(variables.locationId) })
    },
  })
}

export function useDisableLocationRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ locationId, roleId }: { locationId: string; roleId: string }) =>
      locationsApi.disableLocationRole(locationId, roleId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.roles(variables.locationId) })
    },
  })
}