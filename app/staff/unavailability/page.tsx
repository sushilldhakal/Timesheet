"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, Pencil, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useEmployeeProfile } from "@/lib/queries/employee-clock"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createAvailabilityConstraint, getEmployeeAvailability, updateAvailabilityConstraint } from "@/lib/api/availability"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DateRangePicker } from "@/components/ui/date-range-picker"

type AvailabilityConstraintLike = {
  _id?: string
  id?: string
  employeeId?: string
  unavailableDays?: number[]
  unavailableTimeRanges?: Array<{ start: string; end: string }>
  preferredShiftTypes?: string[]
  maxConsecutiveDays?: number | null
  minRestHours?: number | null
  temporaryStartDate?: string | null
  temporaryEndDate?: string | null
  reason?: string
  createdAt?: string
  updatedAt?: string
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

type RepeatMode = "none" | "weekly"
type DurationMode = "all_day" | "part_day"

function toYmd(d: string | null | undefined): string | null {
  if (d == null || d === "") return null
  const s = String(d)
  return s.length >= 10 ? s.slice(0, 10) : null
}

function formatDays(days: number[] | undefined) {
  if (!days?.length) return "—"
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? `Day ${d}`)
    .join(", ")
}

/** YYYY-MM-DD window from stored ISO dates (calendar day in local TZ). */
function formatDateWindow(c: AvailabilityConstraintLike): string | null {
  const a = toYmd(c.temporaryStartDate ?? undefined)
  const b = toYmd(c.temporaryEndDate ?? undefined)
  if (!a && !b) return null
  if (a && b && a !== b) return `${a} → ${b}`
  if (a && b) return a
  return a || b || null
}

/** Main heading for list + detail when there are no weekly day codes. */
function constraintHeading(c: AvailabilityConstraintLike): string {
  if (c.unavailableDays?.length) return formatDays(c.unavailableDays)
  const w = formatDateWindow(c)
  if (w) return w
  const r = (c.reason || "").trim()
  if (r) return r.length > 48 ? `${r.slice(0, 45)}…` : r
  return "Unavailability"
}

function unavailableDaysDisplay(c: AvailabilityConstraintLike): string {
  if (c.unavailableDays?.length) return formatDays(c.unavailableDays)
  if (formatDateWindow(c)) return "Every day in range (no weekly pattern)"
  return "Not set"
}

function timeRangesDisplay(c: AvailabilityConstraintLike): string {
  if (c.unavailableTimeRanges?.length) {
    return c.unavailableTimeRanges.map((r) => `${r.start}–${r.end}`).join(", ")
  }
  return "All day (full days in the date range)"
}

function constraintKey(c: AvailabilityConstraintLike): string {
  return String(c._id ?? c.id ?? "")
}

function populateFormFromConstraint(c: AvailabilityConstraintLike) {
  const weekly = (c.unavailableDays?.length ?? 0) > 0
  const hasTempStart = !!(c.temporaryStartDate && String(c.temporaryStartDate).trim())
  const hasTempEnd = !!(c.temporaryEndDate && String(c.temporaryEndDate).trim())
  const tr = c.unavailableTimeRanges?.[0]

  return {
    repeatMode: (weekly ? "weekly" : "none") as RepeatMode,
    weeklyDays: weekly ? [...(c.unavailableDays ?? [])].sort((a, b) => a - b) : [],
    durationMode: (c.unavailableTimeRanges?.length ? "part_day" : "all_day") as DurationMode,
    startTime: tr?.start ?? "09:00",
    endTime: tr?.end ?? "17:00",
    reason: c.reason ?? "",
    ongoing: weekly && !hasTempStart && !hasTempEnd,
    dateRange:
      weekly && !hasTempStart && !hasTempEnd
        ? ({} as { from?: Date; to?: Date })
        : {
            from: hasTempStart ? new Date(String(c.temporaryStartDate)) : undefined,
            to: hasTempEnd ? new Date(String(c.temporaryEndDate)) : undefined,
          },
  }
}

export default function StaffUnavailabilityPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const employeeProfileQuery = useEmployeeProfile()
  const employee = employeeProfileQuery.data?.data?.employee
  const employeeId = employee?.id

  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none")
  const [durationMode, setDurationMode] = useState<DurationMode>("all_day")
  const [ongoing, setOngoing] = useState(false)
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [reason, setReason] = useState("")

  const resetFormFields = () => {
    setRepeatMode("none")
    setDurationMode("all_day")
    setOngoing(false)
    setWeeklyDays([])
    setDateRange({})
    setStartTime("09:00")
    setEndTime("17:00")
    setReason("")
  }

  const resetAddForm = () => {
    setEditingConstraintId(null)
    resetFormFields()
  }

  const openAddDialog = () => {
    resetAddForm()
    setDialogOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Employee ID missing")
      const isEdit = Boolean(editingConstraintId)

      const unavailableTimeRanges =
        durationMode === "part_day"
          ? [
              {
                start: startTime,
                end: endTime,
              },
            ]
          : []

      const isWeekly = repeatMode === "weekly"
      const isOngoing = isWeekly && ongoing

      const payload: {
        unavailableDays: number[]
        unavailableTimeRanges: { start: string; end: string }[]
        temporaryStartDate: string | null
        temporaryEndDate: string | null
        reason: string
      } = {
        unavailableDays: isWeekly ? weeklyDays.slice().sort((a, b) => a - b) : [],
        unavailableTimeRanges,
        reason: reason.trim() || "",
        temporaryStartDate: null,
        temporaryEndDate: null,
      }
      if (isOngoing) {
        payload.temporaryStartDate = null
        payload.temporaryEndDate = null
      } else {
        payload.temporaryStartDate = dateRange.from ? new Date(dateRange.from).toISOString() : null
        payload.temporaryEndDate = dateRange.to ? new Date(dateRange.to).toISOString() : null
      }

      // Basic client-side validation to avoid silent bad requests
      if (isWeekly && payload.unavailableDays.length === 0) {
        throw new Error("Select at least one weekday for weekly repeat")
      }
      if (durationMode === "part_day") {
        if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
          throw new Error("Time must be HH:mm")
        }
      }
      if (dateRange.from && dateRange.to && !isOngoing && dateRange.from > dateRange.to) {
        throw new Error("End date must be on/after start date")
      }
      if (!isOngoing && (repeatMode === "none" || isWeekly)) {
        // For non-ongoing constraints we expect at least a start date.
        if (!dateRange.from) throw new Error("Please pick a start date")
      }

      const constraint = isEdit
        ? await updateAvailabilityConstraint(employeeId, editingConstraintId!, payload as any)
        : await createAvailabilityConstraint(employeeId, payload as any)
      return { isEdit, constraint }
    },
    onSuccess: async (data) => {
      toast.success(data.isEdit ? "Unavailability updated" : "Unavailability added")
      setDialogOpen(false)
      resetAddForm()
      await queryClient.invalidateQueries({ queryKey: ["employee-availability", employeeId] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save unavailability")
    },
  })

  // Use query hook for fetching availability constraints
  const availabilityQuery = useQuery({
    queryKey: ['employee-availability', employeeId],
    queryFn: () => getEmployeeAvailability(employeeId!),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const constraints = useMemo(() => {
    const list = availabilityQuery.data?.constraints ?? []
    return list.map((c) => {
      const oid = (c.id ?? c._id) as string | undefined
      return { ...c, _id: oid, id: oid, employeeId }
    })
  }, [availabilityQuery.data, employeeId])

  useEffect(() => {
    if (employeeProfileQuery.isError) {
      toast.error("Session expired. Please log in again.")
      router.push("/")
    }
  }, [employeeProfileQuery.isError, router])

  useEffect(() => {
    if (constraints.length > 0 && !selectedConstraintId) {
      const first = constraints[0]
      setSelectedConstraintId(first ? constraintKey(first) : null)
    }
  }, [constraints, selectedConstraintId])

  const selectedConstraint = useMemo(() => {
    if (!selectedConstraintId) return null
    return constraints.find((c) => constraintKey(c) === selectedConstraintId) ?? null
  }, [constraints, selectedConstraintId])

  const openEditDialog = useCallback(() => {
    if (!selectedConstraint) return
    const id = constraintKey(selectedConstraint)
    if (!id) return
    resetFormFields()
    setEditingConstraintId(id)
    const next = populateFormFromConstraint(selectedConstraint)
    setRepeatMode(next.repeatMode)
    setWeeklyDays(next.weeklyDays)
    setDurationMode(next.durationMode)
    setStartTime(next.startTime)
    setEndTime(next.endTime)
    setReason(next.reason)
    setOngoing(next.ongoing)
    setDateRange(next.dateRange)
    setDialogOpen(true)
  }, [selectedConstraint])

  if (employeeProfileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employeeProfileQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Session expired. Redirecting to login...</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Unavailability</h1>
          <p className="text-sm text-muted-foreground">View your availability constraints and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => openAddDialog()}
            disabled={!employeeId}
          >
            <Plus className="size-4" />
            Add Unavailability
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={availabilityQuery.isLoading}
            onClick={() => availabilityQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {availabilityQuery.error && <p className="text-sm text-destructive">{availabilityQuery.error instanceof Error ? availabilityQuery.error.message : 'Failed to load unavailability constraints'}</p>}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Constraints</CardTitle>
            <CardDescription>
              {availabilityQuery.isLoading ? "Loading..." : constraints.length ? `${constraints.length} constraint(s)` : "No constraints found."}
            </CardDescription>
          </CardHeader>
          <Separator />
          <ScrollArea className="h-[520px]">
            <div className="space-y-2 p-2">
              {constraints.map((c) => {
                const id = constraintKey(c)
                const isActive = id === selectedConstraintId
                const hasTemp = !!(toYmd(c.temporaryStartDate ?? undefined) || toYmd(c.temporaryEndDate ?? undefined))
                return (
                  <button
                    key={id || `c-${constraintHeading(c)}`}
                    type="button"
                    onClick={() => setSelectedConstraintId(id || null)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {constraintHeading(c)}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {hasTemp ? "Temporary" : "Permanent"}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {hasTemp ? "Temporary" : "Permanent"}
                      </Badge>
                    </div>
                    {c.reason?.trim() ? (
                      <div className="mt-2 truncate text-xs text-muted-foreground">{c.reason}</div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {selectedConstraint ? constraintHeading(selectedConstraint) : "—"}
                </CardTitle>
                <CardDescription>
                  {selectedConstraint ? "Availability constraint details" : "Select a constraint to view details."}
                </CardDescription>
              </div>
              {selectedConstraint && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {toYmd(selectedConstraint.temporaryStartDate ?? undefined) ||
                    toYmd(selectedConstraint.temporaryEndDate ?? undefined)
                      ? "Temporary"
                      : "Permanent"}
                  </Badge>
                  {constraintKey(selectedConstraint) ? (
                    <Button type="button" variant="outline" size="sm" onClick={openEditDialog}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-5">
            {!selectedConstraint ? (
              <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                Pick a constraint from the left to see details.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Unavailable days</div>
                    <div className="text-sm font-semibold text-foreground">{unavailableDaysDisplay(selectedConstraint)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Time ranges</div>
                    <div className="text-sm text-foreground">{timeRangesDisplay(selectedConstraint)}</div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Preferred shift types</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedConstraint.preferredShiftTypes?.length
                        ? selectedConstraint.preferredShiftTypes.join(", ")
                        : "None"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Max consecutive days</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedConstraint.maxConsecutiveDays != null ? selectedConstraint.maxConsecutiveDays : "Not set"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Min rest hours</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedConstraint.minRestHours != null ? selectedConstraint.minRestHours : "Not set"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Temporary window</div>
                    <div className="text-sm text-foreground">
                      {toYmd(selectedConstraint.temporaryStartDate ?? undefined) ||
                      toYmd(selectedConstraint.temporaryEndDate ?? undefined)
                        ? `${toYmd(selectedConstraint.temporaryStartDate ?? undefined) ?? "—"} → ${toYmd(selectedConstraint.temporaryEndDate ?? undefined) ?? "—"}`
                        : "— (permanent)"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Reason</div>
                    <div className="rounded-lg border bg-background p-3 text-sm text-foreground">
                      {selectedConstraint.reason?.trim() ? selectedConstraint.reason : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Add constraints like “no Sundays” or “unavailable next week” to help scheduling.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetAddForm()
        }}
      >
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editingConstraintId ? "Edit Unavailability" : "Add Unavailability"}</DialogTitle>
            <DialogDescription>
              Choose whether this is a one-off date range or a weekly repeat.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label>Repeat</Label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {repeatMode === "weekly" ? "Weekly" : "No repeat"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {repeatMode === "weekly"
                      ? "Repeat the same days every week"
                      : "One-off unavailability window"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">No</span>
                  <Switch
                    checked={repeatMode === "weekly"}
                    onCheckedChange={(checked) => {
                      setRepeatMode(checked ? "weekly" : "none")
                      if (!checked) {
                        setOngoing(false)
                      }
                    }}
                    aria-label="Repeat weekly"
                  />
                  <span className="text-xs text-muted-foreground">Weekly</span>
                </div>
              </div>
            </div>

            {repeatMode === "weekly" && (
              <div className="grid gap-2">
                <Label>Days to repeat</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DAY_SHORT.map((label, idx) => {
                    const checked = weeklyDays.includes(idx)
                    return (
                      <button
                        key={label}
                        type="button"
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm transition-colors",
                          checked ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/40"
                        )}
                        onClick={() => {
                          setWeeklyDays((prev) =>
                            prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
                          )
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Duration</Label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {durationMode === "part_day" ? "Part day" : "All day"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {durationMode === "part_day" ? "Specify start and finish time" : "No time restriction"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">All day</span>
                  <Switch
                    checked={durationMode === "part_day"}
                    onCheckedChange={(checked) => setDurationMode(checked ? "part_day" : "all_day")}
                    aria-label="Part day"
                  />
                  <span className="text-xs text-muted-foreground">Part</span>
                </div>
              </div>
            </div>

            {durationMode === "part_day" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Start time</Label>
                  <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="HH:mm" />
                </div>
                <div className="grid gap-2">
                  <Label>End time</Label>
                  <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="HH:mm" />
                </div>
              </div>
            )}

            {repeatMode === "weekly" ? (
              <div className="grid gap-2">
                <Label>Date range</Label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={ongoing}
                    onCheckedChange={(v) => {
                      const next = Boolean(v)
                      setOngoing(next)
                      if (next) setDateRange({})
                    }}
                  />
                  Ongoing
                </label>
                {!ongoing && (
                  <DateRangePicker
                    dateRange={{ from: dateRange.from, to: dateRange.to }}
                    onDateRangeChange={(range) => {
                      setDateRange({ from: range?.from, to: range?.to })
                    }}
                    placeholder="Pick start and finish dates"
                  />
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Dates</Label>
                <DateRangePicker
                  dateRange={{ from: dateRange.from, to: dateRange.to }}
                  onDateRangeChange={(range) => {
                    setDateRange({ from: range?.from, to: range?.to })
                  }}
                  placeholder="Pick start and finish dates"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional. e.g. Uni class, family commitments, medical appointment…"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
