"use client"

import { useState } from "react"
import { format, getISOWeek, getISOWeekYear } from "date-fns"
import { Edit2, User, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function weekIdFromYmd(dateStr: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr))
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (Number.isNaN(dt.getTime())) return null
  const weekYear = getISOWeekYear(dt)
  const week = getISOWeek(dt)
  return `${weekYear}-W${String(week).padStart(2, "0")}`
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

type Draft = {
  startTime: string | null
  endTime: string | null
  breakInTime: string | null
  breakOutTime: string | null
  awardTags: string[]
}

type ReconciledShift = {
  rosterShiftId: string | null
  date: string
  variances?: Array<{
    type: "MISSING_ACTUAL" | "EXTRA_ACTUAL" | "INCOMPLETE_ACTUAL" | "START_TIME_MISMATCH" | "END_TIME_MISMATCH" | "DURATION_MISMATCH"
    minutes?: number | null
  }>
  roster?: { startTimeUtc: string; endTimeUtc: string; locationId?: string; roleId?: string } | null
  actual?: {
    dailyShiftId: string
    startTimeUtc: string | null
    endTimeUtc: string | null
    locationId?: string | null
    roleId?: string | null
    status?: string | null
    totalBreakMinutes?: number | null
    breakInTimeUtc?: string | null
    breakOutTimeUtc?: string | null
    computedTotalCost?: number | null
    awardTags?: string[]
  } | null
  varianceMinutes: { start: number | null; end: number | null; duration: number | null }
  flags: { missingActual: boolean; extraActual: boolean; incompleteActual: boolean }
}

type ReconciledDay = {
  date: string
  reconciledShifts: ReconciledShift[]
  totals?: { rosterMinutes: number; actualMinutes: number; varianceMinutes: number }
}

function safeIsoToHHmm(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function formatMoney(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—"
  return `$${n.toFixed(2)}`
}

function shiftIsApproved(actual: ReconciledShift["actual"]) {
  const status = String(actual?.status ?? "").toLowerCase()
  return status === "approved" || status === "paid" || status === "locked"
}

function shiftIsLocked(actual: ReconciledShift["actual"]) {
  const status = String(actual?.status ?? "").toLowerCase()
  return status === "paid" || status === "locked"
}

function calculateBreakMinutes(breakInUtc?: string | null, breakOutUtc?: string | null): number {
  if (!breakInUtc || !breakOutUtc) return 0
  const breakIn = new Date(breakInUtc).getTime()
  const breakOut = new Date(breakOutUtc).getTime()
  return Math.round((breakOut - breakIn) / (60 * 1000))
}

function calculateBreakMinutesFromHHmm(breakIn?: string | null, breakOut?: string | null): number {
  if (!breakIn || !breakOut) return 0
  const a = /^(\d{2}):(\d{2})$/.exec(breakIn)
  const b = /^(\d{2}):(\d{2})$/.exec(breakOut)
  if (!a || !b) return 0
  const start = Number(a[1]) * 60 + Number(a[2])
  const end = Number(b[1]) * 60 + Number(b[2])
  return Math.max(0, end - start)
}

function hhmmToMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
  return hh * 60 + mm
}

function minutesToHhMm(mins: number | null | undefined): string {
  if (typeof mins !== "number" || !Number.isFinite(mins)) return "—"
  const abs = Math.abs(Math.round(mins))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${h}h ${m}m`
}

function ShiftTimeline({ startTime, endTime, breakInTime, breakOutTime }: { startTime: string; endTime: string; breakInTime?: string; breakOutTime?: string }) {
  const parseTime = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(":").map(Number)
    return h + m / 60
  }

  const DAY_START = 6
  const DAY_END = 18
  const TOTAL_HOURS = DAY_END - DAY_START

  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const breakIn = breakInTime ? parseTime(breakInTime) : null
  const breakOut = breakOutTime ? parseTime(breakOutTime) : null

  const startPercent = ((start - DAY_START) / TOTAL_HOURS) * 100
  const endPercent = ((end - DAY_START) / TOTAL_HOURS) * 100
  const width = endPercent - startPercent

  const barStart = Math.max(0, Math.min(100, startPercent))
  const barWidth = Math.max(0, Math.min(100 - barStart, width))

  const breakStartPercent = breakIn ? ((breakIn - DAY_START) / TOTAL_HOURS) * 100 : null
  const breakEndPercent = breakOut ? ((breakOut - DAY_START) / TOTAL_HOURS) * 100 : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-muted-foreground">Shift Timeline</h4>
        <div className="text-xs text-muted-foreground">{startTime} - {endTime}</div>
      </div>

      <div className="relative h-4 bg-secondary rounded-lg overflow-hidden border border-border">
        {/* Main shift bar - height 2 */}
        <div
          className="absolute h-2 top-1 bg-linear-to-r from-blue-500 to-blue-400 rounded"
          style={{
            left: `${barStart}%`,
            width: `${barWidth}%`,
            minWidth: "12px",
          }}
        />

        {/* Break indicator - gray area height 4 */}
        {breakStartPercent !== null && breakEndPercent !== null && (
          <div
            className="absolute h-4 top-0 bg-gray-300/40 border-l border-r border-gray-400/60"
            style={{
              left: `${breakStartPercent}%`,
              width: `${Math.max(2, breakEndPercent - breakStartPercent)}%`,
            }}
          />
        )}

        {/* Hour markers */}
        <div className="absolute inset-0 flex items-end pointer-events-none">
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
            <div key={i} className="flex-1 relative" style={{ width: `${100 / TOTAL_HOURS}%` }}>
              <div className="absolute bottom-0 w-0.5 h-1 bg-border/30" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground px-1">
        {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
          const hour = DAY_START + i
          return (
            <span key={i} className="w-0 text-center text-xs">
              {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? "a" : "p"}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function TimesheetShiftCard({
  dayDate,
  shift,
  getDraft,
  setDraftField,
  resetDraft,
  isDirty,
  saveDay,
  approveDay,
  savingByShiftId,
  approvingByShiftId,
  canApprove,
  awardTagOptions,
  checksSummary,
  employeeImage,
  employeeName,
  teamsByLocationId,
}: {
  dayDate: string
  shift: ReconciledShift
  getDraft: (dailyShiftId: string) => Draft | null
  setDraftField: (dailyShiftId: string, patch: Partial<Draft>) => void
  resetDraft: (dailyShiftId: string) => void
  isDirty: (dailyShiftId: string) => boolean
  saveDay: (dailyShiftId: string) => void | Promise<void>
  approveDay: (dailyShiftId: string) => void | Promise<void>
  savingByShiftId: Record<string, boolean | undefined>
  approvingByShiftId: Record<string, boolean | undefined>
  canApprove: boolean
  awardTagOptions: Array<{ label: string; value: string }>
  checksSummary?: { passing: number; total: number } | null
  employeeImage?: string
  employeeName?: string
  teamsByLocationId?: Map<string, Array<{ id: string; name: string }>>
}) {
  const [editMode, setEditMode] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>(shift.roster?.roleId || "")
  const dailyShiftId = shift.actual?.dailyShiftId ?? null
  const draft = dailyShiftId ? getDraft(dailyShiftId) : null
  const dirty = dailyShiftId ? isDirty(dailyShiftId) : false
  const saving = dailyShiftId ? Boolean(savingByShiftId[dailyShiftId]) : false
  const approving = dailyShiftId ? Boolean(approvingByShiftId[dailyShiftId]) : false
  const approved = dailyShiftId ? shiftIsApproved(shift.actual) : false
  const isPayrollLocked = dailyShiftId ? shiftIsLocked(shift.actual) : false
  const locked = isPayrollLocked || saving || approving
  const canEditTeam = Boolean(canApprove) && !locked

  const rStartLabel = safeIsoToHHmm(shift.roster?.startTimeUtc) || ""
  const rEndLabel = safeIsoToHHmm(shift.roster?.endTimeUtc) || ""
  const aStartLabel = draft?.startTime || safeIsoToHHmm(shift.actual?.startTimeUtc) || ""
  const aEndLabel = draft?.endTime || safeIsoToHHmm(shift.actual?.endTimeUtc) || ""
  const aBreakInLabel = draft?.breakInTime || safeIsoToHHmm(shift.actual?.breakInTimeUtc) || ""
  const aBreakOutLabel = draft?.breakOutTime || safeIsoToHHmm(shift.actual?.breakOutTimeUtc) || ""
  const breakMins = calculateBreakMinutesFromHHmm(aBreakInLabel || null, aBreakOutLabel || null)

  const rosterMinutes = (() => {
    const s = hhmmToMinutes(rStartLabel)
    const e = hhmmToMinutes(rEndLabel)
    if (s == null || e == null || e <= s) return null
    return e - s
  })()

  const actualMinutes = (() => {
    const s = hhmmToMinutes(aStartLabel)
    const e = hhmmToMinutes(aEndLabel)
    if (s == null || e == null || e <= s) return null
    return Math.max(0, e - s)
  })()

  const actualWorkMinutes = typeof actualMinutes === "number" ? Math.max(0, actualMinutes - breakMins) : null

  const warnings: string[] = []
  if (shift.flags?.missingActual) warnings.push("Missing actual clock-in/out")
  if (shift.flags?.extraActual) warnings.push("Extra actual shift (not rostered)")
  if (shift.flags?.incompleteActual) warnings.push("Incomplete clock-in/out")
  if (Array.isArray(shift.variances) && shift.variances.some((x) => x.type === "DURATION_MISMATCH")) {
    warnings.push("Shift length does not match rostered length")
  }
  if (!approved && dailyShiftId) warnings.push("Shift is not approved")

  const canEdit = !isPayrollLocked && dailyShiftId

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden hover:border-accent/50 transition-colors mb-3">
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Column 1: Employee Info + Avatar (lg:col-span-2) */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* Avatar Section - Match reference size */}
            <div className="flex flex-col items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Avatar className="h-14 w-14 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={employeeImage} alt={employeeName} />
                    <AvatarFallback>
                      <User className="h-7 w-7" />
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold">{employeeName || "Employee"} - {dayDate}</h4>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square bg-muted rounded">
                          <img
                            src={employeeImage}
                            alt={`Punch ${i}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="text-center">
                <h3 className="font-semibold text-foreground text-xs">{format(parseLocalDate(dayDate), "EEE, d")}</h3>
                <p className="text-xs text-muted-foreground leading-tight">{employeeName || "Employee"}</p>
              </div>
            </div>

            {/* Team and Award Tag selects */}
            <div className="space-y-2">
              {(() => {
                const locId = shift.roster?.locationId ? String(shift.roster.locationId) : ""
                const fallbackLocId = (shift as any)?.actual?.locationId ? String((shift as any).actual.locationId) : ""
                const effectiveLocId = locId || fallbackLocId
                const teams = effectiveLocId && teamsByLocationId ? teamsByLocationId.get(effectiveLocId) ?? [] : []
                const selectedLabel =
                  teams.find((t) => t.id === selectedTeamId)?.name ??
                  (selectedTeamId ? selectedTeamId : "")
                const canPersistTeamChange =
                  editMode && canEditTeam && (Boolean(shift.rosterShiftId) || Boolean(shift.actual?.dailyShiftId))
                return (
                  <Combobox
                    value={selectedTeamId}
                    onValueChange={async (next) => {
                      setSelectedTeamId(String(next ?? ""))
                      const rosterShiftId = shift.rosterShiftId
                      const weekId = weekIdFromYmd(dayDate)
                      if (!next) return
                      if (!canPersistTeamChange) return
                      try {
                        if (rosterShiftId && weekId) {
                          await apiJson(
                            `/api/rosters/${encodeURIComponent(weekId)}/shifts/${encodeURIComponent(rosterShiftId)}`,
                            { method: "PUT", body: JSON.stringify({ roleId: next }) },
                          )
                        } else if (shift.actual?.dailyShiftId) {
                          await apiJson(`/api/daily-shifts/${encodeURIComponent(shift.actual.dailyShiftId)}`, {
                            method: "PATCH",
                            body: JSON.stringify({ roleId: next }),
                          })
                        }
                      } catch {
                        setSelectedTeamId(String(shift.roster?.roleId ?? shift.actual?.roleId ?? ""))
                      }
                    }}
                  >
                    <ComboboxTrigger
                      disabled={false}
                      className={cn(
                        "w-full justify-between px-2.5 py-1.5 text-xs bg-secondary hover:bg-secondary border border-border rounded",
                        !canPersistTeamChange ? "opacity-80" : "",
                      )}
                    >
                      <span className="truncate text-left">{selectedLabel || "Select Team"}</span>
                    </ComboboxTrigger>
                    <ComboboxContent className="w-[--anchor-width]">
                      <ComboboxEmpty>No teams found.</ComboboxEmpty>
                      <ComboboxList>
                        {teams.map((t) => (
                          <ComboboxItem key={t.id} value={t.id}>
                            {t.name}
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )
              })()}

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">Award Tags</label>
                <div className="bg-secondary rounded border border-border p-2 space-y-1 max-h-32 overflow-y-auto">
                  {awardTagOptions.length > 0 ? (
                    awardTagOptions.map(tag => (
                      <label key={tag.value} className="flex items-center gap-2 cursor-pointer hover:bg-accent/10 rounded px-1.5 py-1">
                        <input
                          type="checkbox"
                          value={tag.value}
                          checked={(draft?.awardTags ?? shift.actual?.awardTags ?? []).includes(tag.value)}
                          onChange={(e) => {
                            if (dailyShiftId && canEdit) {
                              const current = draft?.awardTags ?? shift.actual?.awardTags ?? []
                              const updated = e.target.checked
                                ? [...current, tag.value]
                                : current.filter(t => t !== tag.value)
                              setDraftField(dailyShiftId, { awardTags: updated })
                            }
                          }}
                          disabled={!canEdit}
                          className="w-3 h-3 rounded"
                        />
                        <span className="text-xs text-foreground">{tag.label}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground p-1">No award tags available</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Timeline and Times (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {aStartLabel && aEndLabel && (
              <ShiftTimeline
                startTime={aStartLabel}
                endTime={aEndLabel}
                breakInTime={aBreakInLabel}
                breakOutTime={aBreakOutLabel}
              />
            )}

            {editMode ? (
              <>
                {/* Edit Mode: Start/End Times */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="border-2 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 rounded p-2">
                    <label className="text-xs text-muted-foreground">Clock In</label>
                    <input
                      type="text"
                      className="w-full font-mono font-semibold text-foreground bg-transparent text-sm border-b border-blue-500 focus:border-blue-600 outline-none"
                      value={aStartLabel}
                      onChange={(e) => dailyShiftId && setDraftField(dailyShiftId, { startTime: e.target.value || null })}
                      disabled={!canEdit}
                      placeholder="08:06"
                    />
                    <div className="text-xs text-muted-foreground mt-1">R {rStartLabel}</div>
                  </div>
                  <div className="border-2 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 rounded p-2">
                    <label className="text-xs text-muted-foreground">Clock Out</label>
                    <input
                      type="text"
                      className="w-full font-mono font-semibold text-foreground bg-transparent text-sm border-b border-blue-500 focus:border-blue-600 outline-none"
                      value={aEndLabel}
                      onChange={(e) => dailyShiftId && setDraftField(dailyShiftId, { endTime: e.target.value || null })}
                      disabled={!canEdit}
                      placeholder="16:30"
                    />
                    <div className="text-xs text-muted-foreground mt-1">R {rEndLabel}</div>
                  </div>

                  {/* Breaks: single box + popover editor */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!canEdit}
                        className={cn(
                          "text-left border-2 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 rounded p-2 transition-colors",
                          canEdit ? "hover:bg-blue-100/60 dark:hover:bg-blue-950/30" : "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="text-xs text-muted-foreground">Break</div>
                        <div className="font-mono font-semibold text-foreground text-sm">
                          {breakMins > 0 ? `${breakMins}m` : "No break"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {breakMins > 0 ? "View break" : "Add break"}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold">Breaks</div>
                          <div className="text-xs text-muted-foreground">{breakMins > 0 ? `${breakMins}m` : ""}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Break In</label>
                            <input
                              type="text"
                              className="w-full h-9 rounded border border-border bg-background px-2 font-mono text-sm"
                              value={aBreakInLabel}
                              onChange={(e) => dailyShiftId && setDraftField(dailyShiftId, { breakInTime: e.target.value || null })}
                              disabled={!canEdit}
                              placeholder="12:00"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Break Out</label>
                            <input
                              type="text"
                              className="w-full h-9 rounded border border-border bg-background px-2 font-mono text-sm"
                              value={aBreakOutLabel}
                              onChange={(e) => dailyShiftId && setDraftField(dailyShiftId, { breakOutTime: e.target.value || null })}
                              disabled={!canEdit}
                              placeholder="12:30"
                            />
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center justify-between pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => dailyShiftId && setDraftField(dailyShiftId, { breakInTime: null, breakOutTime: null })}
                            >
                              Clear
                            </Button>
                            <div className="text-xs text-muted-foreground">Set both times to record a break</div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary rounded p-2">
                    <div className="text-xs text-muted-foreground">Clock In</div>
                    <div className="font-mono font-semibold text-foreground text-sm">{aStartLabel || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">R {rStartLabel}</div>
                  </div>
                  <div className="bg-secondary rounded p-2">
                    <div className="text-xs text-muted-foreground">Clock Out</div>
                    <div className="font-mono font-semibold text-foreground text-sm">{aEndLabel || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">R {rEndLabel}</div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!canEdit}
                        className={cn(
                          "text-left bg-secondary rounded p-2 border border-border transition-colors",
                          canEdit ? "hover:bg-accent/10" : "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="text-xs text-muted-foreground">Break</div>
                        <div className="font-mono font-semibold text-foreground text-sm">
                          {breakMins > 0 ? `${breakMins}m` : "No break"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {breakMins > 0 ? "View break" : "Add break"}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold">Breaks</div>
                          <div className="text-xs text-muted-foreground">{breakMins > 0 ? `${breakMins}m` : ""}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Break In</label>
                            <input
                              type="text"
                              className="w-full h-9 rounded border border-border bg-background px-2 font-mono text-sm"
                              value={aBreakInLabel}
                              onChange={(e) => dailyShiftId && setDraftField(dailyShiftId, { breakInTime: e.target.value || null })}
                              disabled={!canEdit}
                              placeholder="12:00"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Break Out</label>
                            <input
                              type="text"
                              className="w-full h-9 rounded border border-border bg-background px-2 font-mono text-sm"
                              value={aBreakOutLabel}
                              onChange={(e) => dailyShiftId && setDraftField(dailyShiftId, { breakOutTime: e.target.value || null })}
                              disabled={!canEdit}
                              placeholder="12:30"
                            />
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center justify-between pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => dailyShiftId && setDraftField(dailyShiftId, { breakInTime: null, breakOutTime: null })}
                            >
                              Clear
                            </Button>
                            <div className="text-xs text-muted-foreground">Set both times to record a break</div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          {/* Column 3: Status Badge + Wage Info (lg:col-span-5) */}
          <div className="lg:col-span-5">
            <div className="flex gap-3 h-full items-stretch">
              {/* Wage Summary - 3 columns: label | $ | hours */}
              <div className="flex-1 border-r border-border pr-3 flex flex-col justify-center h-full">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs h-full content-center">
                  <div className="text-muted-foreground">Wage Cost:</div>
                  <div className="font-semibold text-foreground tabular-nums">{formatMoney(shift.actual?.computedTotalCost)}</div>
                  <div className="text-muted-foreground tabular-nums">({minutesToHhMm(actualWorkMinutes)})</div>

                  <div className="text-muted-foreground">Rostered:</div>
                  <div className="font-semibold text-foreground tabular-nums">—</div>
                  <div className="text-muted-foreground tabular-nums">({minutesToHhMm(rosterMinutes)})</div>

                  <div className="text-muted-foreground">Variance:</div>
                  <div
                    className={cn(
                      "font-semibold tabular-nums",
                      Math.abs(shift.varianceMinutes?.duration ?? 0) > 0
                        ? "text-green-700 dark:text-green-400"
                        : "text-foreground"
                    )}
                  >
                    —
                  </div>
                  <div className="text-muted-foreground tabular-nums">
                    ({minutesToHhMm(Math.abs(shift.varianceMinutes?.duration ?? 0))})
                  </div>
                </div>
              </div>

              {/* Action Buttons - vertical (2 rows), stretch full height */}
              <div className="flex flex-col justify-between h-full gap-2 min-w-[140px]">
                <Button
                  type="button"
                  size="sm"
                  variant={approved ? "secondary" : "outline"}
                  disabled={!dailyShiftId || locked || (approved ? true : !canApprove)}
                  onClick={() => {
                    if (!approved && canApprove && !locked && dailyShiftId) void approveDay(dailyShiftId)
                  }}
                  className={cn(
                    "h-10 justify-start",
                    approved
                      ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300"
                  )}
                >
                  <CheckCircle className="h-4 w-4" />
                  {approved ? "Approved" : "Pending"}
                </Button>

                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={editMode ? "default" : "outline"}
                    disabled={!dailyShiftId || locked}
                    onClick={() => {
                      if (!dailyShiftId) return
                      if (editMode && dirty) void saveDay(dailyShiftId)
                      setEditMode(!editMode)
                    }}
                    className={cn("h-10 justify-start", editMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "")}
                  >
                    <Edit2 className="h-4 w-4" />
                    {editMode ? (dirty ? "Save" : "Done") : "Edit"}
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" disabled className="h-10 justify-start">
                    <Clock className="h-4 w-4" />
                    Locked
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allowances Section */}
      <div className="border-t border-border px-4 py-1.5 bg-muted/5 text-xs text-muted-foreground">
        <span className="font-medium">Allowances:</span> No allowances applying
      </div>

      {/* Messages Section */}
      {(warnings.length > 0 || checksSummary) && (
        <div className="border-t border-border space-y-0">
          {checksSummary && approved && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800 px-4 py-2 text-xs text-emerald-800 dark:text-emerald-400">
              <span className="font-semibold">✓ {checksSummary.passing} of {checksSummary.total} checks passing: ready for payroll</span>
            </div>
          )}
          {warnings.map((warning, i) => (
            <div key={i} className="bg-orange-50 dark:bg-orange-950/30 border-t border-orange-200 dark:border-orange-800 px-4 py-2 text-xs text-orange-800 dark:text-orange-400">
              <span className="font-semibold">⊘ {warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TimesheetDayRow({
  day,
  getDraft,
  setDraftField,
  resetDraft,
  isDirty,
  saveDay,
  approveDay,
  savingByShiftId,
  approvingByShiftId,
  checksSummary,
  warnThresholdMinutes = 30,
  canApprove = true,
  awardTagOptions = [],
  employeeImage,
  employeeName,
  teamsByLocationId,
}: {
  day: ReconciledDay
  getDraft: (dailyShiftId: string) => Draft | null
  setDraftField: (dailyShiftId: string, patch: Partial<Draft>) => void
  resetDraft: (dailyShiftId: string) => void
  isDirty: (dailyShiftId: string) => boolean
  saveDay: (dailyShiftId: string) => void | Promise<void>
  approveDay: (dailyShiftId: string) => void | Promise<void>
  savingByShiftId: Record<string, boolean | undefined>
  approvingByShiftId: Record<string, boolean | undefined>
  checksSummary?: { passing: number; total: number } | null
  warnThresholdMinutes?: number
  canApprove?: boolean
  awardTagOptions?: Array<{ label: string; value: string }>
  employeeImage?: string
  employeeName?: string
  teamsByLocationId?: Map<string, Array<{ id: string; name: string }>>
}) {
  const shifts = day.reconciledShifts ?? []

  return (
    <div className="space-y-4">
      {shifts.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center border border-border rounded-lg bg-card">
          {day.date} - No shifts scheduled
        </div>
      ) : (
        shifts.map((s, idx) => (
          <TimesheetShiftCard
            key={`${s.rosterShiftId ?? "no-roster"}-${s.actual?.dailyShiftId ?? "no-actual"}-${idx}`}
            dayDate={day.date}
            shift={s}
            getDraft={getDraft}
            setDraftField={setDraftField}
            resetDraft={resetDraft}
            isDirty={isDirty}
            saveDay={saveDay}
            approveDay={approveDay}
            savingByShiftId={savingByShiftId}
            approvingByShiftId={approvingByShiftId}
            checksSummary={checksSummary}
            canApprove={Boolean(canApprove)}
            awardTagOptions={awardTagOptions ?? []}
            employeeImage={employeeImage}
            employeeName={employeeName}
            teamsByLocationId={teamsByLocationId}
          />
        ))
      )}
    </div>
  )
}
