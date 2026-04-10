"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils/cn"
import { parseTimeToMinutes, formatMinutesToTime } from "@/lib/utils/format/time"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type Entry = {
  date: string
  clockIn?: string
  clockOut?: string
}

function parseDateLabel(dateStr: string): string {
  // Supports dd-MM-yyyy or yyyy-MM-dd
  const m1 = dateStr?.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m1) {
    const d = new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]))
    return format(d, "EEE, d MMM")
  }
  const m2 = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m2) {
    const d = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]))
    return format(d, "EEE, d MMM")
  }
  return dateStr || "—"
}

function parseDateValue(dateStr: string): number {
  const m1 = dateStr?.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m1) return new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1])).getTime()
  const m2 = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])).getTime()
  const d = new Date(dateStr)
  return Number.isFinite(d.getTime()) ? d.getTime() : 0
}

function toMinutes(t?: string): number | null {
  const result = parseTimeToMinutes(t)
  return result === 0 && (!t || t.trim() === "" || t.trim() === "—") ? null : result
}

function formatMinutes(min: number): string {
  return formatMinutesToTime(min)
}

const chartConfig = {
  duration: {
    label: "Shift",
    theme: {
      // Teal/emerald tone for better contrast than primary
      light: "hsl(160 84% 34%)",
      dark: "hsl(160 78% 44%)",
    },
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig

export function TimesheetShiftChart({
  entries,
  className,
}: {
  entries: Entry[]
  className?: string
}) {
  const data = useMemo(() => {
    const rows = [...entries]
      .sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date))
      .map((e) => {
        const start = toMinutes(e.clockIn)
        const end = toMinutes(e.clockOut)
        if (start == null || end == null || end <= start) return null
        return {
          day: parseDateLabel(e.date),
          start,
          duration: end - start,
          end,
        }
      })
      .filter(Boolean) as Array<{ day: string; start: number; duration: number; end: number }>
    return rows
  }, [entries])

  if (!data.length) return null

  // Keep the chart height flexible and ensure each day row stays readable.
  const MIN_ROW_HEIGHT_PX = 30
  const CHART_CHROME_PX = 72 // axes, padding, and card content spacing
  const MIN_CHART_HEIGHT_PX = 224 // roughly the old h-56 default
  const chartHeight = Math.max(
    MIN_CHART_HEIGHT_PX,
    data.length * MIN_ROW_HEIGHT_PX + CHART_CHROME_PX
  )

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Timesheet Award Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full aspect-auto"
          style={{ height: chartHeight }}
        >
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ top: 6, right: 12, left: 12, bottom: 6 }}
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 24 * 60]}
              tickFormatter={(v) => formatMinutes(v)}
              ticks={[8 * 60, 11 * 60, 14 * 60, 17 * 60, 20 * 60]}
              tick={{ fontSize: 11 }}
            />
            <YAxis dataKey="day" type="category" width={110} tick={{ fontSize: 11 }} />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(_value, name, item) => {
                    if (name !== "duration") return null
                    const start = item?.payload?.start as number | undefined
                    const end = item?.payload?.end as number | undefined
                    const duration = item?.payload?.duration as number | undefined
                    if (typeof start !== "number" || typeof end !== "number") return null
                    return (
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-muted-foreground">Shift</span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatMinutes(start)} → {formatMinutes(end)}
                          {typeof duration === "number" ? ` (${(duration / 60).toFixed(1)}h)` : null}
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />

            {/* Invisible offset to simulate range bars */}
            <Bar
              dataKey="start"
              stackId="shift"
              fill="transparent"
              isAnimationActive={false}
              barSize={22}
            />
            <Bar
              dataKey="duration"
              stackId="shift"
              fill="var(--color-duration)"
              fillOpacity={0.85}
              radius={[4, 4, 4, 4]}
              barSize={22}
            >
              <LabelList
                dataKey="duration"
                position="insideRight"
                className="fill-background"
                formatter={(v: unknown) =>
                  typeof v === "number" && Number.isFinite(v) ? `${(v / 60).toFixed(1)}h` : ""
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

