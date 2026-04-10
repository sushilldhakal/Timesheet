"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { cn } from "@/lib/utils/cn"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export type TimesheetEntryRow = {
  date: string
  clockIn?: string
  breakIn?: string
  breakOut?: string
  clockOut?: string
  breakHours?: string
  totalHours?: string
  clockInImageUrl?: string
  clockOutImageUrl?: string
}

function formatDateLabel(dateStr: string): string {
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

function displayTime(value?: string): string {
  if (!value) return "—"
  const s = value.trim()
  return s ? s : "—"
}

export function TimesheetEntriesList({
  entries,
  employeeName,
  employeeImageUrl,
  className,
}: {
  entries: TimesheetEntryRow[]
  employeeName: string
  employeeImageUrl?: string
  className?: string
}) {
  const rows = useMemo(() => {
    return [...entries].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
  }, [entries])

  if (!rows.length) {
    return (
      <div className={cn("py-12 text-center text-sm text-muted-foreground", className)}>
        No timesheet entries found for this period.
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {rows.map((row, idx) => {
        const breakLabel =
          row.breakIn || row.breakOut
            ? `${displayTime(row.breakIn)}–${displayTime(row.breakOut)}`
            : "—"

        return (
          <Card key={`${row.date}-${idx}`} className="p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              {/* Left: avatar + date + (optional) small metadata */}
              <div className="border-b md:border-b-0 md:border-r bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <HoverCard openDelay={150} closeDelay={80}>
                    <HoverCardTrigger asChild>
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-background cursor-default">
                        {row.clockInImageUrl ? (
                          <OptimizedImage
                            src={row.clockInImageUrl}
                            alt={employeeName}
                            fill
                            className="object-cover"
                            sizes="48px"
                            fallbackName={employeeName}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground object-cover">
                            —
                          </div>
                        )}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-[280px] p-3" align="start" side="top">
                      <div className="text-xs font-medium text-muted-foreground mb-2">All photos</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative aspect-square overflow-hidden rounded-md border bg-background">
                          {row.clockInImageUrl ? (
                            <OptimizedImage
                              src={row.clockInImageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="140px"
                              fallbackName=""
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground object-cover">
                              —
                            </div>
                          )}
                        </div>
                        <div className="relative aspect-square overflow-hidden rounded-md border bg-background">
                          {row.clockOutImageUrl ? (
                            <OptimizedImage
                              src={row.clockOutImageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="140px"
                              fallbackName=""
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground object-cover">
                              —
                            </div>
                          )}
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{formatDateLabel(row.date)}</div>
                    <div className="text-xs text-muted-foreground truncate">{employeeName}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    Total: {row.totalHours || "—"}
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    Breaks: {row.breakHours || "—"}
                  </Badge>
                </div>
              </div>

              {/* Right: Start / Finish / Breaks */}
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Start</div>
                    <div className="rounded-md border bg-background p-3">
                      <div className="text-lg font-semibold tabular-nums">{displayTime(row.clockIn)}</div>
                      <div className="text-xs text-muted-foreground">Clock in</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Finish</div>
                    <div className="rounded-md border bg-background p-3">
                      <div className="text-lg font-semibold tabular-nums">{displayTime(row.clockOut)}</div>
                      <div className="text-xs text-muted-foreground">Clock out</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Breaks</div>
                    <div className="rounded-md border bg-background p-3">
                      <div className="text-lg font-semibold tabular-nums">{breakLabel}</div>
                      <div className="text-xs text-muted-foreground">Break in–out</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

