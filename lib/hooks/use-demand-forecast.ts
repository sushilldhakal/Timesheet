import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useDemandForecasts(locationId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["demand-forecast", locationId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (locationId) params.set("locationId", locationId)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await fetch(`/api/demand-forecast?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch demand forecasts")
      const data = await res.json()
      return data.forecasts ?? []
    },
    enabled: !!locationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

export function useGenerateForecast() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      locationId: string
      targetDate: string
      historicalWeeks?: number
    }) => {
      const res = await fetch("/api/demand-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error("Failed to generate forecast")
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["demand-forecast", variables.locationId],
      })
      toast.success("Demand forecast generated")
    },
    onError: () => {
      toast.error("Failed to generate demand forecast")
    },
  })
}

export function useRosterSuggestions(locationId?: string, weekStartDate?: string) {
  return useQuery({
    queryKey: ["roster-suggestions", locationId, weekStartDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (locationId) params.set("locationId", locationId)
      if (weekStartDate) params.set("weekStartDate", weekStartDate)

      const res = await fetch(`/api/demand-forecast/roster-suggestions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch roster suggestions")
      const data = await res.json()
      return data.suggestions ?? []
    },
    enabled: !!locationId && !!weekStartDate,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useGenerateRosterSuggestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { locationId: string; weekStartDate: string }) => {
      const res = await fetch("/api/demand-forecast/roster-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to generate suggestions")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["roster-suggestions", variables.locationId],
      })
      toast.success("Roster suggestions generated")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate roster suggestions")
    },
  })
}
