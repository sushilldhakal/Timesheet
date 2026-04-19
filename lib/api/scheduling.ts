import { apiFetch } from './fetch-client'
import type { IUserSchedulingSettings } from "@/lib/db/schemas/user"

// Get teams for a location (for scheduling)
export async function getLocationTeams(locationId: string): Promise<{ teams: Array<{ teamId: string; teamName: string }> }> {
  return apiFetch<{ teams: Array<{ teamId: string; teamName: string }> }>(`/api/locations/${locationId}/teams`, {
    credentials: "include"
  })
}

// Get scheduling templates
export async function getSchedulingTemplates(): Promise<{ templates: unknown[] }> {
  return apiFetch<{ templates: unknown[] }>("/api/scheduling/templates", {
    credentials: "include"
  })
}

// Get user scheduling settings
export async function getUserSchedulingSettings(): Promise<{ schedulingSettings: IUserSchedulingSettings | null }> {
  return apiFetch<{ schedulingSettings: IUserSchedulingSettings | null }>("/api/users/me/scheduling-settings", {
    credentials: "include"
  })
}

// Update user scheduling settings
export async function updateUserSchedulingSettings(body: IUserSchedulingSettings): Promise<{ schedulingSettings: IUserSchedulingSettings }> {
  return apiFetch<{ schedulingSettings: IUserSchedulingSettings }>("/api/users/me/scheduling-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  })
}