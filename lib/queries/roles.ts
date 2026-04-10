import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as rolesApi from '@/lib/api/roles'
import type { UpdateRoleRequest } from '@/lib/types'

export const roleKeys = {
  all: ['roles'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
}

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.all,
    queryFn: () => rolesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesApi.getOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      rolesApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rolesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export function useRolesAvailability(params?: {
  locationId?: string
}) {
  return useQuery({
    queryKey: ["roles", "availability", params],
    queryFn: () => rolesApi.getRolesAvailability(params),
    enabled: !!params?.locationId,
    gcTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}