"use client"

import { useMemo, useState } from "react"
import { format, isValid } from "date-fns"
import type { ColumnDef, VisibilityState } from "@tanstack/react-table"
import { formatTime } from "@/lib/utils/format/time"
import { MessageSquarePlus, MessageSquare, CheckCircle2, AlertTriangle, Clock } from "lucide-react"

import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { TimesheetDayRow } from "@/components/timesheet/TimesheetDayRow"
import { updateDailyShift } from "@/lib/api/daily-shifts"
import { ShiftRowActions } from "@/components/timesheet/ShiftRowActions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayViewRow {
  employeeId: string
  name: string
  pin: string
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakHours: string
  totalHours: string
  comment: string
  employer: string
  role: string
  location: string
  // Schedule enrichment fields (present when includeSchedule=1)
  dailyShiftId?: string | null
  status?: string | null
  locationId?: string | null
  roleId?: string | null
  rosterShiftId?: string | null
  roster?: { startTimeUtc: string; endTimeUtc: string; locationId: string; roleId: string } | null
  varianceMinutes?: { start: number | null; end: number | null; duration: number | null } | null
  flags?: { missingActual: boolean; extraActual: boolean; incompleteActual: boolean } | null
  notes?: string | null
}

export interface TimesheetDayServerPagination {
  totalCount: number
  pageIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

interface TimesheetDayViewProps {
  data: DayViewRow[]
  selectedDate: Date
  endDate?: Date
  loading?: boolean
  serverPagination?: TimesheetDayServerPagination
  canApprove?: boolean
  onApprove?: (dailyShiftId: string) => Promise<void>
  onReject?: (dailyShiftId: string) => Promise<void>
  teamsByLocationId?: Map<string, Array<{ id: string; name: string }>>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateFromYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y!, m! - 1, d!)
}

function hhmmToUtcIso(date: string, hhmm: string): string | null {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(":").map(Number)
  const d = localDateFromYmd(date)
  d.setHours(h!, m!, 0, 0)
  return d.toISOString()
}

function rowToReconciledDay(row: DayViewRow) {
  const startUtc = hhmmToUtcIso(row.date, row.clockIn)
  const endUtc = hhmmToUtcIso(row.date, row.clockOut)
  const breakInUtc = hhmmToUtcIso(row.date, row.breakIn)
  const breakOutUtc = hhmmToUtcIso(row.date, row.breakOut)

  const breakMins =
    breakInUtc && breakOutUtc
      ? Math.round((new Date(breakOutUtc).getTime() - new Date(breakInUtc).getTime()) / 60000)
      : 0

  return {
    date: row.date,
    reconciledShifts: [
      {
        rosterShiftId: row.rosterShiftId ?? null,
        date: row.date,
        variances: [],
        roster: row.roster ?? null,
        actual: row.dailyShiftId
          ? {
              dailyShiftId: row.dailyShiftId,
              startTimeUtc: startUtc,
              endTimeUtc: endUtc,
              locationId: row.locationId ?? null,
              roleId: row.roleId ?? null,
              status: row.status ?? null,
              totalBreakMinutes: breakMins,
              breakInTimeUtc: breakInUtc,
              breakOutTimeUtc: breakOutUtc,
              computedTotalCost: null,
              awardTags: [],
            }
          : null,
        varianceMinutes: row.varianceMinutes ?? { start: null, end: null, duration: null },
        flags: row.flags ?? { missingActual: false, extraActual: false, incompleteActual: false },
      },
    ],
  }
}

function rowHasWarning(row: DayViewRow): boolean {
  if (row.flags?.missingActual || row.flags?.extraActual || row.flags?.incompleteActual) return true
  const dur = row.varianceMinutes?.duration
  if (typeof dur === "number" && Math.abs(dur) >= 15) return true
  return false
}

function shiftIsLocked(status?: string | null): boolean {
  return ["locked", "processed", "exported"].includes(String(status ?? "").toLowerCase())
}

// ─── Variance comment popover ─────────────────────────────────────────────────

function ShiftCommentPopover({
  dailyShiftId,
  existingNote,
  onSaved,
  readOnly = false,
}: {
  dailyShiftId: string
  existingNote?: string | null
  onSaved: (id: string, note: string) => void
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(existingNote ?? "")
  const [saving, setSaving] = useState(false)

  const hasNote = !!existingNote?.trim()

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDailyShift(dailyShiftId, { notes: text.trim() } as any)
      onSaved(dailyShiftId, text.trim())
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(existingNote ?? "") }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={hasNote ? "View/edit variance note" : "Add variance note"}
          className={[
            "inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
            hasNote
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          ].join(" ")}
        >
          {hasNote ? <MessageSquare className="h-3 w-3" /> : <MessageSquarePlus className="h-3 w-3" />}
          {hasNote ? "Note" : "Add note"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-semibold">Variance Note</p>
          {readOnly ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{existingNote || "No note."}</p>
          ) : (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the variance reason…"
                rows={3}
                className="text-sm"
                maxLength={1000}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Operational summary strip ────────────────────────────────────────────────

function OperationalSummaryStrip({ data }: { data: DayViewRow[] }) {
  const total = data.length
  const approved = data.filter((r) => String(r.status ?? "").toLowerCase() === "approved").length
  const withVariance = data.filter(rowHasWarning).length
  const withNotes = data.filter((r) => !!r.notes?.trim()).length

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{total}</span> shifts
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span className="font-medium text-emerald-700 dark:text-emerald-400">{approved}</span> approved
      </span>
      {withVariance > 0 && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium text-amber-700 dark:text-amber-400">{withVariance}</span> with variance
        </span>
      )}
      {withNotes > 0 && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-medium text-blue-700 dark:text-blue-400">{withNotes}</span> noted
        </span>
      )}
    </div>
  )
}

// ─── Table columns (read-only / non-approver path) ────────────────────────────

function getDayViewColumns(showDateColumn: boolean = false): ColumnDef<DayViewRow>[] {
  const columns: ColumnDef<DayViewRow>[] = []

  if (showDateColumn) {
    columns.push({
      id: "date",
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      enableSorting: true,
    })
  }

  columns.push(
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      enableSorting: true,
      cell: ({ row }) => (
        <Link href={`/dashboard/employees/${row.original.employeeId}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      enableSorting: true,
    },
    {
      id: "location",
      accessorKey: "location",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      enableSorting: true,
    },
    {
      id: "clockIn",
      accessorKey: "clockIn",
      header: "Clock In",
      cell: ({ row }) => (
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {formatTime(row.original.clockIn)}
        </span>
      ),
    },
    {
      id: "break",
      header: "Break",
      cell: ({ row }) => {
        const breakIn = formatTime(row.original.breakIn)
        const breakOut = formatTime(row.original.breakOut)
        if (breakIn === "—" && breakOut === "—") return <span className="text-muted-foreground/40">—</span>
        if (breakIn === "—") return <span className="text-amber-600 dark:text-amber-400">—{breakOut}</span>
        if (breakOut === "—") return <span className="text-amber-600 dark:text-amber-400">{breakIn}—</span>
        return <span className="text-amber-600 dark:text-amber-400">{breakIn}–{breakOut}</span>
      },
    },
    {
      id: "clockOut",
      accessorKey: "clockOut",
      header: "Clock Out",
      cell: ({ row }) => (
        <span className="font-medium text-orange-600 dark:text-orange-400">
          {formatTime(row.original.clockOut)}
        </span>
      ),
    },
    {
      id: "totalHours",
      accessorKey: "totalHours",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {row.original.totalHours || "—"}
        </span>
      ),
    },
    {
      id: "comment",
      accessorKey: "comment",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Comment" />,
      enableHiding: true,
      cell: ({ row }) => (
        <span className="max-w-[120px] truncate block" title={row.original.comment}>
          {row.original.comment}
        </span>
      ),
    },
    {
      id: "employer",
      accessorKey: "employer",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employer" />,
      enableHiding: true,
    },
    {
      id: "breakIn",
      accessorKey: "breakIn",
      header: "Break In",
      enableHiding: true,
      cell: ({ row }) => formatTime(row.original.breakIn),
    },
    {
      id: "breakOut",
      accessorKey: "breakOut",
      header: "End Break",
      enableHiding: true,
      cell: ({ row }) => formatTime(row.original.breakOut),
    },
    {
      id: "breakHours",
      accessorKey: "breakHours",
      header: "Total Break",
      enableHiding: true,
    },
  )

  return columns
}

// ─── Operational card list ────────────────────────────────────────────────────

interface OperationalListProps {
  data: DayViewRow[]
  canApprove: boolean
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  loading?: boolean
  teamsByLocationId?: Map<string, Array<{ id: string; name: string }>>
}

function OperationalList({ data, canApprove, onApprove, onReject, loading, teamsByLocationId }: OperationalListProps) {
  const [approvingById, setApprovingById] = useState<Record<string, boolean>>({})
  const [savingById, setSavingById] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, any>>({})
  const [noteOverrides, setNoteOverrides] = useState<Record<string, string>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const getDraft = (id: string) => drafts[id] ?? null
  const setDraftField = (id: string, patch: any) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }))
  const resetDraft = (id: string) =>
    setDrafts((prev) => { const next = { ...prev }; delete next[id]; return next })
  const isDirty = (id: string) => !!drafts[id]

  const rowById = useMemo(() => {
    const m = new Map<string, DayViewRow>()
    for (const row of data) {
      if (row.dailyShiftId) m.set(row.dailyShiftId, row)
    }
    return m
  }, [data])

  const saveDay = async (id: string) => {
    const draft = drafts[id]
    if (!draft) return
    const row = rowById.get(id)
    if (!row) return

    setSavingById((prev) => ({ ...prev, [id]: true }))
    try {
      const toUtcIso = (hhmm: string | null | undefined): string | null => {
        if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null
        return hhmmToUtcIso(row.date, hhmm)
      }

      const patch: Record<string, unknown> = {}
      if (draft.startTime !== undefined) patch.clockInUtc = toUtcIso(draft.startTime)
      if (draft.endTime !== undefined) patch.clockOutUtc = toUtcIso(draft.endTime)
      if (draft.awardTags !== undefined) patch.awardTags = draft.awardTags

      if (draft.breakInTime !== undefined || draft.breakOutTime !== undefined) {
        const breakIn = toUtcIso(draft.breakInTime ?? row.breakIn)
        const breakOut = toUtcIso(draft.breakOutTime ?? row.breakOut)
        patch.breaks = breakIn && breakOut
          ? [{ startTimeUtc: breakIn, endTimeUtc: breakOut, isPaid: false, source: "manual" }]
          : []
      }

      await updateDailyShift(id, patch as any)
      resetDraft(id)
    } finally {
      setSavingById((prev) => ({ ...prev, [id]: false }))
    }
  }

  const approveDay = async (id: string) => {
    setApprovingById((prev) => ({ ...prev, [id]: true }))
    try {
      await onApprove(id)
    } finally {
      setApprovingById((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleNoteSaved = (id: string, note: string) => {
    setNoteOverrides((prev) => ({ ...prev, [id]: note }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">No timesheet entries for this date.</p>
      </div>
    )
  }

  // Group rows by employee × date so each day gets its own card
  const byEmployeeDate = new Map<string, DayViewRow[]>()
  for (const row of data) {
    const key = `${row.employeeId || row.pin}__${row.date}`
    if (!byEmployeeDate.has(key)) byEmployeeDate.set(key, [])
    byEmployeeDate.get(key)!.push(row)
  }

  // Sort groups by date then employee name
  const sortedGroups = Array.from(byEmployeeDate.entries()).sort(([, a], [, b]) => {
    const dateA = a[0]!.date
    const dateB = b[0]!.date
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return (a[0]!.name ?? "").localeCompare(b[0]!.name ?? "")
  })

  // Track which dates we've already shown a date divider for
  let lastRenderedDate = ""

  return (
    <div className="space-y-2">
      <OperationalSummaryStrip data={data} />

      <div className="space-y-4 pt-2">
        {sortedGroups.map(([groupKey, rows]) => {
          const first = rows[0]!
          const day = {
            date: first.date,
            reconciledShifts: rows.map((row) => rowToReconciledDay(row).reconciledShifts[0]!),
          }

          const showDateDivider = first.date !== lastRenderedDate
          lastRenderedDate = first.date

          const isCollapsed = !!collapsedGroups[groupKey]

          return (
            <div key={groupKey}>
              {/* Date divider */}
              {showDateDivider && (
                <div className="flex items-center gap-3 py-1 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {format(localDateFromYmd(first.date), "EEEE, d MMMM")}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Row: card + action strip */}
              <div className="flex items-start gap-1">
                {/* Card area */}
                <div className="flex-1 min-w-0">
                  {/* Employee header */}
                  <div className="mb-2 flex items-center gap-2 pl-1">
                    <Link
                      href={`/dashboard/employees/${first.employeeId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {first.name}
                    </Link>
                    {first.role && <span className="text-xs text-muted-foreground">· {first.role}</span>}
                    {first.location && <span className="text-xs text-muted-foreground">· {first.location}</span>}
                    {isCollapsed && (
                      <span className="ml-auto text-xs text-muted-foreground italic">collapsed</span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <>
                      <TimesheetDayRow
                        day={day}
                        getDraft={getDraft}
                        setDraftField={setDraftField}
                        resetDraft={resetDraft}
                        isDirty={isDirty}
                        saveDay={saveDay}
                        approveDay={approveDay}
                        savingByShiftId={savingById}
                        approvingByShiftId={approvingById}
                        canApprove={canApprove}
                        awardTagOptions={[]}
                        employeeName={first.name}
                        teamsByLocationId={teamsByLocationId}
                      />

                      {/* Per-shift variance comment chips */}
                      {rows.map((row) => {
                        if (!row.dailyShiftId) return null
                        const locked = shiftIsLocked(row.status)
                        const hasWarning = rowHasWarning(row)
                        const currentNote = noteOverrides[row.dailyShiftId] ?? row.notes ?? ""
                        const hasNote = !!currentNote.trim()
                        if (!hasWarning && !hasNote) return null
                        return (
                          <div key={row.dailyShiftId} className="mt-1 flex items-center gap-2 pl-1">
                            <ShiftCommentPopover
                              dailyShiftId={row.dailyShiftId}
                              existingNote={currentNote}
                              onSaved={handleNoteSaved}
                              readOnly={locked || !canApprove}
                            />
                            {hasNote && (
                              <span className="text-xs text-muted-foreground italic truncate max-w-xs">
                                {currentNote}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>

                {/* Vertical action strip */}
                <ShiftRowActions
                  employeeId={first.employeeId}
                  employeeName={first.name}
                  date={first.date}
                  collapsed={isCollapsed}
                  onToggleCollapse={() =>
                    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
                  }
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TimesheetDayView({
  data,
  selectedDate,
  endDate,
  loading,
  serverPagination,
  canApprove = false,
  onApprove,
  onReject,
  teamsByLocationId,
}: TimesheetDayViewProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    comment: false,
    employer: false,
    breakIn: false,
    breakOut: false,
    breakHours: false,
  })

  const safeSelectedDate = isValid(selectedDate) ? selectedDate : null
  const safeEndDate = endDate && isValid(endDate) ? endDate : undefined
  const isDateRange = !!(safeSelectedDate && safeEndDate && safeEndDate.getTime() !== safeSelectedDate.getTime())
  const columns = useMemo(() => getDayViewColumns(isDateRange), [isDateRange])

  const hasScheduleData = data.length > 0 && data[0]?.dailyShiftId !== undefined
  const useOperationalView = canApprove && hasScheduleData && !!onApprove && !!onReject

  const getDateRangeTitle = () => {
    if (!safeSelectedDate) return "—"
    if (isDateRange) {
      return `${format(safeSelectedDate, "d MMM")} - ${format(safeEndDate!, "d MMM yyyy")}`
    }
    return format(safeSelectedDate, "EEEE, d MMMM yyyy")
  }

  if (loading && !serverPagination && !useOperationalView) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="text-center print:mb-4">
        <h3 className="text-lg font-semibold print:text-base print:font-bold">
          {getDateRangeTitle()}
        </h3>
        {isDateRange && (
          <p className="text-sm text-muted-foreground print:text-xs print:text-black">
            Showing detailed timesheet data for selected date range
          </p>
        )}
      </div>

      {useOperationalView ? (
        <OperationalList
          data={data}
          canApprove={canApprove}
          onApprove={onApprove!}
          onReject={onReject!}
          loading={loading}
          teamsByLocationId={teamsByLocationId}
        />
      ) : serverPagination ? (
        <DataTable
          mode="server"
          columns={columns}
          data={data}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          emptyMessage={isDateRange ? "No timesheet entries for the selected date range." : "No timesheet entries for this date."}
          getRowId={(row) => `timesheet-${row.employeeId}-${row.date}-${row.clockIn}`}
          loading={loading}
          totalCount={serverPagination.totalCount}
          pageIndex={serverPagination.pageIndex}
          pageSize={serverPagination.pageSize}
          onPageChange={serverPagination.onPageChange}
          onPageSizeChange={serverPagination.onPageSizeChange}
          pageSizeOptions={[25, 50, 100, 200]}
          showSearch={false}
          searchValue=""
          onSearchChange={() => {}}
          toolbar={(table) => (
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {serverPagination.totalCount === 0
                    ? "No rows"
                    : isDateRange
                      ? `Showing ${data.length} of ${serverPagination.totalCount} entries`
                      : `${serverPagination.totalCount} row(s) total`}
                </span>
              </div>
              <DataTableViewOptions table={table} />
            </div>
          )}
        />
      ) : (
        <DataTable
          mode="client"
          columns={columns}
          data={data}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          emptyMessage={isDateRange ? "No timesheet entries for the selected date range." : "No timesheet entries for this date."}
          getRowId={(row) => `timesheet-${row.employeeId}-${row.date}-${row.clockIn}`}
          initialPageSize={50}
          toolbar={(table) => (
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center space-x-2">
                {isDateRange && (
                  <span className="text-sm text-muted-foreground">
                    {data.length} entries across{" "}
                    {Math.ceil(
                      (safeEndDate!.getTime() - safeSelectedDate!.getTime()) / (1000 * 60 * 60 * 24),
                    ) + 1}{" "}
                    days
                  </span>
                )}
              </div>
              <DataTableViewOptions table={table} />
            </div>
          )}
        />
      )}
    </div>
  )
}
