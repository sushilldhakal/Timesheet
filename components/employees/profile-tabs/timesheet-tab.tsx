"use client"

import { useEffect, useMemo, useState } from "react"
import { addWeeks, endOfISOWeek, format, getISOWeek, getISOWeekYear, setISOWeek, setISOWeekYear, startOfISOWeek } from "date-fns"
import type { TimesheetEntryRow } from "@/components/timesheet/TimesheetEntriesList"
import { TimesheetViewer } from "@/components/timesheet/TimesheetViewer"
import { TimesheetDayRow } from "@/components/TimesheetDayRow"
import { useMe } from "@/lib/queries/auth"
import { useTimesheetEdit } from "@/hooks/useTimesheetEdit"

function weekIdToDate(weekId: string): Date | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId)
  if (!m) return null
  const year = Number(m[1])
  const week = Number(m[2])
  if (!Number.isFinite(year) || !Number.isFinite(week)) return null
  if (week < 1 || week > 53) return null

  let d = new Date()
  d = setISOWeekYear(d, year)
  d = setISOWeek(d, week)
  d = startOfISOWeek(d)
  return Number.isNaN(d.getTime()) ? null : d
}

function makeWeekId(d: Date): string {
  const year = getISOWeekYear(d)
  const week = getISOWeek(d)
  return `${year}-W${String(week).padStart(2, "0")}`
}

function safeIsoToHHmm(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

export function TimesheetTab({ employeeId, employeeName, employeeImage }: { employeeId: string; employeeName?: string; employeeImage?: string }) {
  const meQuery = useMe()
  const role = String((meQuery.data as any)?.role ?? "")
  const canApprove = ["admin", "super_admin", "manager", "supervisor", "accounts"].includes(role)

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const weekId = useMemo(() => makeWeekId(selectedDate), [selectedDate])
  const weekDate = useMemo(() => weekIdToDate(weekId) ?? selectedDate, [weekId, selectedDate])

  const startDate = useMemo(() => format(startOfISOWeek(weekDate), "yyyy-MM-dd"), [weekDate])
  const endDate = useMemo(() => format(endOfISOWeek(weekDate), "yyyy-MM-dd"), [weekDate])

  const [awardTagOptions, setAwardTagOptions] = useState<Array<{ label: string; value: string }>>([])
  useEffect(() => {
    let cancelled = false
    fetch("/api/award-tags", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load award tags"))))
      .then((data) => {
        if (cancelled) return
        const opts = Array.isArray(data?.awardTags)
          ? data.awardTags
              .map((t: any) => String(t?.name ?? ""))
              .filter((name: string) => Boolean(name.trim()))
              .map((name: string) => ({ label: name, value: name }))
          : []
        setAwardTagOptions(opts)
      })
      .catch(() => {
        if (cancelled) return
        setAwardTagOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const {
    loading,
    loadError,
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
    rollbackToLastGood,
  } = useTimesheetEdit(employeeId, weekId)

  // Feed the chart with either clocked times (preferred) or rostered times (fallback),
  // so roster-only future days still show.
  const chartEntries: TimesheetEntryRow[] = useMemo(() => {
    const out: TimesheetEntryRow[] = []
    for (const day of days ?? []) {
      const shifts = (day as any)?.reconciledShifts ?? (day as any)?.rows ?? []
      if (!Array.isArray(shifts) || shifts.length === 0) continue

      for (const s of shifts as any[]) {
        const rosterStart = safeIsoToHHmm(s?.roster?.startTimeUtc ?? null)
        const rosterEnd = safeIsoToHHmm(s?.roster?.endTimeUtc ?? null)
        const actualStart = safeIsoToHHmm(s?.actual?.clockInUtc ?? s?.actual?.startTimeUtc ?? null)
        const actualEnd = safeIsoToHHmm(s?.actual?.clockOutUtc ?? s?.actual?.endTimeUtc ?? null)
        out.push({
          date: String((day as any)?.date ?? ""),
          clockIn: actualStart ?? rosterStart ?? undefined,
          clockOut: actualEnd ?? rosterEnd ?? undefined,
        })
      }
    }
    return out
  }, [days])

  return (
    <div className="pt-2">
      <TimesheetViewer
        title="Timesheet"
        subtitle="Daily punch records and hours worked"
        employeeName=""
        view="week"
        onViewChange={() => {}}
        selectedDate={weekDate}
        onSelectedDateChange={(d) => setSelectedDate(d)}
        useCustomRange={false}
        customStartDate=""
        customEndDate=""
        startDate={startDate}
        endDate={endDate}
        onCustomRangeChange={() => {}}
        onToday={() => setSelectedDate(new Date())}
        entries={chartEntries}
        loading={loading}
        error={loadError ? new Error(String(loadError)) : undefined}
        renderEntries={() => {
          if (loading) return null
          if (loadError) return null
          return (
            <div className="space-y-3">
              {(days ?? []).map((day) => (
                <TimesheetDayRow
                  key={day.date}
                  day={day as any}
                  getDraft={getDraft as any}
                  setDraftField={setDraftField as any}
                  resetDraft={resetDraft as any}
                  isDirty={isDirty as any}
                  saveDay={saveDay as any}
                  approveDay={approveDay as any}
                  savingByShiftId={savingByShiftId as any}
                  approvingByShiftId={approvingByShiftId as any}
                  canApprove={canApprove}
                  awardTagOptions={awardTagOptions}
                  checksSummary={checksSummary as any}
                  employeeImage={employeeImage}
                  employeeName={employeeName}
                />
              ))}
            </div>
          )
        }}
      />
    </div>
  )
}

