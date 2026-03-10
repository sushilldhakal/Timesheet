"use client"

import * as React from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { CalendarIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils/cn"
import { InactiveEmployeesTable, type InactiveEmployee } from "@/components/dashboard/InactiveEmployeesTable"
import { useDashboardStats, useHoursSummary, useInactiveEmployees, useDeleteEmployee } from "@/lib/queries/dashboard"

interface DailyTimelineData {
  hour: string
  clockIn: number
  breakIn: number
  breakOut: number
  clockOut: number
}

interface HoursSummaryRow {
  name: string
  pin: string
  hours: number
}

const dailyTimelineConfig = {
  clockIn: { label: "Clock in", color: "hsl(var(--chart-1))" },
  breakIn: { label: "Break in", color: "hsl(var(--chart-2))" },
  breakOut: { label: "Break out", color: "hsl(var(--chart-3))" },
  clockOut: { label: "Clock out", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

const locationDistributionConfig = {
  value: { label: "Staff" },
} satisfies ChartConfig

const attendanceHeatmapConfig = {
  count: { label: "Attendance", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

const weeklyMonthlyConfig = {
  totalHours: { label: "Total hours", color: "hsl(var(--chart-1))" },
  attendanceRate: { label: "Attendance %", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

const hoursChartConfig = {
  hours: { label: "Hours", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

function getDefaultWeek() {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") }
}

export default function DashboardContent() {
  const [trendPeriod, setTrendPeriod] = React.useState("4w")
  const [timelineDate, setTimelineDate] = React.useState(() => format(new Date(), "yyyy-MM-dd"))
  const [hoursRange, setHoursRange] = React.useState(getDefaultWeek)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  // TanStack Query hooks
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats({ timelineDate })
  const { data: hoursSummaryData, isLoading: hoursLoading } = useHoursSummary(hoursRange)
  const { data: inactiveData, isLoading: inactiveLoading } = useInactiveEmployees()
  const deleteEmployeeMutation = useDeleteEmployee()

  const loading = statsLoading || hoursLoading || inactiveLoading
  const error = statsError ? (statsError as Error).message : null

  const handleDeleteEmployee = React.useCallback((id: string) => {
    deleteEmployeeMutation.mutate(id, {
      onSuccess: () => {
        setDeleteId(null)
      },
      onError: (error: any) => {
        console.error('Delete failed:', error.message)
      }
    })
  }, [deleteEmployeeMutation])

  const weeklyData = React.useMemo(() => {
    if (!stats?.weeklyMonthly?.length) return []
    const n = trendPeriod === "12w" ? 12 : 4
    return stats.weeklyMonthly.slice(-n)
  }, [stats?.weeklyMonthly, trendPeriod])

  const processedDailyTimeline = React.useMemo(() => {
    const dailyTimeline = stats?.dailyTimeline || []
    if (dailyTimeline.length > 0) return dailyTimeline
    return Array.from({ length: 15 }, (_, i) => ({
      hour: `${(i + 6).toString().padStart(2, "0")}:00`,
      clockIn: 0,
      breakIn: 0,
      breakOut: 0,
      clockOut: 0,
    }))
  }, [stats?.dailyTimeline])
  
  const dailyTimelineEmpty = processedDailyTimeline.every(
    (d: any) => d.clockIn + d.breakIn + d.breakOut + d.clockOut === 0
  )
  const locationDistribution = stats?.locationDistribution ?? []
  const attendanceByDay = stats?.attendanceByDay ?? []
  const roleStaffingByRole = stats?.roleStaffingByRole ?? []
  const employerMix = stats?.employerMix ?? []
  const employerCategories = stats?.employerCategories ?? []
  const inactiveEmployees = inactiveData?.inactiveEmployees ?? []
  const hoursSummary = hoursSummaryData ? {
    mostHours: hoursSummaryData.mostHours ?? [],
    leastHours: hoursSummaryData.leastHours ?? []
  } : null
  
  // Dynamic employer mix config based on actual categories from API
  const employerMixConfig = React.useMemo(() => {
    const defaultColors = [
      "hsl(var(--chart-1))", 
      "hsl(var(--chart-2))", 
      "hsl(var(--chart-3))", 
      "hsl(var(--chart-4))", 
      "hsl(var(--chart-5))"
    ]
    const config: ChartConfig = {}
    employerCategories.forEach((cat: any, i: number) => {
      config[cat.name] = {
        label: cat.name,
        color: cat.color || defaultColors[i % defaultColors.length],
      }
    })
    return config
  }, [employerCategories])
  
  // Dynamic role staffing config based on actual roles with colors
  const roleStaffingConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    roleStaffingByRole.forEach((role: any) => {
      config[role.name] = {
        label: role.name,
        color: role.color || "hsl(var(--chart-1))",
      }
    })
    return config
  }, [roleStaffingByRole])
  
  const mostHours = hoursSummary?.mostHours ?? []
  const leastHours = hoursSummary?.leastHours ?? []

  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        Loading dashboard…
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 1. Daily Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Daily Timeline {statsLoading && <span className="text-muted-foreground text-xs font-normal ml-2">(loading...)</span>}</CardTitle>
            <CardDescription>Punch activity by hour — select a date</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("w-[200px] justify-start text-left font-normal", "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 size-4" />
                {timelineDate ? format(new Date(timelineDate), "d MMM yyyy") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={timelineDate ? new Date(timelineDate) : undefined}
                onSelect={(d) => d && setTimelineDate(format(d, "yyyy-MM-dd"))}
                disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-2 text-center text-sm">
            By type: Clock in, Break in, Break out, Clock out.
          </p>
          {!statsLoading && dailyTimelineEmpty && (
            <p className="text-muted-foreground mb-2 text-center text-sm">No punches recorded for this date.</p>
          )}
          <ChartContainer config={dailyTimelineConfig} className="h-[240px] w-full">
            <BarChart data={processedDailyTimeline} margin={{ left: 12, right: 12 }} barCategoryGap="12%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
              <Bar dataKey="clockIn" stackId="a" fill="var(--color-clockIn)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="breakIn" stackId="a" fill="var(--color-breakIn)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="breakOut" stackId="a" fill="var(--color-breakOut)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="clockOut" stackId="a" fill="var(--color-clockOut)" radius={[4, 4, 0, 0]} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Location Distribution</CardTitle>
            <CardDescription>Resource allocation by site</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={locationDistributionConfig} className="mx-auto aspect-square h-[260px] w-full max-w-[280px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={locationDistribution.length ? locationDistribution : [{ name: "No data", value: 1, fill: "hsl(var(--muted-foreground))" }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(locationDistribution.length ? locationDistribution : [{ name: "No data", value: 1, fill: "hsl(var(--muted-foreground))" }]).map((entry: any, index: number) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role-based staffing levels</CardTitle>
            <CardDescription>Staff count by role (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={roleStaffingConfig} className="aspect-auto h-[260px] w-full">
              <BarChart
                data={roleStaffingByRole.length ? roleStaffingByRole : [{ name: "—", count: 0 }]}
                layout="vertical"
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {roleStaffingByRole.map((role: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={role.color || "hsl(var(--chart-1))"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance pattern</CardTitle>
          <CardDescription>Pattern recognition — attendance by day of week</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={attendanceHeatmapConfig} className="aspect-auto h-[240px] w-full">
            <BarChart
              data={attendanceByDay.length ? attendanceByDay : [{ day: "—", count: 0 }]}
              layout="vertical"
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis type="category" dataKey="day" tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="var(--color-count)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Weekly / Monthly trends</CardTitle>
            <CardDescription>
              <strong>Total hours</strong> (left axis): sum of worked hours that week. <strong>Attendance %</strong> (right axis, 0–100%): (active employees ÷ total roster) × 100 — tooltip shows the active count (e.g. 118 staff).
            </CardDescription>
          </div>
          <Select value={trendPeriod} onValueChange={setTrendPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4w">Last 4 weeks</SelectItem>
              <SelectItem value="12w">Last 12 weeks</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ChartContainer config={weeklyMonthlyConfig} className="aspect-auto h-[260px] w-full">
            <LineChart
              data={weeklyData.length ? weeklyData : [{ period: "—", totalHours: 0, activeEmployees: 0, attendanceRate: 0 }]}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value, name, _item, _index, payload: any) => {
                      const row = payload as { activeEmployees?: number } | undefined
                      if (name === "Attendance %" && row?.activeEmployees != null) {
                        return [`${value}% (${row.activeEmployees} staff)`, name]
                      }
                      return [value, name]
                    }}
                  />
                }
              />
              <Line yAxisId="left" type="monotone" dataKey="totalHours" stroke="var(--color-totalHours)" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="attendanceRate" stroke="var(--color-attendanceRate)" strokeWidth={2} dot={false} />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employer / contractor mix</CardTitle>
          <CardDescription>Workforce planning — breakdown by employer categories over time</CardDescription>
        </CardHeader>
        <CardContent>
          {employerCategories.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No employer data available
            </div>
          ) : (
            <ChartContainer config={employerMixConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart
                data={employerMix.length ? employerMix : [{ month: "—", ...Object.fromEntries(employerCategories.map((c: any) => [c.name, 0])) }]}
                margin={{ left: 12, right: 12 }}
              >
                <defs>
                  {employerCategories.map((cat: any) => (
                    <linearGradient key={cat.name} id={`fill-${cat.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cat.color || `var(--color-${cat.name})`} stopOpacity={1} />
                      <stop offset="95%" stopColor={cat.color || `var(--color-${cat.name})`} stopOpacity={0.15} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                {employerCategories.map((cat: any) => (
                  <Area 
                    key={cat.name}
                    type="monotone" 
                    dataKey={cat.name} 
                    stackId="1" 
                    fill={`url(#fill-${cat.name})`} 
                    stroke={cat.color || `var(--color-${cat.name})`} 
                    strokeWidth={1.5} 
                  />
                ))}
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Hours worked (weekly)</h2>
            <p className="text-muted-foreground text-sm">Most hours (overtime) and least hours (&lt; 38h) — pick a date range</p>
          </div>
          <DateRangePicker
            value={hoursRange}
            onChange={(startDate, endDate) => setHoursRange({ startDate, endDate })}
            placeholder="Pick week"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Most hours worked</CardTitle>
              <CardDescription>Top staff by total hours (overtime view)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={hoursChartConfig} className="aspect-auto h-[280px] w-full">
                <BarChart
                  data={mostHours.length ? mostHours : [{ name: "—", hours: 0 }]}
                  layout="vertical"
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} unit="h" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]} fill="var(--color-hours)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Least hours worked (&lt; 38h)</CardTitle>
              <CardDescription>Staff who worked under 38 hours (minimum first)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={hoursChartConfig} className="aspect-auto h-[280px] w-full">
                <BarChart
                  data={leastHours.length ? leastHours : [{ name: "—", hours: 0 }]}
                  layout="vertical"
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} unit="h" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]} fill="var(--color-hours)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inactive employees</CardTitle>
          <CardDescription>
            Employees with no punch in the last 100 days — remove those no longer working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InactiveEmployeesTable
            employees={inactiveEmployees}
            onDelete={setDeleteId}
            deleting={deleteEmployeeMutation.isPending}
          />
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the employee from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEmployeeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleteId) handleDeleteEmployee(deleteId)
              }}
              disabled={deleteEmployeeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployeeMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
