"use client"

import { useState, useMemo, useEffect } from "react"
import { useLabourCostAnalytics, useGenerateLabourCostAnalysis } from "@/lib/queries/analytics"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, DollarSign, Clock, RefreshCw, AlignJustify, Columns, LayoutGrid, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { useDashboardLocationScope } from "@/components/providers/DashboardLocationScopeProvider"

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string
  value: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trendLabel && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" && <TrendingUp className="h-4 w-4 text-red-500" />}
                {trend === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
                <span
                  className={`text-xs ${
                    trend === "up"
                      ? "text-red-600"
                      : trend === "down"
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LabourCostAnalyticsPage() {
  const { primaryLocationId } = useDashboardLocationScope()
  const locationId = primaryLocationId ?? ""

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<TimesheetView>("week")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const dateRange = useMemo(() => {
    if (useCustomRange) {
      return { from: customStartDate, to: customEndDate }
    }
    if (view === "day") {
      return {
        from: format(selectedDate, "yyyy-MM-dd"),
        to: format(selectedDate, "yyyy-MM-dd"),
      }
    } else if (view === "week") {
      return {
        from: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    } else {
      return {
        from: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
        to: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
      }
    }
  }, [selectedDate, view, useCustomRange, customStartDate, customEndDate])

  const { data: labourCostData, isLoading } = useLabourCostAnalytics({
    locationId: locationId || undefined,
    from: dateRange.from,
    to: dateRange.to,
  })

  const breakdown = labourCostData?.breakdown ?? []

  const generateAnalysis = useGenerateLabourCostAnalysis()

  const totals = useMemo(() => {
    if (!breakdown || breakdown.length === 0) return null
    const rosterCost = breakdown.reduce((sum: number, d: any) => sum + (d.rosterCost ?? 0), 0)
    const actualCost = breakdown.reduce((sum: number, d: any) => sum + (d.actualCost ?? 0), 0)
    const variance = actualCost - rosterCost
    const variancePct = rosterCost > 0 ? (variance / rosterCost) * 100 : 0
    const rosterHours = breakdown.reduce((sum: number, d: any) => sum + (d.rosterHours ?? 0), 0)
    const actualHours = breakdown.reduce((sum: number, d: any) => sum + (d.actualHours ?? 0), 0)
    return { rosterCost, actualCost, variance, variancePct, rosterHours, actualHours }
  }, [breakdown])

  const chartData = (breakdown ?? []).map((d: any) => ({
    date: format(new Date(d.date), "EEE dd"),
    Rostered: Math.round(d.rosterCost ?? 0),
    Actual: Math.round(d.actualCost ?? 0),
  }))

  const handleTodayClick = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
  }

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    setUseCustomRange(true)
  }

  const viewSwitcher = (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
      {([
        { k: "day" as const, l: "Day", Icon: AlignJustify },
        { k: "week" as const, l: "Week", Icon: Columns },
        { k: "month" as const, l: "Month", Icon: LayoutGrid },
      ] satisfies { k: TimesheetView; l: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[]).map(({ k, l, Icon }) => {
        const active = view === k
        return (
          <button
            key={k}
            onClick={() => {
              setView(k)
              setUseCustomRange(false)
            }}
            title={l}
            className={[
              "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
              active ? "w-[76px] bg-background font-semibold text-foreground shadow-sm" : "w-8 bg-transparent font-normal text-muted-foreground",
            ].join(" ")}
            type="button"
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

  const handleGenerateReport = () => {
    if (!locationId) return
    setReportDialogOpen(true)
    generateAnalysis.mutate(
      { locationId, from: dateRange.from, to: dateRange.to },
      {
        onSuccess: () => {
          // Close dialog on success
          setTimeout(() => setReportDialogOpen(false), 500)
        },
        onError: () => {
          // Close dialog on error
          setReportDialogOpen(false)
        }
      }
    )
  }

  // Prevent hydration mismatch — user/location data is only available client-side
  if (!mounted) return null

  return (
    <CalendarPageShell
      containerClassName="px-4 sm:px-6"
      toolbar={
        <UnifiedCalendarTopbar
          onToday={handleTodayClick}
          title={format(selectedDate, "MMMM yyyy")}
          nav={
            <div className="flex items-center gap-2">
              {view === "day" ? (
                <DateRangePicker
                  value={{
                    startDate: useCustomRange ? customStartDate : format(selectedDate, "yyyy-MM-dd"),
                    endDate: useCustomRange ? customEndDate : format(selectedDate, "yyyy-MM-dd"),
                  }}
                  onChange={handleCustomRangeChange}
                  placeholder="Select date or range"
                />
              ) : (
                <TimesheetDateNavigator
                  view={view}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    setSelectedDate(date)
                    setUseCustomRange(false)
                  }}
                />
              )}
            </div>
          }
          viewSwitcher={viewSwitcher}
          peopleSelect={null}
          actions={
            <Button
              onClick={handleGenerateReport}
              disabled={!locationId || generateAnalysis.isPending}
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {generateAnalysis.isPending ? "Generating..." : "Generate Report"}
            </Button>
          }
        />
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : totals ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Rostered Cost" value={`$${totals.rosterCost.toFixed(2)}`} icon={DollarSign} />
              <StatsCard title="Actual Cost" value={`$${totals.actualCost.toFixed(2)}`} icon={DollarSign} />
              <StatsCard
                title="Variance"
                value={`${totals.variance >= 0 ? "+" : "-"}$${Math.abs(totals.variance).toFixed(2)}`}
                icon={TrendingUp}
                trend={totals.variance > 0 ? "up" : totals.variance < 0 ? "down" : "neutral"}
                trendLabel={`${totals.variancePct >= 0 ? "+" : ""}${totals.variancePct.toFixed(1)}%`}
              />
              <StatsCard
                title="Hours Variance"
                value={`${Math.abs(totals.actualHours - totals.rosterHours).toFixed(1)}h`}
                icon={Clock}
                trend={totals.actualHours > totals.rosterHours ? "up" : "down"}
                trendLabel={`${totals.actualHours.toFixed(1)}h actual vs ${totals.rosterHours.toFixed(1)}h rostered`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="Rostered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {locationId
                  ? "No data for the selected period. Try generating a report."
                  : "Select a location to view analytics"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Report Dialog */}
      <AlertDialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          if (generateAnalysis.isPending) return
          setReportDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-[560px] overflow-hidden border-border/70 p-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">Generating report</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {generateAnalysis.isPending ? (
                  <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/12 via-primary/6 to-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border border-primary/30 bg-background/70 p-1.5">
                          <RefreshCw className="size-4 text-primary animate-spin" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">Generating report...</p>
                          <p className="text-sm text-muted-foreground">Analyzing labour costs and comparing rostered vs actual hours.</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Processing data
                        </div>
                      </div>
                      <Progress value={50} className="h-2.5" />
                      <p className="mt-2 text-xs text-muted-foreground">Please wait, do not close this window.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </CalendarPageShell>
  )
}
