"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { useEmployees } from "@/lib/queries/employees"
import { format, endOfMonth, startOfMonth } from "date-fns"
import { useEffect, useMemo, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { Calendar, RefreshCw, Search, User } from "lucide-react"
import { cn } from "@/lib/utils/cn"

type LeaveRecordLike = {
  _id?: string
  id?: string
  employeeId?: string
  startDate?: string
  endDate?: string
  leaveType?: string
  status?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
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

export default function LeavePage() {
  const { user, userRole, isHydrated } = useAuth()
  const isAdmin = isHydrated && isAdminOrSuperAdmin(userRole)

  const employeesQuery = useEmployees(500)
  const employees = employeesQuery.data?.employees ?? []

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const defaultStart = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), [])
  const defaultEnd = useMemo(() => format(endOfMonth(new Date()), "yyyy-MM-dd"), [])
  const [startDate, setStartDate] = useState<string>(defaultStart)
  const [endDate, setEndDate] = useState<string>(defaultEnd)
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [absences, setAbsences] = useState<LeaveRecordLike[]>([])
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    if (!employees.length) return
    setSelectedEmployeeId((prev) => prev ?? employees[0]!.id)
  }, [employees])

  useEffect(() => {
    if (!selectedEmployeeId) return
    if (!isHydrated) return
    if (!isAdmin) return

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/employees/${selectedEmployeeId}/absences?startDate=${encodeURIComponent(
          startDate,
        )}&endDate=${encodeURIComponent(endDate)}`

        const res = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        })

        const json = await res.json().catch(() => ({} as any))
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load leave records")
        }

        const next = (json?.absences ?? []) as LeaveRecordLike[]
        setAbsences(next)
        setSelectedAbsenceId((prev) => prev ?? (next[0]?._id ?? next[0]?.id ?? null))
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load leave records")
        setAbsences([])
        setSelectedAbsenceId(null)
      } finally {
        setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [selectedEmployeeId, startDate, endDate, refreshNonce, isAdmin, isHydrated])

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

      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(json?.error || "Failed to approve leave")
      }

      const updated = json?.leaveRecord ? ([json.leaveRecord] as LeaveRecordLike[]) : []
      setAbsences((prev) => {
        const next = prev.filter((r) => (r._id ?? r.id) !== absenceId)
        return [...next, ...updated]
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve leave")
    } finally {
      setLoading(false)
    }
  }

  const leaveTypes = useMemo(() => {
    const s = new Set<string>()
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
          const s = (a.status || "").toLowerCase()
          if (!s.includes(statusFilter)) return false
        }
        if (typeFilter !== "all" && (a.leaveType || "") !== typeFilter) return false
        if (q) {
          const hay = `${a.leaveType || ""} ${a.status || ""} ${a.notes || ""} ${a.startDate || ""} ${a.endDate || ""}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
  }, [absences, search, statusFilter, typeFilter])

  const selectedAbsence = useMemo(() => {
    if (!selectedAbsenceId) return null
    return filtered.find((a) => (a._id ?? a.id) === selectedAbsenceId) ?? null
  }, [filtered, selectedAbsenceId])

  if (!isHydrated) {
    return (
      <CalendarPageShell
        containerClassName="px-4 sm:px-6"
        toolbar={
          <UnifiedCalendarTopbar
            className="print:hidden"
            onToday={() => {
              // no-op until hydrated
            }}
            title={
              <span className="flex items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-md border bg-muted/30">
                  <Calendar className="size-4 text-primary" />
                </span>
                <span className="text-base font-semibold text-foreground">Leave Requests</span>
              </span>
            }
            nav={<DateRangePicker value={{ startDate, endDate }} onChange={() => {}} placeholder="Date range" />}
            peopleSelect={null}
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
          onToday={() => {
            setStartDate(defaultStart)
            setEndDate(defaultEnd)
          }}
          title={
            <span className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-md border bg-muted/30">
                <Calendar className="size-4 text-primary" />
              </span>
              <span className="text-base font-semibold text-foreground">Leave Requests</span>
            </span>
          }
          titleBadge={
            isAdmin ? (
              <Badge variant="outline" className="rounded-full">
                {filtered.length} request{filtered.length === 1 ? "" : "s"}
              </Badge>
            ) : undefined
          }
          nav={
            <DateRangePicker
              value={{ startDate, endDate }}
              onChange={(s, e) => {
                setStartDate(s)
                setEndDate(e)
              }}
              placeholder="Date range"
            />
          }
          peopleSelect={
            isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-md border bg-muted/30">
                  <User className="size-4 text-muted-foreground" />
                </span>
                <Select value={selectedEmployeeId ?? undefined} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="w-[220px]">
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
            ) : null
          }
          actions={
            isAdmin ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading || !selectedEmployeeId}
                onClick={() => setRefreshNonce((n) => n + 1)}
              >
                <RefreshCw className="mr-2 size-4" />
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
                Your current role doesn&apos;t have access to leave approvals.
              </p>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <>
            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[240px] flex-1">
                    <div className="mb-1.5 text-xs font-medium text-muted-foreground">Search</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by notes, type, status…" className="pl-9" />
                    </div>
                  </div>

                  <div className="w-[200px]">
                    <div className="mb-1.5 text-xs font-medium text-muted-foreground">Leave type</div>
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

                  <div className="w-[180px]">
                    <div className="mb-1.5 text-xs font-medium text-muted-foreground">Status</div>
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
                  <div className="p-2 space-y-2">
                    {filtered.map((a) => {
                      const id = (a._id ?? a.id) as string | undefined
                      const isActive = !!id && id === selectedAbsenceId
                      const st = statusBadge(a.status)
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
                              <div className="truncate text-sm font-semibold text-foreground">
                                {selectedEmployee?.name ?? "Employee"}
                              </div>
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
                        {selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.pin})` : "—"}
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

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={loading || (selectedAbsence.status ?? "").toLowerCase().includes("approve")}
                          onClick={() => void approveLeave(selectedAbsence)}
                        >
                          Approve
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

