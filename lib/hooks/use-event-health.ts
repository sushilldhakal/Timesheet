import { useQuery } from "@tanstack/react-query"

export type EventHealthData = {
  unprocessed: number
  retryExceeded: number
  total24h: number
  processed24h: number
  failureRate: number
  recentFailures: Array<{
    _id: string
    eventId: string
    eventType: string
    entityId: string
    entityType: string
    actorId?: string
    payload: Record<string, unknown>
    failedListeners: string[]
    retryCount: number
    occurredAt: string
    nextRetryAt?: string
  }>
}

export function useEventHealth() {
  return useQuery<EventHealthData>({
    queryKey: ["event-health"],
    queryFn: async () => {
      const res = await fetch("/api/admin/event-health")
      if (!res.ok) throw new Error("Failed to fetch event health")
      return res.json()
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })
}
