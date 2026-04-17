import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useLabourCost(locationId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["labour-cost", locationId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (locationId) params.set("locationId", locationId)
      if (startDate) params.set("from", startDate)
      if (endDate) params.set("to", endDate)

      const res = await fetch(`/api/analytics/labour-cost?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch labour cost data")
      const data = await res.json()
      return data.breakdown ?? []
    },
    enabled: !!locationId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useGenerateLabourCostAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { locationId: string; from: string; to: string }) => {
      const searchParams = new URLSearchParams({
        locationId: params.locationId,
        from: params.from,
        to: params.to,
      })
      const res = await fetch(`/api/analytics/labour-cost?${searchParams.toString()}`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to generate analysis")
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["labour-cost", variables.locationId],
      })
      toast.success("Labour cost analysis generated")
    },
    onError: () => {
      toast.error("Failed to generate labour cost analysis")
    },
  })
}
