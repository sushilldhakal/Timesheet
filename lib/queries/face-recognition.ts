import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertStatus = "pending" | "confirmed_buddy" | "dismissed" | "false_alarm"

export interface BuddyPunchAlertFilters {
  status?: AlertStatus
  employeeId?: string
  locationId?: string
  page?: number
  limit?: number
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchAlerts(filters: BuddyPunchAlertFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status)     params.set("status", filters.status)
  if (filters.employeeId) params.set("employeeId", filters.employeeId)
  if (filters.locationId) params.set("locationId", filters.locationId)
  if (filters.page)       params.set("page", String(filters.page))
  if (filters.limit)      params.set("limit", String(filters.limit))

  const res = await fetch(`/api/buddy-punch-alerts?${params}`)
  if (!res.ok) throw new Error("Failed to fetch alerts")
  return res.json()
}

async function fetchAlert(id: string) {
  const res = await fetch(`/api/buddy-punch-alerts/${id}`)
  if (!res.ok) throw new Error("Failed to fetch alert")
  return res.json()
}

async function updateAlert(id: string, status: AlertStatus, notes?: string) {
  const res = await fetch(`/api/buddy-punch-alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  })
  if (!res.ok) throw new Error("Failed to update alert")
  return res.json()
}

async function deleteAlert(id: string) {
  const res = await fetch(`/api/buddy-punch-alerts/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete alert")
  return res.json()
}

async function fetchFaceProfile(employeeId: string) {
  const res = await fetch(`/api/face-profiles/${employeeId}`)
  if (!res.ok) throw new Error("Failed to fetch face profile")
  return res.json()
}

async function deleteFaceProfile(employeeId: string) {
  const res = await fetch(`/api/face-profiles/${employeeId}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete face profile")
  return res.json()
}

async function toggleFaceProfile(employeeId: string, isActive: boolean) {
  const res = await fetch(`/api/face-profiles/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  })
  if (!res.ok) throw new Error("Failed to toggle face profile")
  return res.json()
}

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
    queryFn:  () => fetchAlerts(filters),
  })
}

export function useBuddyPunchAlert(id: string) {
  return useQuery({
    queryKey: faceRecognitionKeys.alert(id),
    queryFn:  () => fetchAlert(id),
    enabled:  !!id,
  })
}

export function useUpdateBuddyPunchAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: AlertStatus; notes?: string }) =>
      updateAlert(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-punch-alerts"] })
    },
  })
}

export function useDeleteBuddyPunchAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-punch-alerts"] })
    },
  })
}

export function useFaceProfile(employeeId: string) {
  return useQuery({
    queryKey: faceRecognitionKeys.faceProfile(employeeId),
    queryFn:  () => fetchFaceProfile(employeeId),
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
