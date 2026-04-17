import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type ComplianceViolation = {
  _id: string
  employeeId: string
  ruleId: string
  shiftId?: string
  severity: "warning" | "breach"
  ruleType: string
  message: string
  detectedAt: string
  resolvedAt?: string
  resolutionAction?: string
  isActive: boolean
}

export type ViolationFilters = {
  employeeId?: string
  severity?: "warning" | "breach"
  from?: string
}

export function useComplianceViolations(filters?: ViolationFilters) {
  return useQuery<ComplianceViolation[]>({
    queryKey: ["compliance-violations", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.employeeId) params.set("employeeId", filters.employeeId)
      if (filters?.severity) params.set("severity", filters.severity)
      if (filters?.from) params.set("from", filters.from)

      const res = await fetch(`/api/compliance/violations?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch compliance violations")
      const data = await res.json()
      return data.violations ?? []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })
}

export function useResolveViolation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      action: "manual_override" | "shift_edited" | "auto_resolved"
      notes?: string
    }) => {
      const res = await fetch(`/api/compliance/violations/${params.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: params.action, notes: params.notes }),
      })
      if (!res.ok) throw new Error("Failed to resolve violation")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-violations"] })
      toast.success("Violation resolved")
    },
    onError: () => {
      toast.error("Failed to resolve violation")
    },
  })
}
