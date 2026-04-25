import { apiFetch } from './fetch-client'

export type AlertStatus = "pending" | "confirmed_buddy" | "dismissed" | "false_alarm"

export interface BuddyPunchAlertFilters {
  status?: AlertStatus
  employeeId?: string
  locationId?: string
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}

export interface BuddyPunchAlert {
  id: string
  status: AlertStatus
  employeeId: string
  locationId: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Get buddy punch alerts with filters
export async function getBuddyPunchAlerts(filters: BuddyPunchAlertFilters = {}): Promise<{ alerts: BuddyPunchAlert[] }> {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.employeeId) params.set("employeeId", filters.employeeId)
  if (filters.locationId) params.set("locationId", filters.locationId)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  if (filters.startDate) params.set("startDate", filters.startDate)
  if (filters.endDate) params.set("endDate", filters.endDate)

  return apiFetch<{ alerts: BuddyPunchAlert[] }>(`/api/buddy-punch-alerts?${params}`)
}

// Get single buddy punch alert
export async function getBuddyPunchAlert(id: string): Promise<{ alert: BuddyPunchAlert }> {
  return apiFetch<{ alert: BuddyPunchAlert }>(`/api/buddy-punch-alerts/${id}`)
}

// Update buddy punch alert
export async function updateBuddyPunchAlert(id: string, status: AlertStatus, notes?: string): Promise<{ alert: BuddyPunchAlert }> {
  return apiFetch<{ alert: BuddyPunchAlert }>(`/api/buddy-punch-alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  })
}

// Delete buddy punch alert
export async function deleteBuddyPunchAlert(id: string): Promise<void> {
  return apiFetch<void>(`/api/buddy-punch-alerts/${id}`, { method: "DELETE" })
}