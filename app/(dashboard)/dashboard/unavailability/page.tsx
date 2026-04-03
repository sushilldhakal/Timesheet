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
import { MultiSelect } from "@/components/ui/MultiSelect"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { AlignJustify, Columns, LayoutGrid, RefreshCw, Search } from "lucide-react"
import { cn } from "@/lib/utils/cn"

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

const FETCH_CHUNK = 25

function toYmd(d: string | null | undefined): string | null {
  if (d == null || d === "") return null
  const s = String(d)
  return s.length >= 10 ? s.slice(0, 10) : null
}

/** API returns all constraints; filter by calendar range. Permanent rules (no temp window) always match. */
function constraintOverlapsRange(c: AvailabilityConstraintLike, rangeStart: string, rangeEnd: string): boolean {
  const ts = toYmd(c.temporaryStartDate ?? undefined)
  const te = toYmd(c.temporaryEndDate ?? undefined)
  if (!ts && !te) return true
  const winStart = ts ?? "0000-01-01"
  const winEnd = te ?? "9999-12-31"
  return !(winEnd < rangeStart || winStart > rangeEnd)
}

function formatDays(days: number[] | undefined) {
  if (!days?.length) return "—"
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? `Day ${d}`)
    .join(", ")
}

function constraintKey(c: AvailabilityConstraintLike): string {
  return String(c._id ?? c.id ?? "")
}

export default function UnavailabilityPage() {
  const { userRole, isHydrated } = useAuth()
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
  const [constraints, setConstraints] = useState<AvailabilityConstraintLike[]>([])
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

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

  const employeeIdsToQuery = useMemo(() => {
    if (!employees.length) return [] as string[]
    if (selectedEmployeeIds.length > 0) return selectedEmployeeIds
    return employees.map((e) => e.id)
  }, [employees, selectedEmployeeIds])

  const employeeById = useMemo(() => {
    const m = new Map<string, { name: string; pin: string }>()
    for (const e of employees) {
      m.set(e.id, { name: e.name ?? "", pin: e.pin ?? "" })
    }
    return m
  }, [employees])

  useEffect(() => {
    if (!isHydrated || !isAdmin) return
    if (!employeeIdsToQuery.length) {
      setConstraints([])
      setSelectedConstraintId(null)
      return
    }

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const merged: AvailabilityConstraintLike[] = []
        for (let i = 0; i < employeeIdsToQuery.length; i += FETCH_CHUNK) {
          if (controller.signal.aborted) return
          const chunk = employeeIdsToQuery.slice(i, i + FETCH_CHUNK)
          const chunkResults = await Promise.all(
            chunk.map(async (employeeId) => {
              const res = await fetch(`/api/employees/${employeeId}/availability`, {
                credentials: "include",
                signal: controller.signal,
              })
              const json = await res.json().catch(() => ({} as Record<string, unknown>))
              if (!res.ok) {
                throw new Error((json as { error?: string }).error || "Failed to load unavailability constraints")
              }
              const list = ((json as { constraints?: AvailabilityConstraintLike[] }).constraints ?? []) as AvailabilityConstraintLike[]
              return list.map((c) => ({ ...c, employeeId }))
            }),
          )
          for (const arr of chunkResults) merged.push(...arr)
        }
        setConstraints(merged)
        setSelectedConstraintId((prev) => {
          if (prev && merged.some((c) => constraintKey(c) === prev)) return prev
          const first = merged[0]
          return first ? constraintKey(first) : null
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load unavailability constraints")
        setConstraints([])
        setSelectedConstraintId(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [employeeIdsToQuery, refreshNonce, isAdmin, isHydrated])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return constraints.filter((c) => {
      if (!constraintOverlapsRange(c, startDate, endDate)) return false
      if (!q) return true
      const emp = c.employeeId ? employeeById.get(c.employeeId) : undefined
      const hay = [
        c.reason,
        formatDays(c.unavailableDays),
        c.preferredShiftTypes?.join(" "),
        emp?.name,
        emp?.pin,
        toYmd(c.temporaryStartDate ?? undefined),
        toYmd(c.temporaryEndDate ?? undefined),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [constraints, startDate, endDate, search, employeeById])

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

  const deleteConstraint = async (c: AvailabilityConstraintLike) => {
    const constraintId = c._id ?? c.id
    const employeeId = c.employeeId
    if (!constraintId || !employeeId) return

    const ok = window.confirm("Delete this unavailability constraint?")
    if (!ok) return

    setError(null)

    try {
      const res = await fetch(
        `/api/employees/${employeeId}/availability?constraintId=${encodeURIComponent(String(constraintId))}`,
        { method: "DELETE", credentials: "include" },
      )
      const json = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Failed to delete constraint")
      if (!(json as { success?: boolean }).success) throw new Error("Delete failed")

      setRefreshNonce((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete constraint")
    }
  }

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
              <CardDescription>Preparing unavailability.</CardDescription>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !employeeIdsToQuery.length}
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            ) : null
          }
        />
      }
    >
      <div className="space-y-4 py-4">
        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin access required</CardTitle>
              <CardDescription>This page requires admin permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your current role doesn&apos;t have access to availability constraints.
              </p>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <>
            <Card className="print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filters</CardTitle>
                <CardDescription>
                  Calendar range filters constraints with a temporary window; permanent rules always appear.
                </CardDescription>
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
                        placeholder="Reason, days, employee…"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Constraints</CardTitle>
                  <CardDescription>
                    {loading
                      ? "Loading..."
                      : filtered.length
                        ? `Showing ${filtered.length} in range`
                        : "No constraints in this range."}
                  </CardDescription>
                </CardHeader>
                <Separator />
                <ScrollArea className="h-[520px]">
                  <div className="space-y-2 p-2">
                    {filtered.map((c) => {
                      const id = constraintKey(c)
                      const isActive = id === selectedConstraintId
                      const emp = c.employeeId ? employeeById.get(c.employeeId) : undefined
                      const displayName = emp ? `${emp.name} (${emp.pin})` : "Employee"
                      const hasTemp = !!(toYmd(c.temporaryStartDate ?? undefined) || toYmd(c.temporaryEndDate ?? undefined))
                      return (
                        <button
                          key={id || `c-${c.employeeId}-${formatDays(c.unavailableDays)}`}
                          type="button"
                          onClick={() => setSelectedConstraintId(id || null)}
                          className={cn(
                            "w-full rounded-lg border p-3 text-left transition-colors",
                            isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
                              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{formatDays(c.unavailableDays)}</div>
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
                        {selectedConstraint?.employeeId
                          ? (() => {
                              const emp = employeeById.get(selectedConstraint.employeeId!)
                              return emp ? `${emp.name} (${emp.pin})` : "—"
                            })()
                          : "—"}
                      </CardTitle>
                      <CardDescription>
                        {selectedConstraint ? "Availability constraint details" : "Select a constraint to view details."}
                      </CardDescription>
                    </div>
                    {selectedConstraint && (
                      <Badge variant="outline">
                        {toYmd(selectedConstraint.temporaryStartDate ?? undefined) ||
                        toYmd(selectedConstraint.temporaryEndDate ?? undefined)
                          ? "Temporary"
                          : "Permanent"}
                      </Badge>
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
                          <div className="text-sm font-semibold text-foreground">{formatDays(selectedConstraint.unavailableDays)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Time ranges</div>
                          <div className="text-sm text-foreground">
                            {selectedConstraint.unavailableTimeRanges?.length
                              ? selectedConstraint.unavailableTimeRanges.map((r) => `${r.start}–${r.end}`).join(", ")
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Preferred shift types</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedConstraint.preferredShiftTypes?.length
                              ? selectedConstraint.preferredShiftTypes.join(", ")
                              : "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Max consecutive days</div>
                          <div className="text-sm text-muted-foreground">{selectedConstraint.maxConsecutiveDays ?? "—"}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Min rest hours</div>
                          <div className="text-sm text-muted-foreground">{selectedConstraint.minRestHours ?? "—"}</div>
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

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={loading || !constraintKey(selectedConstraint)}
                          onClick={() => void deleteConstraint(selectedConstraint)}
                        >
                          Delete
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
    </CalendarPageShell>
  )
}
