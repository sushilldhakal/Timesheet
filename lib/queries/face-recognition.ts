import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getBuddyPunchAlerts,
  getBuddyPunchAlert,
  updateBuddyPunchAlert,
  deleteBuddyPunchAlert,
  type AlertStatus,
  type BuddyPunchAlertFilters,
} from "@/lib/api/buddy-punch-alerts"
import {
  getFaceProfile,
  deleteFaceProfile,
  toggleFaceProfile,
} from "@/lib/api/face-profiles"

// ─── Query keys ───────────────────────────────────────────────────────────────

export const faceRecognitionKeys = {
  alerts:      (filters?: BuddyPunchAlertFilters) => ["buddy-punch-alerts", filters] as const,
  alert:       (id: string)                        => ["buddy-punch-alert", id] as const,
  faceProfile: (employeeId: string)                => ["face-profile", employeeId] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBuddyPunchAlerts(filters: BuddyPunchAlertFilters = {}) {
  return useQuery({
    queryKey: faceRecognitionKeys.alerts(filters),
    queryFn:  () => getBuddyPunchAlerts(filters),
  })
}

export function useBuddyPunchAlert(id: string) {
  return useQuery({
    queryKey: faceRecognitionKeys.alert(id),
    queryFn:  () => getBuddyPunchAlert(id),
    enabled:  !!id,
  })
}

export function useUpdateBuddyPunchAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: AlertStatus; notes?: string }) =>
      updateBuddyPunchAlert(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-punch-alerts"] })
    },
  })
}

export function useDeleteBuddyPunchAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBuddyPunchAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-punch-alerts"] })
    },
  })
}

export function useFaceProfile(employeeId: string) {
  return useQuery({
    queryKey: faceRecognitionKeys.faceProfile(employeeId),
    queryFn:  () => getFaceProfile(employeeId),
    enabled:  !!employeeId,
  })
}

export function useDeleteFaceProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => deleteFaceProfile(employeeId),
    onSuccess: (_, employeeId) => {
      queryClient.invalidateQueries({ queryKey: faceRecognitionKeys.faceProfile(employeeId) })
    },
  })
}

export function useToggleFaceProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, isActive }: { employeeId: string; isActive: boolean }) =>
      toggleFaceProfile(employeeId, isActive),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: faceRecognitionKeys.faceProfile(employeeId) })
    },
  })
}

// Re-export types for convenience
export type { AlertStatus, BuddyPunchAlertFilters }
