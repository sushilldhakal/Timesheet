import React, { useMemo } from "react"
import { useSchedulerContext } from "../context"
import type { Block, HistogramConfig } from "../types"
import { cn } from "../lib/utils"

interface ResourceHistogramProps {
  shifts: Block[]
  /** Visible date range — only shifts within this window are counted */
  rangeStart: Date
  rangeEnd: Date
  height?: number
  config?: HistogramConfig
}

function ResourceHistogramInner({
  shifts,
  rangeStart,
  rangeEnd,
  height = 120,
  config,
}: ResourceHistogramProps): React.ReactElement | null {
  const { categories, employees, getColor, settings } = useSchedulerContext()

  const rowMode = settings.rowMode ?? "category"
  const capacityMap: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {}
    config?.capacities?.forEach((c) => { m[c.resourceId] = c.hours })
    return m
  }, [config?.capacities])

  // Build rows: in individual mode one bar per employee, else one per category
  const rows = useMemo(() => {
    const rangeStartISO = rangeStart.toISOString().slice(0, 10)
    const rangeEndISO   = rangeEnd.toISOString().slice(0, 10)

    const inRange = (date: string) => date >= rangeStartISO && date <= rangeEndISO

    if (rowMode === "individual") {
      return employees.map((emp) => {
        const empShifts = shifts.filter(
          (s) => s.employeeId === emp.id && inRange(s.date)
        )
        const hours = empShifts.reduce((sum, s) => sum + (s.endH - s.startH), 0)
        const cat = categories.find((c) => c.id === emp.categoryId)
        const color = cat ? getColor(cat.colorIdx).bg : "var(--primary)"
        return { id: emp.id, label: emp.name, hours, color, capacity: capacityMap[emp.id] }
      })
    }

    return categories.map((cat) => {
      const catShifts = shifts.filter(
        (s) => s.categoryId === cat.id && inRange(s.date)
      )
      const hours = catShifts.reduce((sum, s) => sum + (s.endH - s.startH), 0)
      const color = getColor(cat.colorIdx).bg
      return { id: cat.id, label: cat.name, hours, color, capacity: capacityMap[cat.id] }
    })
  }, [rowMode, employees, categories, shifts, rangeStart, rangeEnd, getColor, capacityMap])

  const maxHours = useMemo(
    () => Math.max(1, ...rows.map((r) => Math.max(r.hours, r.capacity ?? 0))),
    [rows]
  )

  if (rows.length === 0) return null

  const BAR_H = 18
  return (
    <div
      className="shrink-0 overflow-x-hidden overflow-y-auto border-t border-border bg-muted px-3 py-2.5"
      style={{ height }}
      aria-label="Resource utilisation histogram"
    >
      {/* Header */}
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Resource Utilisation
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const pct = Math.min(row.hours / maxHours, 1)
          const capPct = row.capacity != null ? Math.min(row.capacity / maxHours, 1) : null

          // Colour logic: always use category colour as base.
          // When capacity is configured, adjust opacity/glow to signal utilisation level.
          // Never replace the category colour with generic red/green — keeps visual identity.
          let barColor = row.color
          let barOpacity = 0.85
          let overCapacity = false
          if (row.capacity != null && row.capacity > 0) {
            const util = row.hours / row.capacity
            if (util > 1) {
              overCapacity = true
              barOpacity = 1
            } else if (util >= 0.9) {
              barOpacity = 0.95
            } else {
              barOpacity = 0.7
            }
          }

          return (
            <div key={row.id} className="flex items-center gap-2">
              {/* Label */}
              <div
                className="w-[120px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium text-foreground"
                title={row.label}
              >
                {row.label}
              </div>

              {/* Bar track */}
              <div
                className="relative flex-1 overflow-hidden rounded border border-border bg-background"
                style={{ height: BAR_H }}
              >
                {/* Fill bar */}
                <div
                  className="absolute left-0 top-0 h-full rounded transition-[width] duration-300 ease-out"
                  style={{
                    width: `${pct * 100}%`,
                    background: barColor,
                    opacity: barOpacity,
                  }}
                />
                {/* Over-capacity indicator — red right border */}
                {overCapacity && (
                  <div className="absolute top-0 right-0 bottom-0 w-[3px] rounded-r bg-destructive" />
                )}
                {/* Capacity marker line */}
                {capPct != null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                    style={{ left: `${capPct * 100}%` }}
                    title={`Capacity: ${row.capacity}h`}
                  />
                )}
                {/* Hours label inside bar */}
                <div
                  className={cn(
                    "pointer-events-none absolute top-0 right-1.5 bottom-0 flex items-center text-[10px] font-semibold",
                    pct > 0.5 ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {row.hours.toFixed(1)}h
                  {row.capacity != null && (
                    <span className="ml-0.5 opacity-70">/ {row.capacity}h</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const ResourceHistogram = React.memo(ResourceHistogramInner)
