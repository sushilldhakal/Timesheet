import { useQuery } from "@tanstack/react-query"

export type ShiftEventAction =
  | "created" | "deleted" | "time_changed" | "break_changed"
  | "employee_changed" | "role_changed" | "location_changed" | "status_changed"
  | "pay_calculated" | "pay_approved" | "clocked_in" | "clocked_out"
  | "break_started" | "break_ended" | "multi_field_change"

export type ShiftHistoryEvent = {
  _id: string
  shiftId: string
  employeeId: string
  action: ShiftEventAction
  changedFields: string[]
  actorId: string
  actorType: "user" | "employee" | "system"
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  meta?: Record<string, unknown>
  occurredAt: string
}

export function useShiftHistory(shiftId: string | null | undefined) {
  return useQuery<{ events: ShiftHistoryEvent[]; count: number }>({
    queryKey: ["shift-history", shiftId],
    queryFn: async () => {
      const res = await fetch(`/api/shifts/${shiftId}/history`)
      if (!res.ok) throw new Error("Failed to load shift history")
      return res.json()
    },
    enabled: !!shiftId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
