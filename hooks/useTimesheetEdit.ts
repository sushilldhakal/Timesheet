"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

/**
 * Backend contract (GET `/api/timesheets/employee/[employeeId]/week/[weekId]`)
 * - weekId is ISO week id: `YYYY-Www` (e.g. `2026-W15`)
 * - response is `WeekReconciliationResponse` (see `lib/services/timesheet-reconciliation.ts`)
 */
export type ReconciledShift = {
  rosterShiftId: string | null
  date: string // YYYY-MM-DD (UTC date-only)
  variances?: Array<{
    type:
      | "MISSING_ACTUAL"
      | "EXTRA_ACTUAL"
      | "INCOMPLETE_ACTUAL"
      | "START_TIME_MISMATCH"
      | "END_TIME_MISMATCH"
      | "DURATION_MISMATCH"
    rostered?: string | null
    actual?: string | null
    minutes?: number | null
  }>
  roster?: {
    startTimeUtc: string
    endTimeUtc: string
    locationId: string
    roleId: string
    status?: "draft" | "published"
    notes?: string
  } | null
  actual?: {
    dailyShiftId: string
    startTimeUtc: string | null
    endTimeUtc: string | null
    breakInTimeUtc?: string | null
    breakOutTimeUtc?: string | null
    status: string
    source: string
    totalBreakMinutes?: number | null
    totalWorkingHours?: number | null
    awardTags?: string[] | null
    computedTotalCost?: number | null
  } | null
  varianceMinutes: {
    start: number | null
    end: number | null
    duration: number | null
  }
  flags: {
    missingActual: boolean
    extraActual: boolean
    incompleteActual: boolean
  }
}

export type WeekReconciliationResponse = {
  employeeId: string
  weekId: string // YYYY-Www
  weekStartUtc: string
  weekEndUtc: string
  roster: { weekId: string; rosterId: string | null; status: "draft" | "published" | null }
  actual: { count: number }
  days: Array<{
    date: string // YYYY-MM-DD
    reconciledShifts: ReconciledShift[]
    totals: { rosterMinutes: number; actualMinutes: number; varianceMinutes: number }
  }>
  variances: {
    totalRosterMinutes: number
    totalActualMinutes: number
    totalVarianceMinutes: number
    missingActualCount: number
    extraActualCount: number
  }
  compliance: {
    summary: { passing: number; total: number; warnings: number; blockingFailures: number }
    results: Array<any>
    rules: {
      maxHoursPerWeek: number
      minRestHoursBetweenShifts: number
      maxConsecutiveDays: number
      rosterVarianceThresholdMinutes: number
    }
  }
  status: { overall: "PASS" | "WARN" | "FAIL"; message: string }
}

/**
 * Stable UI model exposed by this hook.
 *
 * Each editable row is backed by an actual DailyShift (only rows with
 * `actual.dailyShiftId` can be edited/saved/approved).
 */
export type TimesheetEditRow = {
  rowId: string
  date: string // YYYY-MM-DD
  rosterShiftId: string | null
  roster: ReconciledShift["roster"]
  actual: ReconciledShift["actual"]
  variances?: ReconciledShift["variances"]
  varianceMinutes: ReconciledShift["varianceMinutes"]
  flags: ReconciledShift["flags"]
  editable: boolean
}

export type TimesheetEditDay = {
  date: string
  rows: TimesheetEditRow[]
  totals: { rosterMinutes: number; actualMinutes: number; varianceMinutes: number }
}

type Draft = {
  startTime: string | null
  endTime: string | null
  breakInTime: string | null
  breakOutTime: string | null
  awardTags: string[]
}

function toHHmm(value?: string | null): string | null {
  if (!value) return null
  if (/^\d{2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function fromDateAndHHmmToIso(date: string, hhmm: string): string {
  // Interprets the date + time as UTC time (backend stores UTC timestamps).
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = hhmm.split(":").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
  return dt.toISOString()
}

function isHHmm(value: string) {
  return /^\d{2}:\d{2}$/.test(value)
}

function toIsoIfPossible(date: string, value?: string | null): string | null {
  if (!value) return null
  if (isHHmm(value)) return fromDateAndHHmmToIso(date, value)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function minutesBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / (60 * 1000))
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString()
}

function normalizeShiftFromApi(shift: any): {
  id: string
  clockInUtc: string | null
  clockOutUtc: string | null
  totalBreakMinutes: number | null
  status: string | null
  computedTotalCost: number | null
} | null {
  if (!shift || typeof shift !== "object") return null
  const id = shift._id ? String(shift._id) : shift.id ? String(shift.id) : null
  if (!id) return null

  const clockInUtc =
    typeof shift.clockInUtc === "string"
      ? shift.clockInUtc
      : typeof shift.clockIn?.time === "string"
        ? shift.clockIn.time
        : shift.clockIn?.time instanceof Date
          ? shift.clockIn.time.toISOString()
          : null
  const clockOutUtc =
    typeof shift.clockOutUtc === "string"
      ? shift.clockOutUtc
      : typeof shift.clockOut?.time === "string"
        ? shift.clockOut.time
        : shift.clockOut?.time instanceof Date
          ? shift.clockOut.time.toISOString()
          : null

  const totalBreakMinutes = typeof shift.totalBreakMinutes === "number" ? shift.totalBreakMinutes : null
  const status = shift.status != null ? String(shift.status) : null
  const computedTotalCost =
    typeof shift.computedTotalCost === "number"
      ? shift.computedTotalCost
      : typeof shift.computed?.totalCost === "number"
        ? shift.computed.totalCost
        : null

  return {
    id,
    clockInUtc: clockInUtc ? new Date(clockInUtc).toISOString() : null,
    clockOutUtc: clockOutUtc ? new Date(clockOutUtc).toISOString() : null,
    totalBreakMinutes,
    status,
    computedTotalCost,
  }
}

function safeParseNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
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

function toIsoWeekId(inputWeekId: string): string {
  // Accept either an actual backend week id (YYYY-Www) OR a week-start date (yyyy-MM-dd).
  if (/^\d{4}-W\d{2}$/.test(inputWeekId)) return inputWeekId
  if (/^\d{4}-\d{2}-\d{2}$/.test(inputWeekId)) {
    const [y, m, d] = inputWeekId.split("-").map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))

    // ISO week algorithm: take Thursday of current week as the week-year anchor.
    const day = (date.getUTCDay() + 6) % 7 // Mon=0..Sun=6
    const thursday = new Date(date)
    thursday.setUTCDate(date.getUTCDate() - day + 3)
    const weekYear = thursday.getUTCFullYear()

    const jan4 = new Date(Date.UTC(weekYear, 0, 4))
    const jan4Day = (jan4.getUTCDay() + 6) % 7
    const week1Monday = new Date(jan4)
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day)

    const weekNo = 1 + Math.round((thursday.getTime() - week1Monday.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return `${weekYear}-W${String(weekNo).padStart(2, "0")}`
  }
  // Fall back to input; backend will validate and return a 400 with details.
  return inputWeekId
}

export function useTimesheetEdit(employeeId: string, weekId: string) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [week, setWeek] = useState<WeekReconciliationResponse | null>(null)

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [savingByShiftId, setSavingByShiftId] = useState<Record<string, boolean>>({})
  const [approvingByShiftId, setApprovingByShiftId] = useState<Record<string, boolean>>({})

  const lastGoodWeekRef = useRef<WeekReconciliationResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setLoadError(null)
    try {
      const backendWeekId = toIsoWeekId(weekId)
      const data = await apiJson<WeekReconciliationResponse>(
        `/api/timesheets/employee/${encodeURIComponent(employeeId)}/week/${encodeURIComponent(
          backendWeekId,
        )}`,
        { signal: ac.signal }
      )
      setWeek(data)
      lastGoodWeekRef.current = data

      // Initialize drafts from actuals for per-shift editing (keyed by dailyShiftId).
      const initialDrafts: Record<string, Draft> = {}
      for (const day of data.days ?? []) {
        for (const rs of day.reconciledShifts ?? []) {
          const a = rs.actual
          if (!a?.dailyShiftId) continue
          initialDrafts[a.dailyShiftId] = {
            startTime: toHHmm(a.startTimeUtc) ?? null,
            endTime: toHHmm(a.endTimeUtc) ?? null,
            breakInTime: toHHmm(a.breakInTimeUtc) ?? null,
            breakOutTime: toHHmm(a.breakOutTimeUtc) ?? null,
            awardTags: Array.isArray(a.awardTags) ? a.awardTags.map((t) => String(t)) : [],
          }
        }
      }
      setDrafts(initialDrafts)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      setLoadError(e?.message ?? "Failed to load timesheet")
      setWeek(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, weekId])

  useEffect(() => {
    void load()
    return () => abortRef.current?.abort()
  }, [load])

  const days: any[] = useMemo(() => {
    const srcDays = week?.days ?? []
    // Return days with reconciledShifts directly (not rows) to match TimesheetDayRow component expectation
    return srcDays.map((d) => ({
      date: d.date,
      reconciledShifts: d.reconciledShifts ?? [],
      totals: d.totals,
    }))
  }, [week])

  const checksSummary = useMemo(() => {
    const s = week?.compliance?.summary
    if (!s || typeof s.total !== "number") return null
    return { passing: s.passing ?? 0, total: s.total ?? 0 }
  }, [week?.compliance?.summary])

  const getDraft = useCallback(
    (dailyShiftId: string): Draft | null => {
      return drafts[dailyShiftId] ?? null
    },
    [drafts]
  )

  const setDraftField = useCallback(
    (dailyShiftId: string, patch: Partial<Draft>) => {
      setDrafts(prev => ({
        ...prev,
        [dailyShiftId]: {
          ...(prev[dailyShiftId] ?? { startTime: null, endTime: null, breakInTime: null, breakOutTime: null, awardTags: [] }),
          ...patch,
        },
      }))
    },
    []
  )

  const resetDraft = useCallback(
    (dailyShiftId: string) => {
      const currentWeek = week
      const actual =
        currentWeek?.days
          ?.flatMap((d) => d.reconciledShifts ?? [])
          .map((rs) => rs.actual)
          .find((a) => a?.dailyShiftId === dailyShiftId) ?? null
      if (!actual) return
      setDrafts(prev => ({
        ...prev,
        [dailyShiftId]: {
          startTime: toHHmm(actual.startTimeUtc) ?? null,
          endTime: toHHmm(actual.endTimeUtc) ?? null,
          breakInTime: toHHmm(actual.breakInTimeUtc) ?? null,
          breakOutTime: toHHmm(actual.breakOutTimeUtc) ?? null,
          awardTags: Array.isArray(actual.awardTags) ? actual.awardTags.map((t) => String(t)) : [],
        },
      }))
    },
    [week]
  )

  const isDirty = useCallback(
    (dailyShiftId: string) => {
      const currentWeek = week
      const actual =
        currentWeek?.days
          ?.flatMap((d) => d.reconciledShifts ?? [])
          .map((rs) => rs.actual)
          .find((a) => a?.dailyShiftId === dailyShiftId) ?? null
      const d = drafts[dailyShiftId]
      if (!actual || !d) return false
      const aStart = toHHmm(actual.startTimeUtc) ?? null
      const aEnd = toHHmm(actual.endTimeUtc) ?? null
      const aBreakIn = toHHmm(actual.breakInTimeUtc) ?? null
      const aBreakOut = toHHmm(actual.breakOutTimeUtc) ?? null
      const aTags = Array.isArray(actual.awardTags) ? actual.awardTags.map((t) => String(t)).sort() : []
      const dTags = Array.isArray(d.awardTags) ? [...d.awardTags].map((t) => String(t)).sort() : []
      const tagsDirty = aTags.length !== dTags.length || aTags.some((t, i) => t !== dTags[i])
      return aStart !== d.startTime || aEnd !== d.endTime || aBreakIn !== d.breakInTime || aBreakOut !== d.breakOutTime || tagsDirty
    },
    [week, drafts]
  )

  const saveDay = useCallback(
    async (dailyShiftId: string) => {
      const currentWeek = week
      const d = drafts[dailyShiftId] ?? null
      if (!currentWeek || !d) return

      const rollbackWeek = currentWeek

      // Find the row + date for this dailyShiftId.
      let date: string | null = null
      let actual: ReconciledShift["actual"] | null = null
      for (const day of currentWeek.days ?? []) {
        for (const rs of day.reconciledShifts ?? []) {
          if (rs.actual?.dailyShiftId === dailyShiftId) {
            date = day.date
            actual = rs.actual
            break
          }
        }
        if (actual) break
      }
      if (!date || !actual) return

      const aStart = toHHmm(actual.startTimeUtc) ?? null
      const aEnd = toHHmm(actual.endTimeUtc) ?? null
      const aBreakIn = toHHmm(actual.breakInTimeUtc) ?? null
      const aBreakOut = toHHmm(actual.breakOutTimeUtc) ?? null
      const aTags = Array.isArray(actual.awardTags) ? actual.awardTags.map((t) => String(t)).sort() : []
      const dTags = Array.isArray(d.awardTags) ? [...d.awardTags].map((t) => String(t)).sort() : []

      const startTimeIso = d.startTime ? fromDateAndHHmmToIso(date, d.startTime) : null
      const endTimeIso = d.endTime ? fromDateAndHHmmToIso(date, d.endTime) : null
      const breakInTimeIso = d.breakInTime ? fromDateAndHHmmToIso(date, d.breakInTime) : null
      const breakOutTimeIso = d.breakOutTime ? fromDateAndHHmmToIso(date, d.breakOutTime) : null

      const payload: {
        clockInUtc?: string | null
        clockOutUtc?: string | null
        breaks?: Array<{ startTimeUtc: string; endTimeUtc: string; isPaid?: boolean; source?: "clocked" | "automatic" }> | null
        awardTags?: string[] | null
      } = {}

      if (d.startTime !== aStart) payload.clockInUtc = startTimeIso
      if (d.endTime !== aEnd) payload.clockOutUtc = endTimeIso

      const breakEdited = d.breakInTime !== aBreakIn || d.breakOutTime !== aBreakOut
      if (breakEdited) {
        if (!d.breakInTime || !d.breakOutTime) {
          payload.breaks = []
        } else {
          if (!breakInTimeIso || !breakOutTimeIso) {
            toast.error("Invalid break times")
            return
          }
          payload.breaks = [{ startTimeUtc: breakInTimeIso, endTimeUtc: breakOutTimeIso, source: "clocked" }]
        }
      }

      if (aTags.length !== dTags.length || aTags.some((t, i) => t !== dTags[i])) {
        payload.awardTags = dTags
      }

      if (Object.keys(payload).length === 0) return

      // Optimistic merge into week state.
      setWeek((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          days: (prev.days ?? []).map((day) => ({
            ...day,
            reconciledShifts: (day.reconciledShifts ?? []).map((rs) => {
              if (rs.actual?.dailyShiftId !== dailyShiftId) return rs
              const nextActual = { ...rs.actual }
              if (payload.clockInUtc !== undefined) nextActual.startTimeUtc = payload.clockInUtc
              if (payload.clockOutUtc !== undefined) nextActual.endTimeUtc = payload.clockOutUtc
              if (payload.breaks !== undefined) {
                if (Array.isArray(payload.breaks) && payload.breaks.length > 0) {
                  nextActual.breakInTimeUtc = payload.breaks[0].startTimeUtc
                  nextActual.breakOutTimeUtc = payload.breaks[0].endTimeUtc
                } else {
                  nextActual.breakInTimeUtc = null
                  nextActual.breakOutTimeUtc = null
                }
              }
              if (payload.awardTags !== undefined) nextActual.awardTags = payload.awardTags

              // Backend forces re-approval when editing an approved shift.
              if (String(nextActual.status ?? "") === "approved") nextActual.status = "completed"
              return { ...rs, actual: nextActual }
            }),
          })),
        }
      })

      setSavingByShiftId(prev => ({ ...prev, [dailyShiftId]: true }))
      try {
        const res = await apiJson<any>(`/api/daily-shifts/${encodeURIComponent(dailyShiftId)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })

        const normalized = normalizeShiftFromApi(res?.shift ?? res)
        if (normalized) {
          setWeek((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              days: (prev.days ?? []).map((day) => ({
                ...day,
                reconciledShifts: (day.reconciledShifts ?? []).map((rs) => {
                  if (rs.actual?.dailyShiftId !== dailyShiftId) return rs
                  return {
                    ...rs,
                    actual: {
                      ...rs.actual,
                      startTimeUtc: normalized.clockInUtc,
                      endTimeUtc: normalized.clockOutUtc,
                      totalBreakMinutes: normalized.totalBreakMinutes,
                      status: normalized.status ?? rs.actual?.status ?? "",
                      computedTotalCost: normalized.computedTotalCost,
                    },
                  }
                }),
              })),
            }
          })

          setDrafts((prev) => {
            const breakIn = payload.breaks && payload.breaks.length > 0 ? payload.breaks[0].startTimeUtc : null
            const breakOut = payload.breaks && payload.breaks.length > 0 ? payload.breaks[0].endTimeUtc : null
            return {
              ...prev,
              [dailyShiftId]: {
                startTime: toHHmm(normalized.clockInUtc) ?? null,
                endTime: toHHmm(normalized.clockOutUtc) ?? null,
                breakInTime: toHHmm(breakIn) ?? null,
                breakOutTime: toHHmm(breakOut) ?? null,
                awardTags: payload.awardTags ?? (prev[dailyShiftId]?.awardTags ?? []),
              },
            }
          })
        }

        toast.success("Saved")
      } catch (e: any) {
        setWeek(rollbackWeek)
        toast.error(e?.message ?? "Failed to save")
      } finally {
        setSavingByShiftId(prev => ({ ...prev, [dailyShiftId]: false }))
      }
    },
    [week, drafts]
  )

  const approveDay = useCallback(
    async (dailyShiftId: string) => {
      const currentWeek = week
      const rollbackWeek = currentWeek

      // Optimistic approve.
      setWeek((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          days: (prev.days ?? []).map((day) => ({
            ...day,
            reconciledShifts: (day.reconciledShifts ?? []).map((rs) => {
              if (rs.actual?.dailyShiftId !== dailyShiftId) return rs
              return { ...rs, actual: { ...rs.actual, status: "approved" } }
            }),
          })),
        }
      })

      setApprovingByShiftId(prev => ({ ...prev, [dailyShiftId]: true }))
      try {
        const res = await apiJson<any>(`/api/daily-shifts/${encodeURIComponent(dailyShiftId)}/approve`, {
          method: "POST",
          body: JSON.stringify({}),
        })
        const normalized = normalizeShiftFromApi(res?.shift ?? res)
        if (normalized) {
          setWeek((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              days: (prev.days ?? []).map((day) => ({
                ...day,
                reconciledShifts: (day.reconciledShifts ?? []).map((rs) => {
                  if (rs.actual?.dailyShiftId !== dailyShiftId) return rs
                  return {
                    ...rs,
                    actual: {
                      ...rs.actual,
                      startTimeUtc: normalized.clockInUtc,
                      endTimeUtc: normalized.clockOutUtc,
                      totalBreakMinutes: normalized.totalBreakMinutes ?? rs.actual?.totalBreakMinutes ?? null,
                      status: normalized.status ?? "approved",
                      computedTotalCost: normalized.computedTotalCost,
                    },
                  }
                }),
              })),
            }
          })
        }
        toast.success("Approved")
      } catch (e: any) {
        if (rollbackWeek) setWeek(rollbackWeek)
        toast.error(e?.message ?? "Failed to approve")
      } finally {
        setApprovingByShiftId(prev => ({ ...prev, [dailyShiftId]: false }))
      }
    },
    [week]
  )

  const reload = useCallback(async () => {
    await load()
  }, [load])

  return {
    loading,
    loadError,
    week,
    days,
    checksSummary,
    getDraft,
    setDraftField,
    resetDraft,
    isDirty,
    saveDay,
    approveDay,
    savingByShiftId,
    approvingByShiftId,
    reload,
    rollbackToLastGood: () => {
      const lg = lastGoodWeekRef.current
      if (!lg) return
      setWeek(lg)
      const initialDrafts: Record<string, Draft> = {}
      for (const day of lg.days ?? []) {
        for (const rs of day.reconciledShifts ?? []) {
          const a = rs.actual
          if (!a?.dailyShiftId) continue
          initialDrafts[a.dailyShiftId] = {
            startTime: toHHmm(a.startTimeUtc) ?? null,
            endTime: toHHmm(a.endTimeUtc) ?? null,
            breakInTime: toHHmm(a.breakInTimeUtc) ?? null,
            breakOutTime: toHHmm(a.breakOutTimeUtc) ?? null,
            awardTags: Array.isArray(a.awardTags) ? a.awardTags.map((t) => String(t)) : [],
          }
        }
      }
      setDrafts(initialDrafts)
      toast.info("Reverted unsaved changes")
    },
  }
}

