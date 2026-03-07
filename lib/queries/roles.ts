import { useQuery } from "@tanstack/react-query"
import * as rolesApi from "@/lib/api/roles"

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