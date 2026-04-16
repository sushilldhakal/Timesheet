"use client"

import { useMemo } from "react"
import { Clock, Coffee, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils/cn"

type ShiftTimes = {
  startTime?: string | null
  endTime?: string | null
  breakMinutes?: number | null
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

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function formatDelta(mins: number): string {
  const sign = mins === 0 ? "" : mins > 0 ? "+" : "−"
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m}m`
  if (m === 0) return `${sign}${h}h`
  return `${sign}${h}h ${m}m`
}

export function TimesheetRosterComparison({
  rostered,
  actual,
  warnThresholdMinutes = 15,
  className,
}: {
  rostered: ShiftTimes | null | undefined
  actual: ShiftTimes | null | undefined
  warnThresholdMinutes?: number
  className?: string
}) {
  const computed = useMemo(() => {
    const rStart = toHHmm(rostered?.startTime) ?? null
    const rEnd = toHHmm(rostered?.endTime) ?? null
    const aStart = toHHmm(actual?.startTime) ?? null
    const aEnd = toHHmm(actual?.endTime) ?? null

    const rBreak = rostered?.breakMinutes ?? null
    const aBreak = actual?.breakMinutes ?? null

    const startDelta =
      rStart && aStart ? hhmmToMinutes(aStart) - hhmmToMinutes(rStart) : null
    const endDelta = rEnd && aEnd ? hhmmToMinutes(aEnd) - hhmmToMinutes(rEnd) : null
    const breakDelta =
      typeof rBreak === "number" && typeof aBreak === "number" ? aBreak - rBreak : null

    const isWarn =
      (startDelta !== null && Math.abs(startDelta) >= warnThresholdMinutes) ||
      (endDelta !== null && Math.abs(endDelta) >= warnThresholdMinutes) ||
      (breakDelta !== null && Math.abs(breakDelta) >= warnThresholdMinutes)

    return { rStart, rEnd, aStart, aEnd, rBreak, aBreak, startDelta, endDelta, breakDelta, isWarn }
  }, [rostered, actual, warnThresholdMinutes])

  return (
    <div
      className={cn(
        "rounded-md border p-3 bg-muted/20",
        computed.isWarn ? "border-red-200 dark:border-red-900/60" : "border-border",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Roster vs actual</div>
        {computed.isWarn ? (
          <div className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
            <TriangleAlert className="h-3.5 w-3.5" />
            Variance
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Within tolerance</div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-border/60 bg-background/60 p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Start
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-medium">{computed.rStart ?? "—"}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("font-medium", computed.startDelta !== null && Math.abs(computed.startDelta) >= warnThresholdMinutes ? "text-red-700 dark:text-red-400" : "")}>
              {computed.aStart ?? "—"}
            </span>
          </div>
          <div className={cn("mt-1 text-[11px]", computed.startDelta !== null && Math.abs(computed.startDelta) >= warnThresholdMinutes ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
            {computed.startDelta === null ? "—" : formatDelta(computed.startDelta)}
          </div>
        </div>

        <div className="rounded border border-border/60 bg-background/60 p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Finish
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-medium">{computed.rEnd ?? "—"}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("font-medium", computed.endDelta !== null && Math.abs(computed.endDelta) >= warnThresholdMinutes ? "text-red-700 dark:text-red-400" : "")}>
              {computed.aEnd ?? "—"}
            </span>
          </div>
          <div className={cn("mt-1 text-[11px]", computed.endDelta !== null && Math.abs(computed.endDelta) >= warnThresholdMinutes ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
            {computed.endDelta === null ? "—" : formatDelta(computed.endDelta)}
          </div>
        </div>

        <div className="rounded border border-border/60 bg-background/60 p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Coffee className="h-3.5 w-3.5" />
            Break
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-medium">{typeof computed.rBreak === "number" ? `${computed.rBreak}m` : "—"}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("font-medium", computed.breakDelta !== null && Math.abs(computed.breakDelta) >= warnThresholdMinutes ? "text-red-700 dark:text-red-400" : "")}>
              {typeof computed.aBreak === "number" ? `${computed.aBreak}m` : "—"}
            </span>
          </div>
          <div className={cn("mt-1 text-[11px]", computed.breakDelta !== null && Math.abs(computed.breakDelta) >= warnThresholdMinutes ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
            {computed.breakDelta === null ? "—" : formatDelta(computed.breakDelta)}
          </div>
        </div>
      </div>
    </div>
  )
}

