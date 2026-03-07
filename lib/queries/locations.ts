import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as locationsApi from '@/lib/api/locations'

// Query keys
export const locationKeys = {
  all: ['locations'] as const,
  roles: (locationId: string) => [...locationKeys.all, locationId, 'roles'] as const,
}

// Get roles for a location
export function useLocationRoles(locationId: string | null) {
  return useQuery({
    queryKey: locationKeys.roles(locationId || ''),
    queryFn: () => locationsApi.getLocationRoles(locationId!),
    enabled: !!locationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Enable role for location
export function useEnableLocationRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: locationsApi.EnableRoleRequest }) =>
      locationsApi.enableLocationRole(locationId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.roles(variables.locationId) })
    },
  })
}

// Disable role for location
export function useDisableLocationRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ locationId, roleId }: { locationId: string; roleId: string }) =>
      locationsApi.disableLocationRole(locationId, roleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.roles(variables.locationId) })
    },
  })
}