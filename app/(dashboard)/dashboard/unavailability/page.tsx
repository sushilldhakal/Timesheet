"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin, isManager, isSupervisor } from "@/lib/config/roles"
import { useEmployees } from "@/lib/queries/employees"
import { useTeams } from "@/lib/queries/teams"
import { getBulkAvailabilityByLocation, approveAvailabilityConstraint, declineAvailabilityConstraint } from "@/lib/api/availability"
import type { AvailabilityConstraint } from "@/lib/api/availability"
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
import type { DateRange } from "react-day-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { AlignJustify, Columns, LayoutGrid, RefreshCw, Search } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { useDashboardLocationScope } from "@/components/providers/DashboardLocationScopeProvider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

type ConstraintLike = AvailabilityConstraint & {
  employeeName?: string
  employeePin?: string
  status?: string
  approvedBy?: string
  approvedAt?: string
}

function toYmd(d: string | null | undefined): string | null {
  if (d == null || d === "") return null
  return String(d).length >= 10 ? String(d).slice(0, 10) : null
}

function constraintOverlapsRange(c: ConstraintLike, rangeStart: string, rangeEnd: string): boolean {
  const ts = toYmd(c.temporaryStartDate)
  const te = toYmd(c.temporaryEndDate)
  if (!ts && !te) return true
  const winStart = ts ?? "0000-01-01"
  const winEnd = te ?? "9999-12-31"
  return !(winEnd < rangeStart || winStart > rangeEnd)
}

function formatDays(days: number[] | undefined) {
  if (!days?.length) return "—"
  return days.slice().sort((a, b) => a - b).map((d) => DAY_NAMES[d] ?? `Day ${d}`).join(", ")
}

const constraintKey = (c: ConstraintLike): string => String(c._id ?? c.id ?? "")

// ─── Chart ────────────────────────────────────────────────────────────────────
function UnavailabilityChart({
  constraints,
  startDate,
  endDate,
  onDayClick,
}: {
  constraints: ConstraintLike[]
  startDate: string
  endDate: string
  onDayClick?: (date: string) => void
}) {
  const days = useMemo(() => {
    const out: { date: string; dayName: string; dayNum: string; count: number; isWeekend: boolean }[] = []
    try {
      const s = parseISO(startDate)
      const e = parseISO(endDate)
      if (!isValid(s) || !isValid(e)) return out
      const cur = new Date(s)
      while (cur <= e) {
        const ymd = format(cur, "yyyy-MM-dd")
        const dow = cur.getDay()
        const count = constraints.filter((c) => constraintOverlapsRange(c, ymd, ymd)).length
        out.push({ date: ymd, dayName: format(cur, "EEE"), dayNum: format(cur, "d"), count, isWeekend: dow === 0 || dow === 6 })
        cur.setDate(cur.getDate() + 1)
      }
    } catch { /* ignore */ }
    return out
  }, [constraints, startDate, endDate])

  const maxCount = Math.max(1, ...days.map((d) => d.count))
  if (days.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 print:hidden overflow-x-auto">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          ▼ Unavailability {format(parseISO(startDate), "EEE, d MMM")} – {format(parseISO(endDate), "EEE, d MMM")}
        </span>
        <span className="text-xs text-muted-foreground">Click on a day to filter</span>
      </div>
      <div className="flex gap-0" style={{ minWidth: days.length * 28 }}>
        <div className="flex flex-col justify-between pr-1 text-right shrink-0" style={{ width: 16 }}>
          <span className="text-[9px] text-muted-foreground leading-none">{maxCount}</span>
          <span className="text-[9px] text-muted-foreground leading-none">0</span>
        </div>
        <div className="flex flex-1 items-end gap-px">
          {days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center min-w-[20px]">
              <div className="w-full flex items-end" style={{ height: 52 }}>
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-colors",
                    d.count > 0 ? "bg-emerald-500 hover:bg-emerald-400 cursor-pointer" : "bg-transparent",
                  )}
                  style={{ height: d.count > 0 ? `${Math.max(4, (d.count / maxCount) * 52)}px` : 0 }}
                  title={d.count > 0 ? `${d.count} on ${d.date}` : undefined}
                  onClick={() => d.count > 0 && onDayClick?.(d.date)}
                />
              </div>
              <span className={cn("mt-0.5 text-[9px] leading-none", d.isWeekend ? "text-red-500" : "text-muted-foreground")}>
                {d.dayName}
              </span>
              <span className={cn("text-[9px] leading-none", d.isWeekend ? "text-red-500" : "text-muted-foreground")}>
                {d.dayNum}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UnavailabilityPage() {
  const { userRole, isHydrated } = useAuth()
  const canManage = isHydrated && (isAdminOrSuperAdmin(userRole) || isManager(userRole) || isSupervisor(userRole))

  const employeesQuery = useEmployees(500)
  const teamsQuery = useTeams()
  const allEmployees = employeesQuery.data?.employees ?? []
  const { selectedLocationNames, isReady: locationScopeReady } = useDashboardLocationScope()

  const allTeams = useMemo(() =>
    (teamsQuery.data?.teams ?? []).map((t: any) => ({ id: String(t.id ?? t._id), name: String(t.name ?? "") })),
    [teamsQuery.data]
  )
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const showTeamFilter = allTeams.length > 1

  const locationEmployees = useMemo(() => {
    if (selectedLocationNames.length === 0) return allEmployees
    return allEmployees.filter((e) =>
      (e.locations ?? []).some((l) => selectedLocationNames.includes(l.name))
    )
  }, [allEmployees, selectedLocationNames])

  const [view, setView] = useState<TimesheetView>("week")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  const [refreshNonce, setRefreshNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [constraints, setConstraints] = useState<ConstraintLike[]>([])
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [spotlightDate, setSpotlightDate] = useState<string | null>(null)

  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const { startDate, endDate } = useMemo(() => {
    if (useCustomRange && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: format(customDateRange.from, "yyyy-MM-dd"),
        endDate: format(customDateRange.to, "yyyy-MM-dd"),
      }
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
  }, [view, selectedDate, useCustomRange, customDateRange])

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomDateRange(range)
    if (range?.from && range?.to) {
      setUseCustomRange(true)
      setSelectedDate(range.from)
    } else {
      setUseCustomRange(false)
    }
  }

  const locationNamesKey = selectedLocationNames.join(",")

  useEffect(() => {
    if (!isHydrated || !canManage || !locationScopeReady) return
    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const json = await getBulkAvailabilityByLocation(selectedLocationNames, startDate, endDate)
        const rows = (json.constraints ?? []) as ConstraintLike[]
        setConstraints(rows)
        setSelectedConstraintId((prev) => {
          if (prev && rows.some((c) => constraintKey(c) === prev)) return prev
          return rows[0] ? constraintKey(rows[0]) : null
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load unavailability")
        setConstraints([])
        setSelectedConstraintId(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void run()
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationNamesKey, startDate, endDate, refreshNonce, canManage, isHydrated, locationScopeReady])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const teamFilteredIds = selectedTeamIds.length > 0
      ? new Set(
          locationEmployees
            .filter((e) => (e.teams ?? []).some((t: any) => selectedTeamIds.includes(String(t.team?.id ?? t.id ?? t._id))))
            .map((e) => e.id)
        )
      : null

    return constraints.filter((c) => {
      if (!constraintOverlapsRange(c, startDate, endDate)) return false
      if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes(c.employeeId ?? "")) return false
      if (teamFilteredIds && !teamFilteredIds.has(c.employeeId ?? "")) return false
      if (statusFilter !== "all") {
        const s = (c.status ?? "").toLowerCase()
        if (statusFilter === "pending" && !s.includes("pending") && s !== "") return false
        if (statusFilter === "approved" && !s.includes("approv")) return false
        if (statusFilter === "declined" && !s.includes("declin") && !s.includes("denied") && !s.includes("reject")) return false
      }
      if (spotlightDate && !constraintOverlapsRange(c, spotlightDate, spotlightDate)) return false
      if (!q) return true
      const hay = [
        c.reason,
        formatDays(c.unavailableDays),
        c.preferredShiftTypes?.join(" "),
        (c as any).employeeName,
        (c as any).employeePin,
        toYmd(c.temporaryStartDate),
        toYmd(c.temporaryEndDate),
      ].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [constraints, startDate, endDate, search, selectedEmployeeIds, selectedTeamIds, locationEmployees, statusFilter, spotlightDate])

  const selectedConstraint = useMemo(() => {
    if (!selectedConstraintId) return null
    return filtered.find((c) => constraintKey(c) === selectedConstraintId) ?? null
  }, [filtered, selectedConstraintId])

  useEffect(() => {
    if (!selectedConstraintId) return
    if (!filtered.some((c) => constraintKey(c) === selectedConstraintId)) {
      setSelectedConstraintId(filtered[0] ? constraintKey(filtered[0]) : null)
    }
  }, [filtered, selectedConstraintId])

  const handleTodayClick = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
  }

  const handleApprove = async (c: ConstraintLike) => {
    const id = constraintKey(c)
    if (!id || !c.employeeId) return
    setActionLoading(true)
    try {
      const json = await approveAvailabilityConstraint(c.employeeId, id)
      setConstraints((prev) => prev.map((x) => constraintKey(x) === id ? { ...x, ...(json.constraint as any) } : x))
      toast.success("Unavailability approved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    const c = selectedConstraint
    if (!c || !c.employeeId) return
    const id = constraintKey(c)
    if (!declineReason.trim()) { toast.error("Decline reason is required"); return }
    setActionLoading(true)
    try {
      const json = await declineAvailabilityConstraint(c.employeeId, id, declineReason.trim())
      setConstraints((prev) => prev.map((x) => constraintKey(x) === id ? { ...x, ...(json.constraint as any) } : x))
      setDeclineOpen(false)
      setDeclineReason("")
      toast.success("Unavailability declined")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to decline")
    } finally {
      setActionLoading(false)
    }
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
            onClick={() => { setView(k); setUseCustomRange(false) }}
            className={[
              "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
              active ? "w-[76px] bg-background font-semibold text-foreground shadow-sm" : "w-8 bg-transparent font-normal text-muted-foreground",
            ].join(" ")}
          >
            <Icon size={14} className="shrink-0" />
            <span className={["overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out", active ? "max-w-[44px] opacity-100" : "max-w-0 opacity-0"].join(" ")}>
              {l}
            </span>
          </button>
        )
      })}
    </div>
  )

  const topbarNav = (
    <TimesheetDateNavigator
      view={view}
      selectedDate={selectedDate}
      onDateChange={(date) => { setSelectedDate(date); setUseCustomRange(false) }}
      rangeValue={
        view === "day" && useCustomRange && customDateRange?.from && customDateRange?.to
          ? { startDate: format(customDateRange.from, "yyyy-MM-dd"), endDate: format(customDateRange.to, "yyyy-MM-dd") }
          : undefined
      }
      onRangeChange={(start, end) => {
        if (!start) { setUseCustomRange(false); setCustomDateRange(undefined); return }
        const from = parseISO(start)
        const to = parseISO(end)
        if (isValid(from) && isValid(to)) { setCustomDateRange({ from, to }); setUseCustomRange(true); setSelectedDate(from) }
      }}
    />
  )

  const toolbar = (
    <UnifiedCalendarTopbar
      className="print:hidden"
      onToday={handleTodayClick}
      title={format(selectedDate, "MMMM yyyy")}
      nav={topbarNav}
      viewSwitcher={viewSwitcher}
      actions={
        canManage ? (
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => setRefreshNonce((n) => n + 1)}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        ) : null
      }
    />
  )

  if (!isHydrated) {
    return (
      <CalendarPageShell containerClassName="px-4 sm:px-6" toolbar={toolbar}>
        <div className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Loading…</CardTitle>
              <CardDescription>Preparing unavailability.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CalendarPageShell>
    )
  }

  return (
    <CalendarPageShell containerClassName="px-4 sm:px-6" toolbar={toolbar}>
      <div className="space-y-4 py-4">
        {!canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Access required</CardTitle>
              <CardDescription>This page requires manager or supervisor permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your current role doesn&apos;t have access to unavailability.</p>
            </CardContent>
          </Card>
        )}

        {canManage && (
          <>
            <Card className="print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Employee</label>
                    <MultiSelect
                      options={locationEmployees.map((e) => ({ label: `${e.name} (${e.pin})`, value: e.id }))}
                      defaultValue={selectedEmployeeIds}
                      onValueChange={setSelectedEmployeeIds}
                      placeholder="All employees"
                      searchable
                      className="min-w-[200px] max-w-[280px]"
                    />
                  </div>

                  {showTeamFilter && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">Team</label>
                      <MultiSelect
                        options={allTeams.map((t) => ({ label: t.name, value: t.id }))}
                        defaultValue={selectedTeamIds}
                        onValueChange={setSelectedTeamIds}
                        placeholder="All teams"
                        searchable
                        className="min-w-[180px] max-w-[240px]"
                      />
                    </div>
                  )}

                  <div className="min-w-[200px] flex-1 space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Reason, days, employee…"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="w-[160px] space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <UnavailabilityChart
              constraints={filtered}
              startDate={startDate}
              endDate={endDate}
              onDayClick={(date) => {
                setSpotlightDate((prev) => prev === date ? null : date)
                const match = filtered.find((c) => constraintOverlapsRange(c, date, date))
                if (match) setSelectedConstraintId(constraintKey(match))
              }}
            />

            <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
              {/* Left: list */}
              <Card className="overflow-hidden">
                {spotlightDate ? (
                  <div className="border-b border-border">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Spotlight on…</span>
                      <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => setSpotlightDate(null)}>
                        Clear spotlight
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => {
                        const d = parseISO(spotlightDate)
                        if (isValid(d)) setSpotlightDate(format(new Date(d.getTime() - 86400000), "yyyy-MM-dd"))
                      }}>‹</button>
                      <span className="text-sm font-semibold flex-1 text-center">
                        {(() => { try { const d = parseISO(spotlightDate); return isValid(d) ? format(d, "EEE, d MMMM") : spotlightDate } catch { return spotlightDate } })()}
                      </span>
                      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => {
                        const d = parseISO(spotlightDate)
                        if (isValid(d)) setSpotlightDate(format(new Date(d.getTime() + 86400000), "yyyy-MM-dd"))
                      }}>›</button>
                    </div>
                    {filtered.length > 0 && (
                      <div className="px-4 pb-2">
                        <div className="rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                          {filtered.length} constraint{filtered.length === 1 ? "" : "s"} on this day
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {loading ? "Loading…" : filtered.length ? `${filtered.length} constraint${filtered.length === 1 ? "" : "s"}` : "No constraints in range"}
                    </span>
                  </div>
                )}
                <ScrollArea className="h-[520px]">
                  <div className="space-y-1 p-2">
                    {filtered.map((c) => {
                      const id = constraintKey(c)
                      const isActive = id === selectedConstraintId
                      const name = (c as any).employeeName || "Employee"
                      const pin = (c as any).employeePin
                      const hasTemp = !!(toYmd(c.temporaryStartDate) || toYmd(c.temporaryEndDate))
                      return (
                        <button
                          key={id || `c-${c.employeeId}`}
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
                                {name}{pin ? ` (${pin})` : ""}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground truncate">{formatDays(c.unavailableDays)}</div>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {hasTemp ? "Temporary" : "Permanent"}
                            </Badge>
                          </div>
                          {c.reason?.trim() && (
                            <div className="mt-1.5 truncate text-xs text-muted-foreground">{c.reason}</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </Card>

              {/* Right: detail */}
              <Card className="overflow-hidden">
                {!selectedConstraint ? (
                  <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                    Select a constraint to view details.
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground leading-tight">
                          {selectedConstraint.employeeName || "Employee"}
                          {selectedConstraint.employeePin ? ` (${selectedConstraint.employeePin})` : ""}
                        </h2>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {toYmd(selectedConstraint.temporaryStartDate) || toYmd(selectedConstraint.temporaryEndDate)
                            ? "Temporary unavailability"
                            : "Permanent unavailability"}
                        </div>
                      </div>
                      {(() => {
                        const s = selectedConstraint.status ?? "PENDING"
                        const cls = s === "APPROVED"
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : s === "DECLINED"
                          ? "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300"
                          : "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        return <Badge variant="outline" className={cls}>{s}</Badge>
                      })()}
                    </div>

                    <Separator />

                    <div className="flex-1 overflow-auto p-5 space-y-5">
                      <dl className="space-y-3 text-sm">
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd className="font-medium">
                            {selectedConstraint.employeeName || "—"}
                            {selectedConstraint.employeePin ? ` (${selectedConstraint.employeePin})` : ""}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Team</dt>
                          <dd className="font-medium">
                            {selectedConstraint.teams && selectedConstraint.teams.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {selectedConstraint.teams.map((t) => (
                                  <span
                                    key={t.id}
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                    style={{ backgroundColor: t.color ?? '#6b7280' }}
                                  >
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            ) : "—"}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Date</dt>
                          <dd className="font-medium">
                            {toYmd(selectedConstraint.temporaryStartDate)
                              ? `${toYmd(selectedConstraint.temporaryStartDate)} → ${toYmd(selectedConstraint.temporaryEndDate) ?? "onwards"}`
                              : "Permanent"}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Repeats</dt>
                          <dd className="font-medium">{formatDays(selectedConstraint.unavailableDays)}</dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Frequency</dt>
                          <dd className="font-medium">{selectedConstraint.unavailableDays?.length ? "Weekly" : "—"}</dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Time ranges</dt>
                          <dd className="font-medium">
                            {selectedConstraint.unavailableTimeRanges?.length
                              ? selectedConstraint.unavailableTimeRanges.map((r) => `${r.start}–${r.end}`).join(", ")
                              : "—"}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Requested</dt>
                          <dd className="font-medium">
                            {selectedConstraint.createdAt
                              ? (() => { try { const d = parseISO(selectedConstraint.createdAt); return isValid(d) ? format(d, "EEE d MMM yyyy, h:mmaaa") : "—" } catch { return "—" } })()
                              : "—"}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Approved by</dt>
                          <dd className="font-medium">{selectedConstraint.approvedBy || "—"}</dd>
                        </div>
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Approved</dt>
                          <dd className="font-medium">
                            {selectedConstraint.approvedAt
                              ? (() => { try { const d = parseISO(selectedConstraint.approvedAt); return isValid(d) ? format(d, "EEE d MMM yyyy, h:mmaaa") : "—" } catch { return "—" } })()
                              : "—"}
                          </dd>
                        </div>
                        {selectedConstraint.declineReason && (
                          <div className="grid grid-cols-[140px_1fr]">
                            <dt className="text-muted-foreground">Decline reason</dt>
                            <dd className="font-medium text-destructive">{selectedConstraint.declineReason}</dd>
                          </div>
                        )}
                        <div className="grid grid-cols-[140px_1fr]">
                          <dt className="text-muted-foreground">Reason</dt>
                          <dd className="font-medium">{selectedConstraint.reason?.trim() || "—"}</dd>
                        </div>
                        {(selectedConstraint.maxConsecutiveDays != null || selectedConstraint.minRestHours != null) && (
                          <>
                            <div className="grid grid-cols-[140px_1fr]">
                              <dt className="text-muted-foreground">Max consecutive days</dt>
                              <dd className="font-medium">{selectedConstraint.maxConsecutiveDays ?? "—"}</dd>
                            </div>
                            <div className="grid grid-cols-[140px_1fr]">
                              <dt className="text-muted-foreground">Min rest hours</dt>
                              <dd className="font-medium">{selectedConstraint.minRestHours ?? "—"}</dd>
                            </div>
                          </>
                        )}
                      </dl>

                      {selectedConstraint.status !== "APPROVED" && selectedConstraint.status !== "DECLINED" && (
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button type="button" size="sm" disabled={actionLoading} onClick={() => handleApprove(selectedConstraint)}>
                            Approve
                          </Button>
                          <Button type="button" size="sm" variant="destructive" disabled={actionLoading} onClick={() => setDeclineOpen(true)}>
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline unavailability</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter reason for declining…"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setDeclineOpen(false); setDeclineReason("") }}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={actionLoading || !declineReason.trim()} onClick={handleDecline}>
                Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CalendarPageShell>
  )
}
