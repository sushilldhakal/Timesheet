import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type WindowType = "weekly" | "fortnightly" | "roster_cycle" | "rolling_days"

export type PayPeriodConfig = {
  windowType: WindowType
  periodStartDayOfWeek?: number
  rosterCycleDays?: number
  rollingDays?: number
}

const DEFAULT_CONFIG: PayPeriodConfig = {
  windowType: "weekly",
  periodStartDayOfWeek: 1,
}

export function usePayPeriodConfig(employerId: string | undefined) {
  return useQuery<PayPeriodConfig>({
    queryKey: ["employer", employerId, "payPeriodConfig"],
    queryFn: async () => {
      const res = await fetch(`/api/employers/${employerId}`)
      if (!res.ok) throw new Error("Failed to fetch employer")
      const data = await res.json()
      return data.employer?.payPeriodConfig ?? DEFAULT_CONFIG
    },
    enabled: !!employerId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdatePayPeriodConfig(employerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: PayPeriodConfig) => {
      const res = await fetch(`/api/employers/${employerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payPeriodConfig: config }),
      })
      if (!res.ok) throw new Error("Failed to save configuration")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", employerId, "payPeriodConfig"] })
      toast.success("Compliance window configuration saved")
    },
    onError: () => {
      toast.error("Failed to save configuration")
    },
  })
}
