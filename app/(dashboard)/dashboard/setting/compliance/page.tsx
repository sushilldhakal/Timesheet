"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { usePayPeriodConfig, useUpdatePayPeriodConfig } from "@/lib/hooks/use-pay-period-config"
import type { PayPeriodConfig, WindowType } from "@/lib/hooks/use-pay-period-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, ShieldCheck, Briefcase } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useEmployerSettings, useUpdateEmployerSettings } from "@/lib/queries/employers"

const WINDOW_TYPES: { value: WindowType; label: string; description: string }[] = [
  {
    value: "weekly",
    label: "Standard weekly payroll cycle",
    description: "A 7-day window aligned to a fixed weekday. Most common.",
  },
  {
    value: "fortnightly",
    label: "Bi-weekly payroll cycle",
    description: "A 14-day window aligned to a fixed weekday.",
  },
  {
    value: "roster_cycle",
    label: "Custom roster-based cycle",
    description: "A fixed N-day cycle from a reference date. Use for non-standard rosters.",
  },
  {
    value: "rolling_days",
    label: "Rolling window (advanced)",
    description: "A trailing N-day window ending today. Use only if required by your award.",
  },
]

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const EFFECT_DESCRIPTIONS: Record<WindowType, (config: PayPeriodConfig) => string> = {
  weekly: (c) => {
    const day = DAY_NAMES[c.periodStartDayOfWeek ?? 1]
    return `Max hours and consecutive day limits are checked within each 7-day block starting every ${day}. A new window begins each ${day}.`
  },
  fortnightly: (c) => {
    const day = DAY_NAMES[c.periodStartDayOfWeek ?? 1]
    return `Compliance windows span 14 days, starting every other ${day}. Hours in each fortnight are checked against your award limits.`
  },
  roster_cycle: (c) =>
    `Each compliance window is ${c.rosterCycleDays ?? "N"} days long, anchored to a fixed reference date. Hours are accumulated across each full cycle.`,
  rolling_days: (c) =>
    `Hours are checked over a trailing ${c.rollingDays ?? "N"}-day window that moves daily. This is the most restrictive window type.`,
}

/** Simple weekly preview — only for weekly window type, no engine math */
function getWeeklyPreview(periodStartDayOfWeek: number): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysBack = (dayOfWeek - periodStartDayOfWeek + 7) % 7
  const start = new Date(today)
  start.setDate(start.getDate() - daysBack)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
  return `e.g. ${fmt(start)} – ${fmt(end)}`
}

export default function ComplianceConfigPage() {
  const router = useRouter()
  const { user, isHydrated } = useAuth()

  // Role guard
  useEffect(() => {
    if (isHydrated && user && user.role !== "admin" && user.role !== "super_admin") {
      router.replace("/dashboard")
    }
  }, [isHydrated, user, router])

  const employerId = user?.tenantId
  const { data: savedConfig, isLoading } = usePayPeriodConfig(employerId)
  const updateConfig = useUpdatePayPeriodConfig(employerId)

  // External hire org setting
  const { data: orgSettings, isLoading: orgSettingsLoading } = useEmployerSettings(isHydrated)
  const updateSettingsMutation = useUpdateEmployerSettings()

  const [externalHire, setExternalHire] = useState<boolean | null>(null)
  const [savingExternalHire, setSavingExternalHire] = useState(false)

  // Sync local state when query resolves
  useEffect(() => {
    if (orgSettings?.enableExternalHire !== undefined && externalHire === null) {
      setExternalHire(Boolean(orgSettings.enableExternalHire))
    }
  }, [orgSettings, externalHire])

  const handleExternalHireToggle = async (checked: boolean) => {
    setExternalHire(checked) // optimistic
    setSavingExternalHire(true)
    try {
      await updateSettingsMutation.mutateAsync({ enableExternalHire: checked })
      toast.success(checked ? "External workforce enabled" : "External workforce disabled")
    } catch (err: any) {
      setExternalHire(!checked) // revert
      toast.error(`Failed to update: ${err.message}`)
    } finally {
      setSavingExternalHire(false)
    }
  }

  const [form, setForm] = useState<PayPeriodConfig>({
    windowType: "weekly",
    periodStartDayOfWeek: 1,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (savedConfig) setForm(savedConfig)
  }, [savedConfig])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (form.windowType === "roster_cycle" && !form.rosterCycleDays) {
      errs.rosterCycleDays = "Cycle length is required"
    }
    if (form.windowType === "rolling_days" && !form.rollingDays) {
      errs.rollingDays = "Window length is required"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    updateConfig.mutate(form)
  }

  if (!isHydrated || !user) return null
  if (user.role !== "admin" && user.role !== "super_admin") return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Compliance Window Configuration</h1>
          <p className="text-muted-foreground text-sm">
            Controls how the compliance engine calculates pay period boundaries for maximum hours
            and consecutive day checks.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pay Period Window</CardTitle>
            <CardDescription>
              Select the window type that matches your organisation's payroll cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Window type radio group */}
            <div className="space-y-3">
              {WINDOW_TYPES.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    form.windowType === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="windowType"
                    value={opt.value}
                    checked={form.windowType === opt.value}
                    onChange={() => setForm((prev) => ({ ...prev, windowType: opt.value }))}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Conditional fields */}
            {(form.windowType === "weekly" || form.windowType === "fortnightly") && (
              <div className="space-y-2">
                <Label>Pay period starts on</Label>
                <Select
                  value={String(form.periodStartDayOfWeek ?? 1)}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, periodStartDayOfWeek: parseInt(v) }))
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.windowType === "roster_cycle" && (
              <div className="space-y-2">
                <Label htmlFor="cycle-days">Cycle length (days)</Label>
                <input
                  id="cycle-days"
                  type="number"
                  min={7}
                  max={84}
                  value={form.rosterCycleDays ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      rosterCycleDays: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">e.g. 14 for a fortnightly cycle</p>
                {errors.rosterCycleDays && (
                  <p className="text-xs text-destructive">{errors.rosterCycleDays}</p>
                )}
              </div>
            )}

            {form.windowType === "rolling_days" && (
              <div className="space-y-2">
                <Label htmlFor="rolling-days">Rolling window length (days)</Label>
                <input
                  id="rolling-days"
                  type="number"
                  min={7}
                  max={84}
                  value={form.rollingDays ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      rollingDays: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">e.g. 7 for a rolling 7-day window</p>
                {errors.rollingDays && (
                  <p className="text-xs text-destructive">{errors.rollingDays}</p>
                )}
              </div>
            )}

            {/* Preview block */}
            <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
              <p className="text-sm font-medium">Current configuration</p>
              <p className="text-sm text-muted-foreground">
                Window type:{" "}
                <span className="font-medium text-foreground">
                  {WINDOW_TYPES.find((w) => w.value === form.windowType)?.label}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Effect: {EFFECT_DESCRIPTIONS[form.windowType](form)}
              </p>
              {form.windowType === "weekly" && (
                <p className="text-xs text-muted-foreground italic">
                  {getWeeklyPreview(form.periodStartDayOfWeek ?? 1)}
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* External Hire */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>External Workforce</CardTitle>
              <CardDescription className="mt-1">
                Enable this if your organisation hires staff from external agencies or labour-hire companies during shortages.
                When enabled, an <strong>Employers</strong> section will appear in Settings to manage those companies.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orgSettingsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">
                  We hire staff from external companies or agencies
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Activates the Employers module under Settings. Most organisations don't need this.
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {savingExternalHire && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={externalHire ?? orgSettings?.enableExternalHire ?? false}
                  disabled={savingExternalHire}
                  onCheckedChange={handleExternalHireToggle}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
