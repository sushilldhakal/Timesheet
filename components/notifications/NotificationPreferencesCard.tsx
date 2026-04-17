"use client"

import { useState, useEffect } from "react"
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/hooks/use-notification-preferences"
import type { CategoryPreference } from "@/lib/hooks/use-notification-preferences"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { RotateCcw, Loader2 } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  roster_published:     "Roster is published",
  shift_swap_request:   "I receive a shift swap request",
  shift_swap_approved:  "My shift swap is approved",
  shift_swap_denied:    "My shift swap is rejected",
  compliance_breach:    "A compliance violation is detected",
  system:               "A break is not recorded",
  pay_run_ready:        "A pay run is calculated",
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS)

const DEFAULT_PREFERENCES: CategoryPreference[] = ALL_CATEGORIES.map((category) => ({
  category,
  channels: ["in_app", "push"],
  enabled: true,
}))

type LocalState = {
  preferenceMap: Record<string, CategoryPreference>
  globalPushEnabled: boolean
  globalEmailEnabled: boolean
}

function buildDefaultState(): LocalState {
  return {
    preferenceMap: Object.fromEntries(DEFAULT_PREFERENCES.map((p) => [p.category, p])),
    globalPushEnabled: true,
    globalEmailEnabled: true,
  }
}

export function NotificationPreferencesCard() {
  const { data, isLoading } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()

  const [local, setLocal] = useState<LocalState>(buildDefaultState)

  // Sync server data into local state once loaded
  useEffect(() => {
    if (!data) return
    setLocal({
      preferenceMap: { ...buildDefaultState().preferenceMap, ...data.preferenceMap },
      globalPushEnabled: data.globalPushEnabled,
      globalEmailEnabled: data.globalEmailEnabled,
    })
  }, [data])

  const getCat = (category: string): CategoryPreference =>
    local.preferenceMap[category] ?? { category, channels: ["in_app", "push"], enabled: true }

  const setCat = (category: string, patch: Partial<CategoryPreference>) => {
    setLocal((prev) => ({
      ...prev,
      preferenceMap: {
        ...prev.preferenceMap,
        [category]: { ...getCat(category), ...patch },
      },
    }))
  }

  const handleChannelToggle = (category: string, channel: "in_app" | "push" | "email", checked: boolean) => {
    const cat = getCat(category)
    const channels = checked
      ? [...new Set([...cat.channels, channel])]
      : cat.channels.filter((c) => c !== channel)
    setCat(category, { channels })
  }

  const handleReset = () => setLocal(buildDefaultState())

  const handleSave = () => {
    updatePrefs.mutate({
      preferences: Object.values(local.preferenceMap),
      globalPushEnabled: local.globalPushEnabled,
      globalEmailEnabled: local.globalEmailEnabled,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose which notifications you receive and how.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global toggles */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Global Settings</p>
          <div className="flex items-center justify-between">
            <Label htmlFor="global-push" className="text-sm">Push Notifications</Label>
            <Switch
              id="global-push"
              checked={local.globalPushEnabled}
              onCheckedChange={(v) => setLocal((prev) => ({ ...prev, globalPushEnabled: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="global-email" className="text-sm">Email Notifications</Label>
            <Switch
              id="global-email"
              checked={local.globalEmailEnabled}
              onCheckedChange={(v) => setLocal((prev) => ({ ...prev, globalEmailEnabled: v }))}
            />
          </div>
        </div>

        <Separator />

        {/* Per-category */}
        <div className="space-y-4">
          <p className="text-sm font-medium">Notify me when…</p>
          {ALL_CATEGORIES.map((category) => {
            const cat = getCat(category)
            const categoryDisabled = !cat.enabled

            return (
              <div key={category} className="flex items-start gap-3">
                {/* Enabled toggle */}
                <Switch
                  checked={cat.enabled}
                  onCheckedChange={(v) => setCat(category, { enabled: v })}
                  className="mt-0.5"
                />
                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${categoryDisabled ? "text-muted-foreground" : ""}`}>
                    {CATEGORY_LABELS[category]}
                  </p>
                  {/* Channel checkboxes */}
                  <div className="mt-1.5 flex items-center gap-4">
                    {(["in_app", "push", "email"] as const).map((channel) => {
                      const isGloballyDisabled =
                        (channel === "push" && !local.globalPushEnabled) ||
                        (channel === "email" && !local.globalEmailEnabled)
                      const isDisabled = categoryDisabled || isGloballyDisabled
                      const isChecked = cat.channels.includes(channel) && !isGloballyDisabled

                      return (
                        <div key={channel} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`${category}-${channel}`}
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(checked) =>
                              handleChannelToggle(category, channel, !!checked)
                            }
                          />
                          <label
                            htmlFor={`${category}-${channel}`}
                            className={`text-xs capitalize ${isDisabled ? "text-muted-foreground" : "cursor-pointer"}`}
                          >
                            {channel === "in_app" ? "In-App" : channel.charAt(0).toUpperCase() + channel.slice(1)}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={updatePrefs.isPending}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button onClick={handleSave} disabled={updatePrefs.isPending}>
            {updatePrefs.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
