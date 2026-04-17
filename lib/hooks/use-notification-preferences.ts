import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type CategoryPreference = {
  category: string
  channels: ("in_app" | "push" | "email")[]
  enabled: boolean
}

export type NotificationPreferences = {
  preferences: CategoryPreference[]
  globalPushEnabled: boolean
  globalEmailEnabled: boolean
}

export type NotificationPreferencesWithMap = NotificationPreferences & {
  /** O(1) lookup map — use this in components instead of .find() on the array */
  preferenceMap: Record<string, CategoryPreference>
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences, Error, NotificationPreferencesWithMap>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/preferences")
      if (!res.ok) throw new Error("Failed to fetch notification preferences")
      const data = await res.json()
      return data.preferences
    },
    select: (data) => ({
      ...data,
      preferenceMap: Object.fromEntries(
        (data.preferences ?? []).map((p) => [p.category, p])
      ) as Record<string, CategoryPreference>,
    }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error("Failed to update notification preferences")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] })
      toast.success("Preferences saved")
    },
    onError: () => {
      toast.error("Failed to save preferences")
    },
  })
}
