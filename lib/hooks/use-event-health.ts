import { useQuery } from "@tanstack/react-query"
import { getEventHealth } from "@/lib/api/admin"
import type { EventHealthData } from "@/lib/api/admin"

export type { EventHealthData }

export function useEventHealth() {
  return useQuery<EventHealthData>({
    queryKey: ["event-health"],
    queryFn: getEventHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })
}
