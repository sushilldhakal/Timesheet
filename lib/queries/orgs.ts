import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrgs, switchOrg, selectOrg } from '@/lib/api/orgs'

export function useOrgs() {
  return useQuery({
    queryKey: ['auth', 'orgs'],
    queryFn: () => getOrgs().then((r) => r.orgs),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSwitchOrg() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: switchOrg,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function useSelectOrg() {
  return useMutation({
    mutationFn: selectOrg,
  })
}
