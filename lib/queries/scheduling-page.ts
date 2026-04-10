import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { IUserSchedulingSettings } from "@/lib/db/schemas/user"
import { autoFillRoster, publishRosterScoped } from "@/lib/api/rosters"

export const schedulingPageKeys = {
  locationTeams: (locationId: string) => ["scheduling", "locationTeams", locationId] as const,
  templates: ["scheduling", "templates"] as const,
  userSchedulingSettings: ["scheduling", "userSettings"] as const,
}

export function useLocationTeamsForScheduling(locationId: string | null) {
  return useQuery({
    queryKey: locationId ? schedulingPageKeys.locationTeams(locationId) : ["scheduling", "locationTeams", "none"],
    queryFn: async () => {
      const res = await fetch(`/api/locations/${locationId}/teams`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load location teams")
      return res.json() as Promise<{ teams: Array<{ teamId: string; teamName: string }> }>
    },
    enabled: !!locationId,
    staleTime: 60_000,
  })
}

/** @deprecated use useLocationTeamsForScheduling */
export const useLocationRolesForScheduling = useLocationTeamsForScheduling

export function useSchedulingTemplates() {
  return useQuery({
    queryKey: schedulingPageKeys.templates,
    queryFn: async () => {
      const res = await fetch("/api/scheduling/templates", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load templates")
      return res.json() as Promise<{ templates: unknown[] }>
    },
    staleTime: 60_000,
  })
}

export function useUserSchedulingSettings() {
  return useQuery({
    queryKey: schedulingPageKeys.userSchedulingSettings,
    queryFn: async () => {
      const res = await fetch("/api/users/me/scheduling-settings", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load scheduling settings")
      return res.json() as Promise<{ schedulingSettings: IUserSchedulingSettings | null }>
    },
    staleTime: 60_000,
  })
}

export function usePatchSchedulingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: IUserSchedulingSettings) => {
      const res = await fetch("/api/users/me/scheduling-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Save failed")
      }
      return res.json() as Promise<{ schedulingSettings: IUserSchedulingSettings }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schedulingPageKeys.userSchedulingSettings })
    },
  })
}

export function useAutoFillRoster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      weekId: string
      locationId: string
      managedRoles: string[]
      employmentTypes?: Array<"FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACT">
      replaceDrafts?: boolean
    }) => {
      const r = (await autoFillRoster(args.weekId, {
        locationId: args.locationId,
        managedRoles: args.managedRoles,
        employmentTypes: args.employmentTypes,
        replaceDrafts: args.replaceDrafts,
      })) as { successCount?: number; skippedCount?: number; failureCount?: number; error?: string }
      if (typeof r.successCount !== "number") {
        throw new Error(r.error || "Auto-fill failed")
      }
      return r
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] })
    },
  })
}

export function usePublishRosterScoped() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { weekId: string; locationId: string; roleIds: string[] }) => {
      const r = (await publishRosterScoped(args.weekId, {
        locationId: args.locationId,
        roleIds: args.roleIds,
      })) as { message?: string; publishedCount?: number; error?: string }
      if (r.error) {
        throw new Error(r.error)
      }
      return r
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] })
    },
  })
}
