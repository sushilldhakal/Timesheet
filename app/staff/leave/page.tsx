"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format, isSameDay, parseISO, startOfDay, endOfDay, isValid } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useEmployeeProfile } from "@/lib/queries/employee-clock"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getEmployeeAbsences, createEmployeeAbsence, getEmployeeLeaveTypes } from "@/lib/api/absences"
import { getCalendarEvents } from "@/lib/api/calendar"
import { FormDialogShell } from "@/components/shared/forms"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type LeaveRecordLike = {
  _id?: string
  id?: string
  employeeId?: string
  startDate?: string
  endDate?: string
  leaveType?: string
  partialStartTime?: string
  partialEndTime?: string
  status?: string
  notes?: string
  approvedBy?: string
  approvedAt?: string
  deniedBy?: string
  deniedAt?: string
  denialReason?: string
  createdAt?: string
  updatedAt?: string
}

type DurationMode = "full_day" | "part_day" | "multi_day"

function ymdFromApi(iso?: string | null): string {
  if (iso == null || iso === "") return ""
  const s = String(iso)
  return s.length >= 10 ? s.slice(0, 10) : ""
}

function formatDisplayDate(iso?: string | null): string {
  const y = ymdFromApi(iso)
  if (!y) return "—"
  const d = parseISO(`${y}T12:00:00`)
  return isValid(d) ? format(d, "dd/MM/yyyy") : y
}

function formatEventLine(iso: string, title: string): { timeLine: string; dateLine: string } {
  const d = parseISO(iso)
  if (!isValid(d)) return { timeLine: title, dateLine: "" }
  return {
    timeLine: `${format(d, "h:mmaaa").toLowerCase()} ${title}`,
    dateLine: format(d, "EEE, d MMM"),
  }
}

function statusBadge(statusRaw: string | undefined): { label: string; className: string } {
  const s = (statusRaw || "").toLowerCase()
  if (s.includes("approve")) {
    return {
      label: statusRaw || "Approved",
      className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    }
  }
  if (s.includes("reject") || s.includes("denied") || s.includes("declin")) {
    return { label: statusRaw || "Rejected", className: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300" }
  }
  if (s.includes("pending") || !s) {
    return {
      label: statusRaw || "Pending",
      className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    }
  }
  return { label: statusRaw || "Unknown", className: "border-border bg-muted text-muted-foreground" }
}

export default function StaffLeavePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const employeeProfileQuery = useEmployeeProfile()
  const employee = employeeProfileQuery.data?.data?.employee
  const employeeId = employee?.id
  const employeeName = employee?.name?.trim() || "You"

  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null)

  const [addLeaveOpen, setAddLeaveOpen] = useState(false)
  const [durationMode, setDurationMode] = useState<DurationMode>("full_day")
  const [addStart, setAddStart] = useState("")
  const [addEnd, setAddEnd] = useState("")
  const [addPartStart, setAddPartStart] = useState("09:00")
  const [addPartEnd, setAddPartEnd] = useState("17:00")
  const [addType, setAddType] = useState("")
  const [addNotes, setAddNotes] = useState("")

  const absencesQuery = useQuery({
    queryKey: ["employee-absences", employeeId],
    queryFn: () => getEmployeeAbsences(employeeId!),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  })

  const leaveTypesQuery = useQuery({
    queryKey: ["employee-leave-types", employeeId],
    queryFn: () => getEmployeeLeaveTypes(employeeId!),
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
  })

  const leaveTypeLabelByValue = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of leaveTypesQuery.data?.leaveTypes ?? []) {
      m.set(o.value, o.label)
    }
    return m
  }, [leaveTypesQuery.data])

  const rosterDayQuery = useQuery({
    queryKey: ["staff-leave-roster-day", employeeId, addStart],
    queryFn: async () => {
      if (!employeeId || !addStart) return []
      const day = parseISO(`${addStart}T12:00:00`)
      if (!isValid(day)) return []
      const res = await getCalendarEvents({
        startDate: startOfDay(day).toISOString(),
        endDate: endOfDay(day).toISOString(),
        userId: employeeId,
        publishedOnly: true,
      })
      const raw = res as { events?: unknown[] }
      return Array.isArray(raw.events) ? raw.events : []
    },
    enabled: addLeaveOpen && !!employeeId && !!addStart,
    staleTime: 60 * 1000,
  })

  const conflictingEvents = useMemo(() => {
    const events = rosterDayQuery.data ?? []
    if (!addStart) return []
    const leaveDay = parseISO(`${addStart}T12:00:00`)
    if (!isValid(leaveDay)) return []
    return events.filter((ev: any) => {
      const sid = ev?.user?.id ?? ev?.employeeId
      if (sid !== employeeId) return false
      const start = ev?.startDate ?? ev?.start
      if (!start || typeof start !== "string") return false
      const sd = parseISO(start)
      return isValid(sd) && isSameDay(sd, leaveDay)
    })
  }, [rosterDayQuery.data, addStart, employeeId])

  const createAbsenceMutation = useMutation({
    mutationFn: (data: Parameters<typeof createEmployeeAbsence>[1]) => createEmployeeAbsence(employeeId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences", employeeId] })
      setAddLeaveOpen(false)
      toast.success("Leave request created")
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to create leave")
    },
  })

  const absences = useMemo(() => {
    const rows = absencesQuery.data?.absences ?? []
    const merged = rows.map((a) => {
      const oid = (a.id ?? a._id) as string | undefined
      return { ...a, _id: oid, id: oid }
    })
    merged.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))
    return merged
  }, [absencesQuery.data])

  useEffect(() => {
    if (employeeProfileQuery.isError) {
      toast.error("Session expired. Please log in again.")
      router.push("/")
    }
  }, [employeeProfileQuery.isError, router])

  useEffect(() => {
    if (absences.length > 0 && !selectedAbsenceId) {
      setSelectedAbsenceId(absences[0]?._id ?? absences[0]?.id ?? null)
    }
  }, [absences, selectedAbsenceId])

  useEffect(() => {
    if (durationMode === "full_day") {
      setAddEnd(addStart)
    }
    if (durationMode === "part_day" && addStart) {
      setAddEnd(addStart)
    }
  }, [durationMode, addStart])

  const submitAddLeave = async () => {
    if (!employeeId) {
      toast.error("Employee ID not found")
      return
    }
    if (!addType) {
      toast.error("Please select a leave type")
      return
    }
    if (!addStart) {
      toast.error("Leave start date is required")
      return
    }

    let endYmd = addStart
    let partialStartTime: string | undefined
    let partialEndTime: string | undefined

    if (durationMode === "full_day") {
      endYmd = addStart
    } else if (durationMode === "part_day") {
      endYmd = addStart
      if (!addPartStart || !addPartEnd) {
        toast.error("Start and end times are required for part-day leave")
        return
      }
      if (addPartStart >= addPartEnd) {
        toast.error("End time must be after start time")
        return
      }
      partialStartTime = addPartStart
      partialEndTime = addPartEnd
    } else {
      if (!addEnd) {
        toast.error("End date is required for multiple-day leave")
        return
      }
      if (addEnd < addStart) {
        toast.error("End date must be on or after start date")
        return
      }
      endYmd = addEnd
    }

    createAbsenceMutation.mutate({
      startDate: addStart,
      endDate: endYmd,
      leaveType: addType,
      notes: addNotes.trim() || undefined,
      ...(partialStartTime && partialEndTime ? { partialStartTime, partialEndTime } : {}),
    })
  }

  const openAddLeave = () => {
    const today = new Date().toISOString().split("T")[0]
    setDurationMode("full_day")
    setAddStart(today)
    setAddEnd(today)
    setAddPartStart("09:00")
    setAddPartEnd("17:00")
    setAddType("")
    setAddNotes("")
    setAddLeaveOpen(true)
  }

  const selectedAbsence = useMemo(() => {
    if (!selectedAbsenceId) return null
    return absences.find((a) => (a._id ?? a.id) === selectedAbsenceId) ?? null
  }, [absences, selectedAbsenceId])

  if (employeeProfileQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employeeProfileQuery.isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
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
          <h1 className="text-2xl font-bold">My Leave Requests</h1>
          <p className="text-sm text-muted-foreground">View and manage your leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={openAddLeave}>
            <Plus className="size-4" />
            Request Leave
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={absencesQuery.isLoading}
            onClick={() => absencesQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {absencesQuery.error && (
        <p className="text-sm text-destructive">
          {absencesQuery.error instanceof Error ? absencesQuery.error.message : "Failed to load leave records"}
        </p>
      )}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">All Requests</CardTitle>
            <CardDescription>
              {absencesQuery.isLoading ? "Loading..." : absences.length ? `${absences.length} request(s)` : "No requests found."}
            </CardDescription>
          </CardHeader>
          <Separator />
          <ScrollArea className="h-[520px]">
            <div className="space-y-2 p-2">
              {absences.map((a) => {
                const id = (a._id ?? a.id) as string | undefined
                const isActive = !!id && id === selectedAbsenceId
                const st = statusBadge(a.status)
                const typeLabel = leaveTypeLabelByValue.get(a.leaveType ?? "") ?? a.leaveType ?? "—"
                return (
                  <button
                    key={id ?? `${a.startDate}-${a.endDate}-${a.leaveType}`}
                    type="button"
                    onClick={() => setSelectedAbsenceId(id ?? null)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{typeLabel}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatDisplayDate(a.startDate)}
                          {ymdFromApi(a.endDate) !== ymdFromApi(a.startDate) ? ` → ${formatDisplayDate(a.endDate)}` : null}
                          {a.partialStartTime && a.partialEndTime ? (
                            <span className="text-foreground"> · {a.partialStartTime}–{a.partialEndTime}</span>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", st.className)}>
                        {st.label}
                      </Badge>
                    </div>
                    {a.notes?.trim() ? <div className="mt-2 truncate text-xs text-muted-foreground">{a.notes}</div> : null}
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
                  {selectedAbsence
                    ? leaveTypeLabelByValue.get(selectedAbsence.leaveType ?? "") ?? selectedAbsence.leaveType ?? "—"
                    : "—"}
                </CardTitle>
                <CardDescription>
                  {selectedAbsence
                    ? `${formatDisplayDate(selectedAbsence.startDate)}${
                        ymdFromApi(selectedAbsence.endDate) !== ymdFromApi(selectedAbsence.startDate)
                          ? ` → ${formatDisplayDate(selectedAbsence.endDate)}`
                          : ""
                      }`
                    : "Select a request to view details."}
                </CardDescription>
              </div>
              {selectedAbsence && (
                <Badge variant="outline" className={cn(statusBadge(selectedAbsence.status).className)}>
                  {statusBadge(selectedAbsence.status).label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-5">
            {!selectedAbsence ? (
              <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                Pick a leave request from the left to see details.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Dates</div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatDisplayDate(selectedAbsence.startDate)}
                      {ymdFromApi(selectedAbsence.endDate) !== ymdFromApi(selectedAbsence.startDate)
                        ? ` → ${formatDisplayDate(selectedAbsence.endDate)}`
                        : ""}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Leave type</div>
                    <div className="text-sm font-semibold text-foreground">
                      {leaveTypeLabelByValue.get(selectedAbsence.leaveType ?? "") ?? selectedAbsence.leaveType ?? "—"}
                    </div>
                  </div>
                </div>

                {selectedAbsence.partialStartTime && selectedAbsence.partialEndTime ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Time on first day</div>
                    <div className="text-sm text-foreground">
                      {selectedAbsence.partialStartTime}–{selectedAbsence.partialEndTime}
                    </div>
                  </div>
                ) : null}

                {selectedAbsence.notes?.trim() && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Notes</div>
                    <div className="rounded-lg border bg-background p-3 text-sm text-foreground">{selectedAbsence.notes}</div>
                  </div>
                )}

                {selectedAbsence.denialReason?.trim() && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-destructive">Denial reason</div>
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                      {selectedAbsence.denialReason}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedAbsence.approvedAt && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Approved at</div>
                      <div className="text-sm text-muted-foreground">{new Date(selectedAbsence.approvedAt).toLocaleString()}</div>
                    </div>
                  )}
                  {selectedAbsence.deniedAt && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Denied at</div>
                      <div className="text-sm text-muted-foreground">{new Date(selectedAbsence.deniedAt).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <FormDialogShell
        open={addLeaveOpen}
        onOpenChange={setAddLeaveOpen}
        title="Request leave"
        size="lg"
        onSubmit={(e) => {
          e.preventDefault()
          submitAddLeave()
        }}
        submitLabel={createAbsenceMutation.isPending ? "Submitting…" : "Submit request"}
        loading={createAbsenceMutation.isPending}
      >
        <div className="space-y-5">
          <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Who is taking leave?</div>
            <div className="text-sm font-semibold text-foreground">{employeeName}</div>
          </div>

          {rosterDayQuery.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking roster…
            </div>
          ) : conflictingEvents.length > 0 ? (
            <div className="space-y-2">
              {conflictingEvents.slice(0, 2).map((ev: any) => {
                const start = (ev.startDate ?? ev.start) as string
                const title = (ev.title as string) || "Scheduled shift"
                const { timeLine, dateLine } = formatEventLine(start, title)
                return (
                  <Alert key={String(ev.id ?? start)} className="border-amber-500/40 bg-amber-500/10">
                    <AlertTitle>Leave discouraged due to event</AlertTitle>
                    <AlertDescription className="space-y-1">
                      <p>Consider changing the leave date.</p>
                      <p className="font-medium text-foreground">{timeLine}</p>
                      {dateLine ? <p className="text-muted-foreground">{dateLine}</p> : null}
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="leave-start">When does the leave start?</Label>
            <Input id="leave-start" type="date" value={addStart} onChange={(e) => setAddStart(e.target.value)} className="max-w-xs" />
            <p className="text-xs text-muted-foreground">
              {addStart && isValid(parseISO(`${addStart}T12:00:00`))
                ? `Shown as ${format(parseISO(`${addStart}T12:00:00`), "dd/MM/yyyy")}`
                : "Use your organisation date format in the picker; we store ISO dates."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Duration</div>
            <RadioGroup
              value={durationMode}
              onValueChange={(v) => setDurationMode(v as DurationMode)}
              className="grid gap-2 sm:grid-cols-3"
            >
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                  durationMode === "full_day" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="full_day" id="dur-full" />
                <span>Full day</span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                  durationMode === "part_day" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="part_day" id="dur-part" />
                <span>Part day</span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                  durationMode === "multi_day" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="multi_day" id="dur-multi" />
                <span>Multiple days</span>
              </label>
            </RadioGroup>
          </div>

          {durationMode === "multi_day" ? (
            <div className="space-y-2">
              <Label htmlFor="leave-end">End date</Label>
              <Input id="leave-end" type="date" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} className="max-w-xs" />
            </div>
          ) : null}

          {durationMode === "part_day" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="part-start">Start time</Label>
                <Input id="part-start" type="time" value={addPartStart} onChange={(e) => setAddPartStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-end">End time</Label>
                <Input id="part-end" type="time" value={addPartEnd} onChange={(e) => setAddPartEnd(e.target.value)} />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Leave type</Label>
            <Select value={addType || undefined} onValueChange={setAddType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Please make a selection" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypesQuery.isLoading ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">Loading types…</div>
                ) : (
                  (leaveTypesQuery.data?.leaveTypes ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {leaveTypesQuery.isError ? (
              <p className="text-xs text-destructive">Could not load award leave types; try again.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Includes types from your award (leave accrual rules) where configured.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              placeholder="Add any additional information…"
              rows={3}
            />
          </div>
        </div>
      </FormDialogShell>
    </div>
  )
}
