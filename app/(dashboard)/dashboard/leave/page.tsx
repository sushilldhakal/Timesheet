"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin, isManager, isSupervisor } from "@/lib/config/roles"
import { useEmployees } from "@/lib/queries/employees"
import { useTeams } from "@/lib/queries/teams"
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
  differenceInCalendarDays,
  getISOWeek,
  getISOWeekYear,
} from "date-fns"
import { DateRange } from "react-day-picker"
import { useEffect, useMemo, useState, type ComponentType } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { MultiSelect } from "@/components/ui/multi-select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { AlignJustify, Columns, LayoutGrid, Plus, RefreshCw, Search, X, Lock, MoreVertical, CalendarDays, History, List } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FormDialogShell } from "@/components/shared/forms"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  getAbsences,
  approveAbsence,
  denyAbsence,
  createEmployeeAbsence,
  type LeaveRecord,
  type AffectedShift,
} from "@/lib/api/absences"
import { useDashboardLocationScope } from "@/components/providers/DashboardLocationScopeProvider"

const LEAVE_TYPE_OPTIONS = ["ANNUAL", "SICK", "UNPAID", "PUBLIC_HOLIDAY"] as const

// LeaveRecord and AffectedShift imported from @/lib/api/absences
type LeaveRecordLike = LeaveRecord

/** Returns black or white text color for readable contrast against a hex background */
function contrastColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // Perceived luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#111827' : '#ffffff'
}

function TeamBadge({ teams }: { teams?: Array<{ id: string; name: string; color?: string }> }) {
  if (!teams || teams.length === 0) {
    return <span className="text-muted-foreground text-xs">No team</span>
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {teams.map((t) => {
        const bg = t.color ?? '#6b7280'
        const fg = contrastColor(bg)
        return (
          <span
            key={t.id}
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: bg, color: fg }}
          >
            {t.name}
          </span>
        )
      })}
    </div>
  )
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

// ─── Leave chart ──────────────────────────────────────────────────────────────

function LeaveChart({ absences, startDate, endDate, onDayClick }: {
  absences: LeaveRecord[]
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
        const count = absences.filter((a) => {
          const as = a.startDate?.slice(0, 10) ?? ""
          const ae = a.endDate?.slice(0, 10) ?? ymd
          return as <= ymd && ae >= ymd
        }).length
        out.push({
          date: ymd,
          dayName: format(cur, "EEE"),
          dayNum: format(cur, "d"),
          count,
          isWeekend: dow === 0 || dow === 6,
        })
        cur.setDate(cur.getDate() + 1)
      }
    } catch { /* ignore */ }
    return out
  }, [absences, startDate, endDate])

  const maxCount = Math.max(1, ...days.map((d) => d.count))

  if (days.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4 print:hidden overflow-x-auto">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          ▼ My leave requests {format(parseISO(startDate), "EEE, d MMM")} - {format(parseISO(endDate), "EEE, d MMM")}
        </span>
        <span className="text-xs text-muted-foreground">Click on a day to view more details</span>
      </div>

      {/* Chart: y-axis + bars + x-axis all aligned */}
      <div className="flex gap-0" style={{ minWidth: days.length * 28 }}>
        {/* Y axis */}
        <div className="flex flex-col justify-between pr-1 text-right shrink-0" style={{ width: 16 }}>
          <span className="text-[9px] text-muted-foreground leading-none">{maxCount}</span>
          <span className="text-[9px] text-muted-foreground leading-none">0</span>
        </div>

        {/* Columns: bar + day name + day number */}
        <div className="flex flex-1 items-end gap-px">
          {days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center min-w-[20px]">
              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: 52 }}>
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-colors",
                    d.count > 0
                      ? "bg-emerald-500 hover:bg-emerald-400 cursor-pointer"
                      : "bg-transparent",
                  )}
                  style={{ height: d.count > 0 ? `${Math.max(4, (d.count / maxCount) * 52)}px` : 0 }}
                  title={d.count > 0 ? `${d.count} on ${d.date}` : undefined}
                  onClick={() => d.count > 0 && onDayClick?.(d.date)}
                />
              </div>
              {/* Tick */}
              <div className={cn("h-1.5 w-px mt-0.5", d.isWeekend ? "bg-rose-400" : "bg-border/60")} />
              {/* Day name */}
              <span className={cn("text-[8px] leading-none mt-0.5", d.isWeekend ? "text-rose-500 font-semibold" : "text-muted-foreground")}>
                {d.dayName}
              </span>
              {/* Day number */}
              <span className={cn("text-[8px] leading-none mt-0.5 font-medium", d.isWeekend ? "text-rose-500" : "text-foreground")}>
                {d.dayNum}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── History dialog ────────────────────────────────────────────────────────────

interface HistoryEntry {
  date: string
  action: string
  by: string
  fields?: { label: string; old: string; new: string }[]
  expanded: boolean
}

function LeaveHistoryDialog({ open, onClose, absence }: { open: boolean; onClose: () => void; absence: LeaveRecord | null }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (!absence) return
    // Build synthetic history from available fields
    const list: HistoryEntry[] = []
    if (absence.createdAt) {
      list.push({
        date: absence.createdAt,
        action: "Created",
        by: absence.employeeName ?? "Employee",
        fields: [
          { label: "Leave type", old: "blank", new: absence.leaveType ?? "—" },
          { label: "Start", old: "blank", new: formatDateLabel(absence.startDate) },
          { label: "Finish", old: "blank", new: formatDateLabel(absence.endDate) },
          { label: "Reason", old: "blank", new: absence.notes ?? "—" },
        ],
        expanded: true,
      })
    }
    if (absence.approvedAt) {
      list.push({
        date: absence.approvedAt,
        action: "Approved",
        by: absence.approvedBy ?? "Manager",
        fields: [{ label: "Status", old: "Pending", new: "Approved" }],
        expanded: false,
      })
    }
    if (absence.deniedAt) {
      list.push({
        date: absence.deniedAt,
        action: "Denied",
        by: absence.deniedBy ?? "Manager",
        fields: [
          { label: "Status", old: "Pending", new: "Denied" },
          { label: "Reason", old: "blank", new: absence.denialReason ?? "—" },
        ],
        expanded: false,
      })
    }
    setEntries(list)
  }, [absence])

  const toggle = (i: number) =>
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, expanded: !e.expanded } : e))

  const groupByDate = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>()
    for (const e of entries) {
      let dateKey = "Unknown"
      try {
        const d = parseISO(e.date.includes("T") ? e.date : `${e.date}T12:00:00`)
        if (isValid(d)) dateKey = format(d, "EEEE, d MMMM yyyy")
      } catch { /* ignore */ }
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(e)
    }
    return map
  }, [entries])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leave Request History</DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No history available.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(groupByDate.entries()).map(([dateKey, group]) => (
              <div key={dateKey}>
                <p className="text-sm font-bold text-foreground mb-2">{dateKey}</p>
                <div className="space-y-2">
                  {group.map((entry, i) => {
                    const globalIdx = entries.indexOf(entry)
                    return (
                      <div key={i} className="rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggle(globalIdx)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-xs text-muted-foreground">{entry.expanded ? "▼" : "▶"}</span>
                          <span className="text-xs font-medium">
                            <span className="font-bold">{entry.action}</span>
                            {" by "}
                            <span className="font-bold">{entry.by}</span>
                            {" at "}
                            {(() => {
                              try {
                                const d = parseISO(entry.date.includes("T") ? entry.date : `${entry.date}T12:00:00`)
                                return isValid(d) ? format(d, "h:mm a") : entry.date
                              } catch { return entry.date }
                            })()}
                          </span>
                        </button>
                        {entry.expanded && entry.fields && (
                          <table className="w-full text-xs border-t border-border">
                            <tbody>
                              {entry.fields.map((f, fi) => (
                                <tr key={fi} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 text-muted-foreground font-medium w-28">{f.label}</td>
                                  <td className="px-3 py-2">
                                    <div className="text-muted-foreground/60 italic">{f.old}</div>
                                    <div className="font-medium text-foreground">{f.new}</div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tanda-style detail panel ─────────────────────────────────────────────────

type DetailTab = "request" | "shifts" | "balances" | "comments"

function formatDateLabel(iso?: string | null) {
  if (!iso) return "—"
  try {
    const d = parseISO(iso.includes("T") ? iso : `${iso}T12:00:00`)
    return isValid(d) ? format(d, "EEE, d MMM") : iso
  } catch { return iso }
}

function leaveDuration(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return "—"
  try {
    const s = parseISO(startDate.includes("T") ? startDate : `${startDate}T12:00:00`)
    const e = parseISO(endDate.includes("T") ? endDate : `${endDate}T12:00:00`)
    if (!isValid(s) || !isValid(e)) return "—"
    const days = differenceInCalendarDays(e, s) + 1
    return days === 1 ? "1 day" : `${days} days`
  } catch { return "—" }
}

interface LeaveDetailPanelProps {
  absence: LeaveRecord
  employeeById: Map<string, { name: string; pin: string }>
  employeesQuery: any
  loading: boolean
  postApproveShifts: { absenceId: string; shifts: AffectedShift[] } | null
  affectedBannerDismissed: boolean
  onDismissBanner: () => void
  onApprove: () => void
  onDeny: () => void
  onRefresh: () => void
  formatAffectedShiftLine: (s: AffectedShift) => string
}

function LeaveDetailPanel({
  absence,
  employeeById,
  employeesQuery,
  loading,
  postApproveShifts,
  affectedBannerDismissed,
  onDismissBanner,
  onApprove,
  onDeny,
  onRefresh,
  formatAffectedShiftLine,
}: LeaveDetailPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<DetailTab>("request")
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [comment, setComment] = useState("")
  const [notifyCommenters, setNotifyCommenters] = useState(false)

  const emp = absence.employeeId ? employeeById.get(absence.employeeId) : undefined
  const name = absence.employeeName ?? emp?.name ?? "Employee"
  const st = statusBadge(absence.status)
  const isFinal = isLeaveFinalStatus(absence.status)
  const isApproved = (absence.status ?? "").toUpperCase() === "APPROVED"
  const isExported = false

  const absenceId = absence._id ?? absence.id
  const showAffected =
    postApproveShifts?.absenceId === absenceId &&
    (postApproveShifts?.shifts.length ?? 0) > 0 &&
    !affectedBannerDismissed

  // Build roster week link from leave start date
  const rosterWeekId = useMemo(() => {
    if (!absence.startDate) return null
    try {
      const d = parseISO(absence.startDate.includes("T") ? absence.startDate : `${absence.startDate}T12:00:00`)
      if (!isValid(d)) return null
      const year = getISOWeekYear(d)
      const week = getISOWeek(d)
      return `${year}-W${String(week).padStart(2, "0")}`
    } catch { return null }
  }, [absence.startDate])

  const TABS: { id: DetailTab; label: string; count?: number }[] = [
    { id: "request", label: "Leave Request" },
    { id: "shifts", label: "Shifts", count: 0 },
    { id: "balances", label: "Leave Balances" },
    { id: "comments", label: "Comments" },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground leading-tight">{name}</h2>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
            <span className="truncate">
              {absence.leaveType ?? "Leave"} · {formatDateLabel(absence.startDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status + approver */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className={cn("h-2 w-2 rounded-full shrink-0", isApproved ? "bg-emerald-500" : "bg-amber-400")} />
              <span className="text-xs font-semibold text-foreground">
                {isApproved ? "Approved" : st.label}
                {isExported ? " & fully exported" : ""}
              </span>
            </div>
            {absence.approvedBy && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Approved by {absence.approvedBy}
                {absence.approvedAt ? ` on ${formatDateLabel(absence.approvedAt)}, ${(() => {
                  try {
                    const d = parseISO(absence.approvedAt.includes("T") ? absence.approvedAt : `${absence.approvedAt}T12:00:00`)
                    return isValid(d) ? format(d, "h:mmaaa") : ""
                  } catch { return "" }
                })()}` : ""}
              </p>
            )}
          </div>

          {/* ⋮ menu */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted">
                <MoreVertical className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  setMenuOpen(false)
                  if (rosterWeekId) router.push(`/dashboard/scheduling?week=${rosterWeekId}`)
                }}
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                View Roster
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => { setMenuOpen(false); setHistoryOpen(true) }}
              >
                <History className="h-4 w-4 text-muted-foreground" />
                History
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  setMenuOpen(false)
                  if (absence.employeeId) router.push(`/dashboard/leave?employeeId=${absence.employeeId}`)
                }}
              >
                <List className="h-4 w-4 text-muted-foreground" />
                All leave for {name}
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative pb-2.5 pt-1 mr-5 text-xs font-semibold uppercase tracking-wide transition-colors",
              tab === t.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-muted-foreground">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {tab === "request" && (
          <div className="p-5 space-y-5">
            {isExported && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm text-white">
                <Lock className="h-4 w-4 shrink-0" />
                <span>This request is fully exported. Unlock related timesheets to make changes.</span>
              </div>
            )}
            {showAffected && (
              <div className="relative rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm">
                <button type="button" className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-background/80" onClick={onDismissBanner}>
                  <X className="size-4" />
                </button>
                <p className="pr-8 font-medium text-foreground">
                  ℹ️ {postApproveShifts!.shifts.length} shift{postApproveShifts!.shifts.length === 1 ? " was" : "s were"} affected.
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {postApproveShifts!.shifts.map((s) => <li key={s.shiftId}>{formatAffectedShiftLine(s)}</li>)}
                </ul>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Leave request</p>
                  {absence.createdAt && (
                    <p className="text-xs text-muted-foreground mb-3">Created {formatDateLabel(absence.createdAt)}</p>
                  )}
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-[130px_1fr]">
                      <dt className="text-muted-foreground">Dates</dt>
                      <dd className="font-medium">
                        {formatDateLabel(absence.startDate)}
                        {absence.endDate && absence.endDate !== absence.startDate ? ` – ${formatDateLabel(absence.endDate)}` : ""}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[130px_1fr]">
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="font-medium">{leaveDuration(absence.startDate, absence.endDate)}</dd>
                    </div>
                    {(absence.partialStartTime || absence.partialEndTime) && (
                      <div className="grid grid-cols-[130px_1fr]">
                        <dt className="text-muted-foreground">Paid length</dt>
                        <dd className="font-medium">{absence.partialStartTime} – {absence.partialEndTime}</dd>
                      </div>
                    )}
                    <div className="grid grid-cols-[130px_1fr]">
                      <dt className="text-muted-foreground">Leave type</dt>
                      <dd className="font-medium">{absence.leaveType ?? "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[130px_1fr]">
                      <dt className="text-muted-foreground">Current balance</dt>
                      <dd className="text-muted-foreground">No balance found</dd>
                    </div>
                    <div className="grid grid-cols-[130px_1fr]">
                      <dt className="text-muted-foreground">Reason</dt>
                      <dd className="font-medium">{absence.notes?.trim() || "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[130px_1fr]">
                      <dt className="text-muted-foreground">Attachment</dt>
                      <dd className="text-muted-foreground">No attachment</dd>
                    </div>
                    {absence.denialReason?.trim() && (
                      <div className="grid grid-cols-[130px_1fr]">
                        <dt className="text-muted-foreground">Denial reason</dt>
                        <dd className="text-destructive font-medium">{absence.denialReason}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Duration</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2.5 font-medium">
                          {formatDateLabel(absence.startDate)}
                          {absence.endDate && absence.endDate !== absence.startDate ? ` – ${formatDateLabel(absence.endDate)}` : ""}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{leaveDuration(absence.startDate, absence.endDate)}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <TeamBadge teams={(absence as any).teams} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overlapping events</p>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-2">
                  <p className="text-xs font-semibold text-foreground">No overlapping events found</p>
                  <p className="text-xs text-muted-foreground">Public holidays and roster conflicts will appear here.</p>
                </div>
              </div>
            </div>

            {!isFinal && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button type="button" size="sm" disabled={loading} onClick={onApprove}>Approve</Button>
                <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={onDeny}>Deny</Button>
                <Button type="button" size="sm" variant="outline" disabled={loading} onClick={onRefresh}>Refresh</Button>
              </div>
            )}
          </div>
        )}

        {tab === "shifts" && (
          <div className="p-5 text-sm text-muted-foreground">No shifts linked to this leave request.</div>
        )}

        {tab === "balances" && (
          <div className="p-5 text-sm text-muted-foreground">Leave balance information is not available.</div>
        )}

        {tab === "comments" && (
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Add a comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder=""
                rows={4}
                className="text-sm resize-none"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={notifyCommenters}
                onChange={(e) => setNotifyCommenters(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Notify people who have commented on this request
            </label>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={!comment.trim()}
                onClick={() => { toast.success("Comment saved"); setComment("") }}
              >
                Save Comment
              </Button>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground italic">No comments have been left yet.</p>
          </div>
        )}
      </div>

      <LeaveHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} absence={absence} />
    </div>
  )
}

export default function LeavePage() {
  const { user, userRole, isHydrated } = useAuth()
  const isAdmin = isHydrated && isAdminOrSuperAdmin(userRole)
  const canManageLeave = isHydrated && (isAdminOrSuperAdmin(userRole) || isManager(userRole) || isSupervisor(userRole))

  const searchParams = useSearchParams()

  const employeesQuery = useEmployees(500)
  const teamsQuery = useTeams()
  const allEmployees = employeesQuery.data?.employees ?? []
  const { selectedLocationNames, isReady: locationScopeReady } = useDashboardLocationScope()

  // Team filter — only show if there are multiple teams
  const allTeams = useMemo(() =>
    (teamsQuery.data?.teams ?? []).map((t: any) => ({ id: String(t.id ?? t._id), name: String(t.name ?? "") })),
    [teamsQuery.data]
  )
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const showTeamFilter = allTeams.length > 1

  // All employees visible in the current location scope (for the employee picker)
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
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(() => {
    // Seed from ?employeeId= URL param on first render
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("employeeId")
      return param ? [param] : []
    }
    return []
  })

  const [refreshNonce, setRefreshNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [absences, setAbsences] = useState<LeaveRecordLike[]>([])
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null)
  const [spotlightDate, setSpotlightDate] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const [addLeaveOpen, setAddLeaveOpen] = useState(false)
  const [addEmployeeId, setAddEmployeeId] = useState("")
  const [addDateRange, setAddDateRange] = useState<DateRange | undefined>(undefined)
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
    if (useCustomRange && customDateRange?.from && customDateRange?.to) {
      return { 
        startDate: format(customDateRange.from, "yyyy-MM-dd"), 
        endDate: format(customDateRange.to, "yyyy-MM-dd") 
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

  // Lookup map for all employees (used to resolve names in filtered results)
  const employeeById = useMemo(() => {
    const m = new Map<string, { name: string; pin: string }>()
    for (const e of allEmployees) {
      m.set(e.id, { name: e.name ?? "", pin: e.pin ?? "" })
    }
    return m
  }, [allEmployees])

  useEffect(() => {
    const param = searchParams.get("employeeId")
    if (param) setSelectedEmployeeIds([param])
  }, [searchParams])

  useEffect(() => {
    setPostApproveShifts(null)
  }, [selectedAbsenceId])

  // Fetch absences: one API call with date range + location from header context.
  // All employee/team/search/status/type filtering happens client-side on the result.
  const locationNamesKey = selectedLocationNames.join(",")
  useEffect(() => {
    if (!isHydrated || !canManageLeave || !locationScopeReady) return

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const json = await getAbsences({
          startDate,
          endDate,
          location: selectedLocationNames.length > 0 ? selectedLocationNames : undefined,
        })
        const rows = (json.absences ?? []) as LeaveRecordLike[]
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationNamesKey, startDate, endDate, refreshNonce, canManageLeave, isHydrated, locationScopeReady])

  const approveLeave = async (absence: LeaveRecordLike) => {
    if (!user?.id) return
    const absenceId = absence._id ?? absence.id
    if (!absenceId) return

    setError(null)
    setLoading(true)

    try {
      const json = await approveAbsence(absenceId, { approverId: user.id })
      const updated = json.leaveRecord
      const affected = (json.affectedShifts ?? []) as AffectedShift[]

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
      const json = await denyAbsence(absenceId, { denierId: user.id, reason: denyReason.trim() })
      const updated = json.leaveRecord
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
    if (!addDateRange?.from || !addDateRange?.to) {
      toast.error("Start and end dates are required")
      return
    }
    if (addDateRange.to < addDateRange.from) {
      toast.error("End date must be on or after start date")
      return
    }

    setAddSubmitting(true)
    setError(null)

    try {
      await createEmployeeAbsence(addEmployeeId, {
        startDate: format(addDateRange.from, "yyyy-MM-dd"),
        endDate: format(addDateRange.to, "yyyy-MM-dd"),
        leaveType: addType,
        notes: addNotes.trim() || undefined,
      })
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
    setAddEmployeeId(locationEmployees[0]?.id ?? "")
    const startDateObj = parseISO(startDate)
    const endDateObj = parseISO(endDate)
    setAddDateRange({ 
      from: isValid(startDateObj) ? startDateObj : undefined, 
      to: isValid(endDateObj) ? endDateObj : undefined 
    })
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
    // Build a set of employee IDs that pass the team filter (client-side)
    const teamFilteredEmployeeIds = selectedTeamIds.length > 0
      ? new Set(
          absences
            .filter((a) => (a as any).teams?.some((t: any) => selectedTeamIds.includes(String(t.id))))
            .map((a) => a.employeeId ?? "")
        )
      : null

    return absences
      .slice()
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))
      .filter((a) => {
        // Employee picker filter
        if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes(a.employeeId ?? "")) return false
        // Team filter
        if (teamFilteredEmployeeIds && !teamFilteredEmployeeIds.has(a.employeeId ?? "")) return false
        if (spotlightDate) {
          const as = (a.startDate ?? "").slice(0, 10)
          const ae = (a.endDate ?? as).slice(0, 10)
          if (!(as <= spotlightDate && ae >= spotlightDate)) return false
        }
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
  }, [absences, search, statusFilter, typeFilter, employeeById, spotlightDate, selectedEmployeeIds, selectedTeamIds, locationEmployees])

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
    <TimesheetDateNavigator
      view={view}
      selectedDate={selectedDate}
      onDateChange={(date) => {
        setSelectedDate(date)
        setUseCustomRange(false)
      }}
      rangeValue={
        view === "day" && useCustomRange && customDateRange?.from && customDateRange?.to
          ? {
              startDate: format(customDateRange.from, "yyyy-MM-dd"),
              endDate: format(customDateRange.to, "yyyy-MM-dd"),
            }
          : undefined
      }
      onRangeChange={(start, end) => {
        if (!start) {
          setUseCustomRange(false)
          setCustomDateRange(undefined)
          return
        }
        const from = parseISO(start)
        const to = parseISO(end)
        if (isValid(from) && isValid(to)) {
          setCustomDateRange({ from, to })
          setUseCustomRange(true)
          setSelectedDate(from)
        }
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
        canManageLeave ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={!locationEmployees.length} onClick={openAddLeave}>
              <Plus className="size-4" />
              Add Leave
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !locationEmployees.length}
              onClick={() => setRefreshNonce((n) => n + 1)}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        ) : null
      }
    />
  )

  if (!isHydrated) {
    return (
      <CalendarPageShell
        containerClassName="px-4 sm:px-6"
        toolbar={toolbar}
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
      toolbar={toolbar}
    >
      <>
      <div className="space-y-4 py-4">
        {!canManageLeave && (
          <Card>
            <CardHeader>
              <CardTitle>Access required</CardTitle>
              <CardDescription>This page requires manager or supervisor permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your current role doesn&apos;t have access to leave approvals.
              </p>
            </CardContent>
          </Card>
        )}

        {canManageLeave && (
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
                      options={locationEmployees.map((e) => ({
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

            <LeaveChart
              absences={filtered}
              startDate={startDate}
              endDate={endDate}
              onDayClick={(date) => {
                setSpotlightDate(date)
                const match = filtered.find((a) => {
                  const as = (a.startDate ?? "").slice(0, 10)
                  const ae = (a.endDate ?? as).slice(0, 10)
                  return as <= date && ae >= date
                })
                if (match) setSelectedAbsenceId((match._id ?? match.id) ?? null)
              }}
            />

            <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
              <Card className="overflow-hidden">
                {/* Spotlight header or date range header */}
                {spotlightDate ? (
                  <div className="border-b border-border">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Spotlight on…</span>
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => setSpotlightDate(null)}
                      >
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
                          {filtered.filter(a => (a.status ?? "").toUpperCase() === "APPROVED").length} approved full day request{filtered.length > 1 ? "s" : ""}
                          {filtered.map(a => ` · ${a.employeeName ?? ""}`).join("")}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      {(() => {
                        try {
                          const s = parseISO(startDate)
                          const e = parseISO(endDate)
                          if (isValid(s) && isValid(e)) return `${format(s, "EEE, d MMM")} - ${format(e, "EEE, d MMM")}`
                        } catch { /* ignore */ }
                        return "All dates"
                      })()}
                    </p>
                    {!loading && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {filtered.length === 0 ? "No requests found." : `${filtered.length} request${filtered.length === 1 ? "" : "s"}`}
                      </p>
                    )}
                  </div>
                )}
                <ScrollArea className="h-[520px]">
                  <div className="divide-y divide-border">
                    {filtered.map((a) => {
                      const id = (a._id ?? a.id) as string | undefined
                      const isActive = !!id && id === selectedAbsenceId
                      const st = statusBadge(a.status)
                      const emp = a.employeeId ? employeeById.get(a.employeeId) : undefined
                      const name = a.employeeName ?? emp?.name ?? "Employee"
                      // Initials for avatar badge
                      const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                      const isApproved = (a.status ?? "").toUpperCase() === "APPROVED"
                      return (
                        <button
                          key={id ?? `${a.startDate}-${a.endDate}-${a.leaveType}`}
                          type="button"
                          onClick={() => setSelectedAbsenceId(id ?? null)}
                          className={cn(
                            "w-full p-3 text-left transition-colors hover:bg-muted/40 relative",
                            isActive ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Avatar badge */}
                            <div className="shrink-0 h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-semibold text-foreground">{name}</span>
                                {isApproved && (
                                  <svg className="h-3 w-3 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                  </svg>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatDateLabel(a.startDate)}
                                {a.endDate && a.endDate !== a.startDate ? ` – ${formatDateLabel(a.endDate)}` : ""}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {a.leaveType ?? "—"}
                              </div>
                            </div>
                            <Badge variant="outline" className={cn("shrink-0 text-[10px]", st.className)}>
                              {st.label}
                            </Badge>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="overflow-hidden">
                {!selectedAbsence ? (
                  <div className="flex h-full items-center justify-center p-12 text-sm text-muted-foreground">
                    Select a leave request to view details.
                  </div>
                ) : (
                  <LeaveDetailPanel
                    absence={selectedAbsence}
                    employeeById={employeeById}
                    employeesQuery={employeesQuery}
                    loading={loading}
                    postApproveShifts={postApproveShifts}
                    affectedBannerDismissed={affectedBannerDismissed}
                    onDismissBanner={() => setAffectedBannerDismissed(true)}
                    onApprove={() => void approveLeave(selectedAbsence)}
                    onDeny={() => { setDenyReason(""); setDenyOpen(true) }}
                    onRefresh={() => setRefreshNonce((n) => n + 1)}
                    formatAffectedShiftLine={formatAffectedShiftLine}
                  />
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      <FormDialogShell
        open={addLeaveOpen}
        onOpenChange={setAddLeaveOpen}
        title="Add leave"
        onSubmit={(e) => {
          e.preventDefault();
          void submitAddLeave();
        }}
        submitLabel={addSubmitting ? "Saving…" : "Create"}
        loading={addSubmitting}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="add-leave-employee">Employee</Label>
            <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
              <SelectTrigger id="add-leave-employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {locationEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.pin})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DateRangePicker
              dateRange={addDateRange}
              onDateRangeChange={setAddDateRange}
              placeholder="Select start and end dates"
            />
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
      </FormDialogShell>

      <FormDialogShell
        open={denyOpen}
        onOpenChange={setDenyOpen}
        title="Deny leave"
        onSubmit={(e) => {
          e.preventDefault();
          void denyLeave();
        }}
        submitLabel={denySubmitting ? "Denying…" : "Confirm deny"}
        loading={denySubmitting}
        disabled={!denyReason.trim()}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDenyOpen(false)} disabled={denySubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={denySubmitting || !denyReason.trim()}
            >
              {denySubmitting ? "Denying…" : "Confirm deny"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
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
      </FormDialogShell>
      </>
    </CalendarPageShell>
  )
}
