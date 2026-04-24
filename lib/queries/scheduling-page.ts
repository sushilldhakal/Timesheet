import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { IUserSchedulingSettings } from "@/lib/db/schemas/user"
import { autoFillRoster, publishRosterScoped } from "@/lib/api/rosters"
import {
  getLocationTeams,
  getSchedulingTemplates,
  getUserSchedulingSettings,
  updateUserSchedulingSettings,
} from "@/lib/api/scheduling"

export const schedulingPageKeys = {
  locationTeams: (locationId: string) => ["scheduling", "locationTeams", locationId] as const,
  templates: ["scheduling", "templates"] as const,
  userSchedulingSettings: ["scheduling", "userSettings"] as const,
}

export function useLocationTeamsForScheduling(locationId: string | null) {
  return useQuery({
    queryKey: locationId ? schedulingPageKeys.locationTeams(locationId) : ["scheduling", "locationTeams", "none"],
    queryFn: () => getLocationTeams(locationId!),
    enabled: !!locationId,
    staleTime: 60_000,
  })
}

export function useSchedulingTemplates() {
  return useQuery({
    queryKey: schedulingPageKeys.templates,
    queryFn: () => getSchedulingTemplates(),
    staleTime: 60_000,
  })
}

export function useUserSchedulingSettings() {
  return useQuery({
    queryKey: schedulingPageKeys.userSchedulingSettings,
    queryFn: () => getUserSchedulingSettings(),
    staleTime: 60_000,
  })
}

export function usePatchSchedulingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: IUserSchedulingSettings) => updateUserSchedulingSettings(body),
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
