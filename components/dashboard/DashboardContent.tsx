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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DashboardStats {
  dailyTimeline: { hour: string; clockIn: number; breakIn: number; breakOut: number; clockOut: number }[]
  locationDistribution: { name: string; value: number; fill: string }[]
  attendanceByDay: { day: string; count: number }[]
  weeklyMonthly: { period: string; totalHours: number; activeEmployees: number; attendanceRate: number }[]
  roleStaffingByRole: { name: string; count: number }[]
  employerMix: { month: string; employees: number; subcontractors: number; dmx: number; vicLogistics: number; mandm: number }[]
}

interface HoursSummaryRow {
  name: string
  pin: string
  hours: number
}

interface InactiveEmployee {
  id: string
  name: string
  pin: string
  lastPunchDate: string | null
  daysInactive: number
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

const roleStaffingByRoleConfig = {
  count: { label: "Staff", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const hoursChartConfig = {
  hours: { label: "Hours", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const employerMixConfig = {
  employees: { label: "Employees", color: "hsl(var(--chart-1))" },
  subcontractors: { label: "Subcontractors", color: "hsl(var(--chart-2))" },
  dmx: { label: "DMX", color: "hsl(var(--chart-3))" },
  vicLogistics: { label: "VIC Logistics", color: "hsl(var(--chart-4))" },
  mandm: { label: "M&M", color: "hsl(var(--chart-5))" },
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
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [hoursSummary, setHoursSummary] = React.useState<{ mostHours: HoursSummaryRow[]; leastHours: HoursSummaryRow[] } | null>(null)
  const [inactiveEmployees, setInactiveEmployees] = React.useState<InactiveEmployee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const fetchStats = React.useCallback(async () => {
    try {
      const url = `/api/dashboard/stats?timelineDate=${encodeURIComponent(timelineDate)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to load stats")
      const data = await res.json()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats")
    }
  }, [timelineDate])

  const fetchHoursSummary = React.useCallback(async () => {
    try {
      const url = `/api/dashboard/hours-summary?startDate=${encodeURIComponent(hoursRange.startDate)}&endDate=${encodeURIComponent(hoursRange.endDate)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to load hours summary")
      const data = await res.json()
      setHoursSummary({ mostHours: data.mostHours ?? [], leastHours: data.leastHours ?? [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hours summary")
    }
  }, [hoursRange.startDate, hoursRange.endDate])

  const fetchInactive = React.useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/inactive-employees")
      if (!res.ok) throw new Error("Failed to load inactive employees")
      const data = await res.json()
      setInactiveEmployees(data.inactiveEmployees ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inactive employees")
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchStats(), fetchInactive()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchStats, fetchInactive])

  React.useEffect(() => {
    fetchHoursSummary()
  }, [fetchHoursSummary])

  const handleDeleteEmployee = React.useCallback(async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Delete failed")
      }
      setDeleteId(null)
      setInactiveEmployees((prev) => prev.filter((e) => e.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }, [])

  const weeklyData = React.useMemo(() => {
    if (!stats?.weeklyMonthly?.length) return []
    const n = trendPeriod === "12w" ? 12 : 4
    return stats.weeklyMonthly.slice(-n)
  }, [stats?.weeklyMonthly, trendPeriod])

  const dailyTimeline = React.useMemo(() => {
    const raw = stats?.dailyTimeline ?? []
    if (raw.length > 0) return raw
    return Array.from({ length: 15 }, (_, i) => ({
      hour: `${(i + 6).toString().padStart(2, "0")}:00`,
      clockIn: 0,
      breakIn: 0,
      breakOut: 0,
      clockOut: 0,
    }))
  }, [stats?.dailyTimeline])
  const dailyTimelineEmpty = dailyTimeline.every(
    (d) => d.clockIn + d.breakIn + d.breakOut + d.clockOut === 0
  )
  const locationDistribution = stats?.locationDistribution ?? []
  const attendanceByDay = stats?.attendanceByDay ?? []
  const roleStaffingByRole = stats?.roleStaffingByRole ?? []
  const employerMix = stats?.employerMix ?? []
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
            <CardTitle>Daily Timeline</CardTitle>
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
          {dailyTimelineEmpty && (
            <p className="text-muted-foreground mb-2 text-center text-sm">No punches recorded for this date.</p>
          )}
          <ChartContainer config={dailyTimelineConfig} className="h-[240px] w-full">
            <BarChart data={dailyTimeline} margin={{ left: 12, right: 12 }} barCategoryGap="12%">
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
                  {(locationDistribution.length ? locationDistribution : [{ name: "No data", value: 1, fill: "hsl(var(--muted-foreground))" }]).map((entry) => (
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
            <ChartContainer config={roleStaffingByRoleConfig} className="aspect-auto h-[260px] w-full">
              <BarChart
                data={roleStaffingByRole.length ? roleStaffingByRole : [{ name: "—", count: 0 }]}
                layout="vertical"
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="var(--color-count)" />
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
                    formatter={(value, name, _item, _index, payload) => {
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
          <CardDescription>Workforce planning — Employees vs subcontractors vs contractors (DMX, VIC Logistics, M&M) over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={employerMixConfig} className="aspect-auto h-[260px] w-full">
            <AreaChart
              data={employerMix.length ? employerMix : [{ month: "—", employees: 0, subcontractors: 0, dmx: 0, vicLogistics: 0, mandm: 0 }]}
              margin={{ left: 12, right: 12 }}
            >
              <defs>
                {["employees", "subcontractors", "dmx", "vicLogistics", "mandm"].map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={1} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.15} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area type="monotone" dataKey="employees" stackId="1" fill="url(#fill-employees)" stroke="var(--color-employees)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="subcontractors" stackId="1" fill="url(#fill-subcontractors)" stroke="var(--color-subcontractors)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="dmx" stackId="1" fill="url(#fill-dmx)" stroke="var(--color-dmx)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="vicLogistics" stackId="1" fill="url(#fill-vicLogistics)" stroke="var(--color-vicLogistics)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="mandm" stackId="1" fill="url(#fill-mandm)" stroke="var(--color-mandm)" strokeWidth={1.5} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
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
          {inactiveEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">No inactive employees (everyone has punched in the last 100 days).</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Last punch</TableHead>
                  <TableHead className="text-right">Days inactive</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.pin}</TableCell>
                    <TableCell>{emp.lastPunchDate ?? "Never"}</TableCell>
                    <TableCell className="text-right">{emp.daysInactive}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(emp.id)}
                        disabled={deleting}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleteId) handleDeleteEmployee(deleteId)
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
