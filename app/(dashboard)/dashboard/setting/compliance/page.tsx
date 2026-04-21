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
import { Loader2, ShieldCheck, Briefcase, Calendar, Info, CheckCircle2 } from "lucide-react"
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start gap-4 pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Compliance Configuration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure pay period boundaries and compliance windows for maximum hours and consecutive day checks
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card elevation="elevated">
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card elevation="elevated" className="overflow-hidden">
          <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Pay Period Window</CardTitle>
                <CardDescription>
                  Select the window type that matches your organisation's payroll cycle
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Window type radio group */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Window Type</Label>
              <div className="space-y-2">
                {WINDOW_TYPES.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                      form.windowType === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50 hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="windowType"
                      value={opt.value}
                      checked={form.windowType === opt.value}
                      onChange={() => setForm((prev) => ({ ...prev, windowType: opt.value }))}
                      className="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional fields */}
            {(form.windowType === "weekly" || form.windowType === "fortnightly") && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Pay period starts on</Label>
                <Select
                  value={String(form.periodStartDayOfWeek ?? 1)}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, periodStartDayOfWeek: parseInt(v) }))
                  }
                >
                  <SelectTrigger className="w-full md:w-64 h-9 transition-all focus:ring-2 focus:ring-primary/20">
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
                <Label htmlFor="cycle-days" className="text-xs font-medium">
                  Cycle length (days)
                </Label>
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
                  className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">e.g. 14 for a fortnightly cycle</p>
                {errors.rosterCycleDays && (
                  <p className="text-xs text-destructive">{errors.rosterCycleDays}</p>
                )}
              </div>
            )}

            {form.windowType === "rolling_days" && (
              <div className="space-y-2">
                <Label htmlFor="rolling-days" className="text-xs font-medium">
                  Rolling window length (days)
                </Label>
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
                  className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">e.g. 7 for a rolling 7-day window</p>
                {errors.rollingDays && (
                  <p className="text-xs text-destructive">{errors.rollingDays}</p>
                )}
              </div>
            )}

            {/* Preview block */}
            <div className="rounded-lg bg-linear-to-br from-muted/50 to-muted/30 border border-border/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Current Configuration</p>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Window type:</span>{" "}
                {WINDOW_TYPES.find((w) => w.value === form.windowType)?.label}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Effect:</span>{" "}
                {EFFECT_DESCRIPTIONS[form.windowType](form)}
              </p>
              {form.windowType === "weekly" && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  {getWeeklyPreview(form.periodStartDayOfWeek ?? 1)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button 
                onClick={handleSave} 
                disabled={updateConfig.isPending}
                size="lg"
                className="gap-2 min-w-[140px]"
              >
                {updateConfig.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Hire */}
      <Card elevation="elevated" className="overflow-hidden">
        <CardHeader className="bg-linear-to-br from-primary/5 via-primary/3 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">External Workforce</CardTitle>
              <CardDescription className="mt-1">
                Enable this if your organisation hires staff from external agencies or labour-hire companies during shortages
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {orgSettingsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    We hire staff from external companies or agencies
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
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
              {(externalHire ?? orgSettings?.enableExternalHire) && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      When enabled, an <strong className="text-foreground">Employers</strong> section will appear in Settings to manage external companies.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
