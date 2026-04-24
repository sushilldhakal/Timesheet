"use client"

import { useEffect, useMemo, useState } from "react"
import { format, getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns"
import type { TimesheetEntryRow } from "@/components/timesheet/TimesheetEntriesList"
import { TimesheetViewer } from "@/components/timesheet/TimesheetViewer"
import { TimesheetDayRow } from "@/components/timesheet/TimesheetDayRow"
import { useMe } from "@/lib/queries/auth"
import { useTimesheetEdit } from "@/lib/hooks/use-timesheet-edit"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { useQueries } from "@tanstack/react-query"
import * as teamsApi from "@/lib/api/teams"
import { getAwardTags } from "@/lib/api/award-tags"

function makeWeekId(d: Date): string {
  const year = getISOWeekYear(d)
  const week = getISOWeek(d)
  return `${year}-W${String(week).padStart(2, "0")}`
}

// Calculate date range based on view type
function getDateRangeForView(view: TimesheetView, selectedDate: Date): { start: Date; end: Date } {
  switch (view) {
    case "day":
      return {
        start: selectedDate,
        end: selectedDate,
      }
    case "month":
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      }
    case "week":
    default:
      return {
        start: startOfISOWeek(selectedDate),
        end: endOfISOWeek(selectedDate),
      }
  }
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
  const [view, setView] = useState<TimesheetView>("week")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const weekId = useMemo(() => makeWeekId(selectedDate), [selectedDate])

  // Calculate date range based on current view
  const dateRange = useMemo(() => getDateRangeForView(view, selectedDate), [view, selectedDate])

  const startDate = useMemo(() => {
    if (useCustomRange && customStartDate) return customStartDate
    return format(dateRange.start, "yyyy-MM-dd")
  }, [dateRange.start, useCustomRange, customStartDate])
  const endDate = useMemo(() => {
    if (useCustomRange && customEndDate) return customEndDate
    return format(dateRange.end, "yyyy-MM-dd")
  }, [dateRange.end, useCustomRange, customEndDate])

  const [awardTagOptions, setAwardTagOptions] = useState<Array<{ label: string; value: string }>>([])
  useEffect(() => {
    let cancelled = false
    getAwardTags()
      .then((data) => {
        if (cancelled) return
        const opts = Array.isArray(data?.awardTags)
          ? data.awardTags
              .map((t) => String(t?.name ?? ""))
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

  const period = useMemo(() => {
    return view === "week" && !useCustomRange
      ? ({ kind: "week", weekId } as const)
      : ({ kind: "range", startDate, endDate } as const)
  }, [view, useCustomRange, weekId, startDate, endDate])

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
  } = useTimesheetEdit(employeeId, period)

  // Filter days based on current view
  const filteredDays = useMemo(() => {
    if (!days) return []

    // Parse date range
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)
    rangeEnd.setHours(23, 59, 59, 999)

    return days.filter((day: any) => {
      const dayDate = new Date(day.date)
      dayDate.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues
      return dayDate >= rangeStart && dayDate <= rangeEnd
    })
  }, [days, startDate, endDate])

  const locationIdsInView = useMemo(() => {
    const ids = new Set<string>()
    for (const day of filteredDays ?? []) {
      const shifts = (day as any)?.reconciledShifts ?? []
      for (const s of shifts) {
        const loc = s?.roster?.locationId ?? s?.actual?.locationId
        if (loc) ids.add(String(loc))
      }
    }
    return [...ids]
  }, [filteredDays])

  const teamsAvailabilityQueries = useQueries({
    queries: locationIdsInView.map((locationId) => ({
      queryKey: ["teams", "availability", { locationId }],
      queryFn: () => teamsApi.getTeamsAvailability({ locationId }),
      staleTime: 60_000,
    })),
  })

  const teamsByLocationId = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string }>>()
    for (let i = 0; i < locationIdsInView.length; i++) {
      const locId = locationIdsInView[i]!
      const q = teamsAvailabilityQueries[i]
      const rows = (q?.data as any)?.teams
      if (!Array.isArray(rows)) continue
      const list = rows
        .map((t: any) => ({ id: String(t.teamId ?? ""), name: String(t.teamName ?? "") }))
        .filter((t: any) => Boolean(t.id && t.name))
      map.set(locId, list)
    }
    return map
  }, [locationIdsInView, teamsAvailabilityQueries])

  // Feed the chart with either clocked times (preferred) or rostered times (fallback),
  // so roster-only future days still show.
  const chartEntries: TimesheetEntryRow[] = useMemo(() => {
    const out: TimesheetEntryRow[] = []
    for (const day of filteredDays ?? []) {
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
  }, [filteredDays])

  return (
    <div className="pt-2">
      <TimesheetViewer
        title="Timesheet"
        subtitle="Daily punch records and hours worked"
        employeeName={employeeName ?? ""}
        employeeImageUrl={employeeImage}
        view={view}
        onViewChange={(newView) => {
          setView(newView)
          // Leaving day view should clear any custom range selection.
          if (newView !== "day") {
            setUseCustomRange(false)
            setCustomStartDate("")
            setCustomEndDate("")
          }
        }}
        selectedDate={selectedDate}
        onSelectedDateChange={(d) => setSelectedDate(d)}
        useCustomRange={useCustomRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        startDate={startDate}
        endDate={endDate}
        onCustomRangeChange={(start, end) => {
          if (!start && !end) {
            setUseCustomRange(false)
            setCustomStartDate("")
            setCustomEndDate("")
            return
          }

          const s = parseISO(start)
          const e = parseISO(end || start)
          if (!isValid(s) || !isValid(e)) return

          if (start === (end || start)) {
            setUseCustomRange(false)
            setCustomStartDate("")
            setCustomEndDate("")
            setSelectedDate(s)
            return
          }

          setUseCustomRange(true)
          setCustomStartDate(start)
          setCustomEndDate(end || start)
        }}
        onToday={() => setSelectedDate(new Date())}
        entries={chartEntries}
        loading={loading}
        error={loadError ? new Error(String(loadError)) : undefined}
        renderEntries={() => {
          if (loading) return null
          if (loadError) return null
          return (
            <div className="space-y-3">
              {(filteredDays ?? []).map((day) => (
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
                  teamsByLocationId={teamsByLocationId}
                />
              ))}
            </div>
          )
        }}
      />
    </div>
  )
}

