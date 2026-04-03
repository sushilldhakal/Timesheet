"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { useEmployees } from "@/lib/queries/employees"
import {
  format,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  isValid,
  parseISO,
} from "date-fns"
import { useEffect, useMemo, useState, type ComponentType } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { AlignJustify, Columns, LayoutGrid, Plus, RefreshCw, Search, X } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const LEAVE_TYPE_OPTIONS = ["ANNUAL", "SICK", "UNPAID", "PUBLIC_HOLIDAY"] as const

type LeaveRecordLike = {
  _id?: string
  id?: string
  employeeId?: string
  employeeName?: string
  employeePin?: string
  startDate?: string
  endDate?: string
  leaveType?: string
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

type AffectedShift = {
  shiftId: string
  date: string
  startTime: string
  endTime: string
}

function statusBadge(statusRaw: string | undefined): { label: string; className: string } {
  const s = (statusRaw || "").toLowerCase()
  if (s.includes("approve")) {
    return { label: statusRaw || "Approved", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
  }
  if (s.includes("reject") || s.includes("denied") || s.includes("declin")) {
    return { label: statusRaw || "Rejected", className: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300" }
  }
  if (s.includes("pending") || !s) {
    return { label: statusRaw || "Pending", className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300" }
  }
  return { label: statusRaw || "Unknown", className: "border-border bg-muted text-muted-foreground" }
}

function displayEmployee(a: LeaveRecordLike, fallback?: { name: string; pin: string } | undefined) {
  if (a.employeeName) {
    return a.employeePin ? `${a.employeeName} (${a.employeePin})` : a.employeeName
  }
  if (a.employeeId && fallback) {
    return `${fallback.name} (${fallback.pin})`
  }
  return "Employee"
}

function isLeaveFinalStatus(status: string | undefined) {
  const u = (status || "").toUpperCase()
  return u === "APPROVED" || u === "DENIED"
}

export default function LeavePage() {
  const { user, userRole, isHydrated } = useAuth()
  const isAdmin = isHydrated && isAdminOrSuperAdmin(userRole)

  const employeesQuery = useEmployees(500)
  const employees = employeesQuery.data?.employees ?? []

  const [view, setView] = useState<TimesheetView>("week")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  const [refreshNonce, setRefreshNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [absences, setAbsences] = useState<LeaveRecordLike[]>([])
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const [addLeaveOpen, setAddLeaveOpen] = useState(false)
  const [addEmployeeId, setAddEmployeeId] = useState("")
  const [addStart, setAddStart] = useState("")
  const [addEnd, setAddEnd] = useState("")
  const [addType, setAddType] = useState<(typeof LEAVE_TYPE_OPTIONS)[number]>("ANNUAL")
  const [addNotes, setAddNotes] = useState("")
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [denyOpen, setDenyOpen] = useState(false)
  const [denyReason, setDenyReason] = useState("")
  const [denySubmitting, setDenySubmitting] = useState(false)

  const [postApproveShifts, setPostApproveShifts] = useState<{
    absenceId: string
    shifts: AffectedShift[]
  } | null>(null)
  const [affectedBannerDismissed, setAffectedBannerDismissed] = useState(false)

  const { startDate, endDate } = useMemo(() => {
    if (useCustomRange && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate }
    }
    if (view === "day") {
      return {
        startDate: format(startOfDay(selectedDate), "yyyy-MM-dd"),
        endDate: format(endOfDay(selectedDate), "yyyy-MM-dd"),
      }
    }
    if (view === "week") {
      return {
        startDate: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    }
    return {
      startDate: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
      endDate: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
    }
  }, [view, selectedDate, useCustomRange, customStartDate, customEndDate])

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    const s = parseISO(String(start || ""))
    const e = parseISO(String(end || ""))
    setUseCustomRange(isValid(s) && isValid(e))
  }

  const employeeById = useMemo(() => {
    const m = new Map<string, { name: string; pin: string }>()
    for (const e of employees) {
      m.set(e.id, { name: e.name ?? "", pin: e.pin ?? "" })
    }
    return m
  }, [employees])

  useEffect(() => {
    setPostApproveShifts(null)
  }, [selectedAbsenceId])

  useEffect(() => {
    if (!isHydrated || !isAdmin) return
    if (!employees.length) {
      setAbsences([])
      setSelectedAbsenceId(null)
      return
    }

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const sp = new URLSearchParams()
        sp.set("startDate", startDate)
        sp.set("endDate", endDate)
        for (const id of selectedEmployeeIds) {
          sp.append("employeeId", id)
        }
        const url = `/api/absences?${sp.toString()}`
        const res = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        })
        const json = await res.json().catch(() => ({} as Record<string, unknown>))
        if (!res.ok) {
          throw new Error((json as { error?: string }).error || "Failed to load leave records")
        }
        const rows = ((json as { absences?: LeaveRecordLike[] }).absences ?? []) as LeaveRecordLike[]
        const merged = rows.map((a) => {
          const oid = (a.id ?? a._id) as string | undefined
          return { ...a, _id: oid, id: oid }
        })
        merged.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))
        setAbsences(merged)
        setSelectedAbsenceId((prev) => {
          if (prev && merged.some((x) => (x._id ?? x.id) === prev)) return prev
          return merged[0]?._id ?? merged[0]?.id ?? null
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load leave records")
        setAbsences([])
        setSelectedAbsenceId(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [employees.length, selectedEmployeeIds, startDate, endDate, refreshNonce, isAdmin, isHydrated])

  const approveLeave = async (absence: LeaveRecordLike) => {
    if (!user?.id) return
    const absenceId = absence._id ?? absence.id
    if (!absenceId) return

    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/absences/${absenceId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ approverId: user.id }),
      })

      const json = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        const msg = (json as { error?: string }).error || "Failed to approve leave"
        toast.error(msg)
        throw new Error(msg)
      }

      const updated = (json as { leaveRecord?: Record<string, unknown> }).leaveRecord
      const affected = ((json as { affectedShifts?: AffectedShift[] }).affectedShifts ?? []) as AffectedShift[]

      setAbsences((prev) => {
        const next = prev.filter((r) => (r._id ?? r.id) !== absenceId)
        if (!updated) return next
        const newId = String(updated._id ?? updated.id ?? absenceId)
        const row: LeaveRecordLike = {
          ...absence,
          _id: newId,
          id: newId,
          startDate:
            updated.startDate != null
              ? new Date(updated.startDate as string | Date).toISOString()
              : absence.startDate,
          endDate:
            updated.endDate != null
              ? new Date(updated.endDate as string | Date).toISOString()
              : absence.endDate,
          leaveType: String(updated.leaveType ?? absence.leaveType),
          status: String(updated.status ?? absence.status),
          notes: typeof updated.notes === "string" ? updated.notes : absence.notes,
        }
        return [...next, row]
      })

      if (affected.length > 0) {
        setPostApproveShifts({ absenceId, shifts: affected })
        setAffectedBannerDismissed(false)
      }

      toast.success("Leave approved")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve leave")
    } finally {
      setLoading(false)
    }
  }

  const denyLeave = async () => {
    if (!user?.id || !selectedAbsence) return
    const absenceId = selectedAbsence._id ?? selectedAbsence.id
    if (!absenceId || !denyReason.trim()) {
      toast.error("Please enter a denial reason")
      return
    }

    setError(null)
    setDenySubmitting(true)
    setLoading(true)

    try {
      const res = await fetch(`/api/absences/${absenceId}/deny`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ denierId: user.id, reason: denyReason.trim() }),
      })

      const json = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        const msg = (json as { error?: string }).error || "Failed to deny leave"
        toast.error(msg)
        throw new Error(msg)
      }

      const updated = (json as { leaveRecord?: Record<string, unknown> }).leaveRecord
      setAbsences((prev) => {
        const next = prev.filter((r) => (r._id ?? r.id) !== absenceId)
        if (!updated) return next
        const newId = String(updated._id ?? updated.id ?? absenceId)
        const row: LeaveRecordLike = {
          ...selectedAbsence,
          _id: newId,
          id: newId,
          startDate:
            updated.startDate != null
              ? new Date(updated.startDate as string | Date).toISOString()
              : selectedAbsence.startDate,
          endDate:
            updated.endDate != null
              ? new Date(updated.endDate as string | Date).toISOString()
              : selectedAbsence.endDate,
          leaveType: String(updated.leaveType ?? selectedAbsence.leaveType),
          status: String(updated.status ?? selectedAbsence.status),
          notes: typeof updated.notes === "string" ? updated.notes : selectedAbsence.notes,
          denialReason:
            typeof updated.denialReason === "string" ? updated.denialReason : selectedAbsence.denialReason,
        }
        return [...next, row]
      })

      setDenyOpen(false)
      setDenyReason("")
      toast.success("Leave denied")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to deny leave")
    } finally {
      setDenySubmitting(false)
      setLoading(false)
    }
  }

  const submitAddLeave = async () => {
    if (!addEmployeeId) {
      toast.error("Select an employee")
      return
    }
    if (!addStart || !addEnd) {
      toast.error("Start and end dates are required")
      return
    }
    if (addEnd < addStart) {
      toast.error("End date must be on or after start date")
      return
    }

    setAddSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/employees/${addEmployeeId}/absences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: addStart,
          endDate: addEnd,
          leaveType: addType,
          notes: addNotes.trim() || undefined,
        }),
      })

      const json = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        const msg = (json as { error?: string }).error || "Failed to create leave"
        toast.error(msg)
        throw new Error(msg)
      }

      setAddLeaveOpen(false)
      setRefreshNonce((n) => n + 1)
      toast.success("Leave request created")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create leave")
    } finally {
      setAddSubmitting(false)
    }
  }

  const openAddLeave = () => {
    setAddEmployeeId(employees[0]?.id ?? "")
    setAddStart(startDate)
    setAddEnd(endDate)
    setAddType("ANNUAL")
    setAddNotes("")
    setAddLeaveOpen(true)
  }

  const formatAffectedShiftLine = (s: AffectedShift) => {
    const dateStr = s.date != null ? String(s.date) : ""
    let dateLabel = dateStr
    try {
      if (dateStr) {
        const raw = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`
        const d = parseISO(raw)
        if (isValid(d)) dateLabel = format(d, "EEE d MMM")
      }
    } catch {
      /* keep raw */
    }
    return `${dateLabel}  ${s.startTime}–${s.endTime}`
  }

  const leaveTypes = useMemo(() => {
    const s = new Set<string>(LEAVE_TYPE_OPTIONS)
    for (const a of absences) {
      const v = (a.leaveType || "").trim()
      if (v) s.add(v)
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [absences])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return absences
      .slice()
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))
      .filter((a) => {
        if (statusFilter !== "all") {
          const s = (a.status || "").toUpperCase()
          if (statusFilter === "pending" && s !== "PENDING") return false
          if (statusFilter === "approve" && s !== "APPROVED") return false
          if (statusFilter === "reject" && s !== "DENIED") return false
        }
        if (typeFilter !== "all" && (a.leaveType || "") !== typeFilter) return false
        if (q) {
          const emp = a.employeeId ? employeeById.get(a.employeeId) : undefined
          const hay = `${a.leaveType || ""} ${a.status || ""} ${a.notes || ""} ${a.startDate || ""} ${a.endDate || ""} ${a.employeeName || ""} ${a.employeePin || ""} ${a.employeeId || ""} ${emp?.name || ""} ${emp?.pin || ""}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
  }, [absences, search, statusFilter, typeFilter, employeeById])

  const selectedAbsence = useMemo(() => {
    if (!selectedAbsenceId) return null
    return filtered.find((a) => (a._id ?? a.id) === selectedAbsenceId) ?? null
  }, [filtered, selectedAbsenceId])

  const handleTodayClick = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
  }

  const viewSwitcher = (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
      {(
        [
          { k: "day" as const, l: "Day", Icon: AlignJustify },
          { k: "week" as const, l: "Week", Icon: Columns },
          { k: "month" as const, l: "Month", Icon: LayoutGrid },
        ] satisfies { k: TimesheetView; l: string; Icon: ComponentType<{ size?: number; className?: string }> }[]
      ).map(({ k, l, Icon }) => {
        const active = view === k
        return (
          <button
            key={k}
            type="button"
            title={l}
            onClick={() => {
              setView(k)
              setUseCustomRange(false)
            }}
            className={[
              "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
              active ? "w-[76px] bg-background font-semibold text-foreground shadow-sm" : "w-8 bg-transparent font-normal text-muted-foreground",
            ].join(" ")}
          >
            <Icon size={14} className="shrink-0" />
            <span
              className={[
                "overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out",
                active ? "max-w-[44px] opacity-100" : "max-w-0 opacity-0",
              ].join(" ")}
            >
              {l}
            </span>
          </button>
        )
      })}
    </div>
  )

  const topbarNav = (
    <div className="flex items-center gap-2">
      {view === "day" ? (
        <DateRangePicker
          value={{
            startDate: useCustomRange ? customStartDate : startDate,
            endDate: useCustomRange ? customEndDate : endDate,
          }}
          onChange={handleCustomRangeChange}
          placeholder="Select date or range"
        />
      ) : (
        <TimesheetDateNavigator
          view={view}
          selectedDate={selectedDate}
          onDateChange={(date) => {
            setSelectedDate(date)
            setUseCustomRange(false)
          }}
        />
      )}
    </div>
  )

  if (!isHydrated) {
    return (
      <CalendarPageShell
        containerClassName="px-4 sm:px-6"
        toolbar={
          <UnifiedCalendarTopbar
            className="print:hidden"
            onToday={() => {}}
            title={<span suppressHydrationWarning>{format(selectedDate, "MMMM yyyy")}</span>}
            nav={topbarNav}
            viewSwitcher={viewSwitcher}
            actions={null}
          />
        }
      >
        <div className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Loading…</CardTitle>
              <CardDescription>Preparing leave requests.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CalendarPageShell>
    )
  }

  return (
    <CalendarPageShell
      containerClassName="px-4 sm:px-6"
      toolbar={
        <UnifiedCalendarTopbar
          className="print:hidden"
          onToday={handleTodayClick}
          title={format(selectedDate, "MMMM yyyy")}
          nav={topbarNav}
          viewSwitcher={viewSwitcher}
          actions={
            isAdmin ? (
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" disabled={!employees.length} onClick={openAddLeave}>
                  <Plus className="size-4" />
                  Add Leave
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || !employees.length}
                  onClick={() => setRefreshNonce((n) => n + 1)}
                >
                  <RefreshCw className="size-4" />
                  Refresh
                </Button>
              </div>
            ) : null
          }
        />
      }
    >
      <>
      <div className="space-y-4 py-4">
        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin access required</CardTitle>
              <CardDescription>This page requires admin permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your current role doesn&apos;t have access to leave approvals.
              </p>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <>
            <Card className="print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Employee</label>
                    <MultiSelect
                      options={employees.map((e) => ({
                        label: `${e.name} (${e.pin})`,
                        value: e.id,
                      }))}
                      defaultValue={selectedEmployeeIds}
                      onValueChange={setSelectedEmployeeIds}
                      placeholder="All employees"
                      searchable
                      className="min-w-[200px] max-w-[280px]"
                    />
                  </div>

                  <div className="min-w-[200px] flex-1 space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Notes, type, status, name…"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="w-[200px] space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Leave type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {leaveTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[180px] space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approve">Approved</SelectItem>
                        <SelectItem value="reject">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">All dates</CardTitle>
                  <CardDescription>
                    {loading ? "Loading..." : filtered.length ? `Showing ${filtered.length}` : "No requests found."}
                  </CardDescription>
                </CardHeader>
                <Separator />
                <ScrollArea className="h-[520px]">
                  <div className="space-y-2 p-2">
                    {filtered.map((a) => {
                      const id = (a._id ?? a.id) as string | undefined
                      const isActive = !!id && id === selectedAbsenceId
                      const st = statusBadge(a.status)
                      const emp = a.employeeId ? employeeById.get(a.employeeId) : undefined
                      const displayName = displayEmployee(a, emp)
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
                              <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {a.startDate ?? "—"} → {a.endDate ?? "—"}
                              </div>
                            </div>
                            <Badge variant="outline" className={cn("shrink-0", st.className)}>
                              {st.label}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{a.leaveType ?? "—"}</span>
                            {a.notes?.trim() ? (
                              <>
                                <span className="opacity-40">•</span>
                                <span className="truncate">{a.notes}</span>
                              </>
                            ) : null}
                          </div>
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
                          ? displayEmployee(
                              selectedAbsence,
                              selectedAbsence.employeeId
                                ? employeeById.get(selectedAbsence.employeeId)
                                : undefined,
                            )
                          : "—"}
                      </CardTitle>
                      <CardDescription>
                        {selectedAbsence
                          ? `${selectedAbsence.startDate ?? "—"} → ${selectedAbsence.endDate ?? "—"}`
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
                            {selectedAbsence.startDate ?? "—"} → {selectedAbsence.endDate ?? "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Leave type</div>
                          <div className="text-sm font-semibold text-foreground">{selectedAbsence.leaveType ?? "—"}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Reason</div>
                        <div className="rounded-lg border bg-background p-3 text-sm text-foreground">
                          {selectedAbsence.notes?.trim() ? selectedAbsence.notes : "—"}
                        </div>
                      </div>

                      {selectedAbsence.denialReason?.trim() ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Denial reason</div>
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                            {selectedAbsence.denialReason}
                          </div>
                        </div>
                      ) : null}

                      {postApproveShifts &&
                        postApproveShifts.absenceId === (selectedAbsence._id ?? selectedAbsence.id) &&
                        postApproveShifts.shifts.length > 0 &&
                        !affectedBannerDismissed && (
                          <div className="relative rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm">
                            <button
                              type="button"
                              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                              aria-label="Dismiss"
                              onClick={() => setAffectedBannerDismissed(true)}
                            >
                              <X className="size-4" />
                            </button>
                            <p className="pr-8 font-medium text-foreground">
                              ℹ️ {postApproveShifts.shifts.length} scheduled shift
                              {postApproveShifts.shifts.length === 1 ? " was" : "s were"} affected by this approval.
                            </p>
                            <ul className="mt-2 space-y-1 text-muted-foreground">
                              {postApproveShifts.shifts.map((s) => (
                                <li key={s.shiftId}>{formatAffectedShiftLine(s)}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={loading || isLeaveFinalStatus(selectedAbsence.status)}
                          onClick={() => void approveLeave(selectedAbsence)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={loading || isLeaveFinalStatus(selectedAbsence.status)}
                          onClick={() => {
                            setDenyReason("")
                            setDenyOpen(true)
                          }}
                        >
                          Deny
                        </Button>
                        <Button type="button" variant="outline" disabled={loading} onClick={() => setRefreshNonce((n) => n + 1)}>
                          Refresh
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={addLeaveOpen} onOpenChange={setAddLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add leave</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-leave-employee">Employee</Label>
              <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
                <SelectTrigger id="add-leave-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.pin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-leave-start">Start date</Label>
                <Input id="add-leave-start" type="date" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-leave-end">End date</Label>
                <Input id="add-leave-end" type="date" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-leave-type">Leave type</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as (typeof LEAVE_TYPE_OPTIONS)[number])}>
                <SelectTrigger id="add-leave-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-leave-notes">Notes (optional)</Label>
              <Textarea
                id="add-leave-notes"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddLeaveOpen(false)} disabled={addSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAddLeave()} disabled={addSubmitting}>
              {addSubmitting ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deny leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="deny-reason">Denial reason</Label>
            <Textarea
              id="deny-reason"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Explain why this request is denied"
              rows={4}
              minLength={1}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDenyOpen(false)} disabled={denySubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={denySubmitting || !denyReason.trim()}
              onClick={() => void denyLeave()}
            >
              {denySubmitting ? "Denying…" : "Confirm deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    </CalendarPageShell>
  )
}
