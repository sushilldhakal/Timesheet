"use client"

import { useMemo, useState } from "react"
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from "date-fns"
import { formatTime } from "@/lib/utils/format/time"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Printer, Clock, MapPin, ChevronDown, ChevronRight, Calendar, Coffee, AlignJustify, Columns, LayoutGrid } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetTodayButton } from "@/components/timesheet/timesheet-today-button"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { useEmployeeTimesheet } from "@/lib/queries/employees"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { cn } from "@/lib/utils/cn"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetEntriesList, type TimesheetEntryRow } from "@/components/timesheet/TimesheetEntriesList"
import { TimesheetShiftChart } from "@/components/timesheet/TimesheetShiftChart"
import { TimesheetViewer } from "@/components/timesheet/TimesheetViewer"

interface TimesheetRow {
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
  clockInImage?: string
  clockInWhere?: string
  clockInLocation?: string
  breakInImage?: string
  breakInWhere?: string
  breakInLocation?: string
  breakOutImage?: string
  breakOutWhere?: string
  breakOutLocation?: string
  clockOutImage?: string
  clockOutWhere?: string
  clockOutLocation?: string
  clockInSource?: "insert" | "update"
  breakInSource?: "insert" | "update"
  breakOutSource?: "insert" | "update"
  clockOutSource?: "insert" | "update"
}

interface EmployeeTimesheetViewerProps {
  employeeId: string
  employeeName: string
  employeeImageUrl?: string
  readOnly?: boolean
}

/** Auth-protected link for Cloudinary images (proxied via /api/image). */
function getImageLinkHref(url: string): string {
  if (url.includes("res.cloudinary.com")) {
    return `/api/image?url=${encodeURIComponent(url)}`
  }
  return url
}

/** Single column: image on top, location link directly below */
function PunchPhotoAndLocation({
  imageUrl,
  where,
  locationName,
}: {
  imageUrl?: string
  where?: string
  locationName?: string
}) {
  const mapsUrl = where ? `https://www.google.com/maps?q=${where}` : null
  const imageLinkHref = imageUrl ? getImageLinkHref(imageUrl) : null
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {imageUrl ? (
        <a
          href={imageLinkHref ?? imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block w-16 h-16 rounded overflow-hidden border border-border hover:opacity-90 shrink-0"
        >
          <OptimizedImage 
            src={imageUrl} 
            alt="" 
            fill 
            className="object-cover" 
            sizes="64px" 
            fallbackName=""
          />
        </a>
      ) : (
        <div className="w-16 h-16 rounded border border-dashed border-muted flex items-center justify-center shrink-0">
          <span className="text-muted-foreground text-xs">—</span>
        </div>
      )}
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all text-center"
        >
          <MapPin className="h-3 w-3 shrink-0" />
          {locationName || "Location"}
        </a>
      ) : null}
    </div>
  )
}

function formatDateLong(dateStr: string): string {
  try {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return format(date, "EEE do MMM yyyy")
  } catch {
    return dateStr
  }
}

function getDateRange(view: TimesheetView, selectedDate: Date) {
  switch (view) {
    case "day":
      // Day view must request exactly one day.
      return {
        startDate: format(selectedDate, "yyyy-MM-dd"),
        endDate: format(selectedDate, "yyyy-MM-dd"),
      }
    case "week":
      // Week view must request only the current week.
      return {
        startDate: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    case "month":
      // Month view must request only the current month.
      return {
        startDate: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
        endDate: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
      }
    default:
      return {
        startDate: format(selectedDate, "yyyy-MM-dd"),
        endDate: format(selectedDate, "yyyy-MM-dd"),
      }
  }
}

// Helper to parse hours string like "8h 30m" to minutes
function parseHoursToMinutes(hoursStr: string): number {
  if (!hoursStr || hoursStr === '—') return 0
  const match = hoursStr.match(/(\d+)h?\s*(\d*)m?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  return hours * 60 + minutes
}

// Helper to parse date string as local date to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Single Day View Component
function SingleDayView({ data }: { data: TimesheetRow[] }) {
  const dayData = data[0]
  
  if (!dayData) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No timesheet data for this date
      </div>
    )
  }

  // Debug: Log the actual date from the data

  const totalMinutes = dayData.totalMinutes || 0
  const breakMinutes = dayData.breakMinutes || 0

  return (
    <div className="space-y-6 p-6">
      {/* Summary Card */}
      <Card className="bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-xl font-semibold">{formatDateLong(dayData.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10">
                <Clock className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-semibold">{dayData.totalHours || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Coffee className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Breaks</p>
                <p className="text-xl font-semibold">{dayData.breakHours || '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Punch Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Clock In */}
        {dayData.clockIn && dayData.clockIn !== '—' && (
          <Card className="overflow-hidden pt-0">
            <CardHeader className="pt-3 pb-3 bg-emerald-50 dark:bg-emerald-950/20">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-500/10">
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                Clock In
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-2xl font-bold text-emerald-600">
                {formatTime(dayData.clockIn)}
              </div>
              {dayData.clockInImage && (
                <a
                  href={getImageLinkHref(dayData.clockInImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                    <OptimizedImage 
                      src={dayData.clockInImage} 
                      alt="Clock in" 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      fallbackName=""
                    />
                  </div>
                </a>
              )}
              {dayData.clockInWhere && (
                <a
                  href={`https://www.google.com/maps?q=${dayData.clockInWhere}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{dayData.clockInLocation || 'View Location'}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Break In */}
        {dayData.breakIn && dayData.breakIn !== '—' && (
          <Card className="overflow-hidden pt-0">
            <CardHeader className="pt-3 pb-3 bg-orange-50 dark:bg-orange-950/20">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 rounded bg-orange-500/10">
                  <Coffee className="h-4 w-4 text-orange-600" />
                </div>
                Break In
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(dayData.breakIn)}
              </div>
              {dayData.breakInImage && (
                <a
                  href={getImageLinkHref(dayData.breakInImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                    <OptimizedImage 
                      src={dayData.breakInImage} 
                      alt="Break in" 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      fallbackName=""
                    />
                  </div>
                </a>
              )}
              {dayData.breakInWhere && (
                <a
                  href={`https://www.google.com/maps?q=${dayData.breakInWhere}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{dayData.breakInLocation || 'View Location'}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Break Out */}
        {dayData.breakOut && dayData.breakOut !== '—' && (
          <Card className="overflow-hidden pt-0">
            <CardHeader className="pt-3 pb-3 bg-blue-50 dark:bg-blue-950/20">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/10">
                  <Coffee className="h-4 w-4 text-blue-600" />
                </div>
                Break Out
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(dayData.breakOut)}
              </div>
              {dayData.breakOutImage && (
                <a
                  href={getImageLinkHref(dayData.breakOutImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                    <OptimizedImage 
                      src={dayData.breakOutImage} 
                      alt="Break out" 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      fallbackName=""
                    />
                  </div>
                </a>
              )}
              {dayData.breakOutWhere && (
                <a
                  href={`https://www.google.com/maps?q=${dayData.breakOutWhere}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{dayData.breakOutLocation || 'View Location'}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clock Out */}
        {dayData.clockOut && dayData.clockOut !== '—' && (
          <Card className="overflow-hidden pt-0">
            <CardHeader className="pt-3 pb-3 bg-red-50 dark:bg-red-950/20">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 rounded bg-red-500/10">
                  <Clock className="h-4 w-4 text-red-600" />
                </div>
                Clock Out
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-2xl font-bold text-red-600">
                {formatTime(dayData.clockOut)}
              </div>
              {dayData.clockOutImage && (
                <a
                  href={getImageLinkHref(dayData.clockOutImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                    <OptimizedImage 
                      src={dayData.clockOutImage} 
                      alt="Clock out" 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      fallbackName=""
                    />
                  </div>
                </a>
              )}
              {dayData.clockOutWhere && (
                <a
                  href={`https://www.google.com/maps?q=${dayData.clockOutWhere}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{dayData.clockOutLocation || 'View Location'}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Week View Component - supports single week or multiple weeks
function WeekView({ data, startDate, endDate }: { data: TimesheetRow[], startDate: string, endDate: string }) {
  // Parse the dates as local dates to avoid timezone issues
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
  const rangeStart = new Date(startYear, startMonth - 1, startDay)
  const rangeEnd = new Date(endYear, endMonth - 1, endDay)
  
  // Get all weeks in the range
  const weeks = useMemo(() => {
    const weeksList: { start: Date; end: Date; days: Date[] }[] = []
    let currentWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 })
    const lastWeekStart = startOfWeek(rangeEnd, { weekStartsOn: 1 })
    
    while (currentWeekStart <= lastWeekStart) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })
      weeksList.push({ start: currentWeekStart, end: weekEnd, days })
      currentWeekStart = new Date(currentWeekStart)
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }
    
    // Reverse the list so newest week appears first (descending order)
    return weeksList.reverse()
  }, [rangeStart, rangeEnd])

  // Create a map of date to timesheet data
  const dataMap = useMemo(() => {
    const map = new Map<string, TimesheetRow>()
    data.forEach(row => {
      map.set(row.date, row)
    })
    return map
  }, [data])

  const formatMinutesToHours = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  // Calculate totals for each week
  const weekTotals = useMemo(() => {
    return weeks.map(week => {
      let totalHours = 0
      let totalBreaks = 0
      
      week.days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayData = dataMap.get(dateStr)
        if (dayData) {
          totalHours += dayData.totalMinutes || 0
          totalBreaks += dayData.breakMinutes || 0
        }
      })
      
      return { totalHours, totalBreaks }
    })
  }, [weeks, dataMap])

  const grandTotalHours = weekTotals.reduce((sum, week) => sum + week.totalHours, 0)
  const grandTotalBreaks = weekTotals.reduce((sum, week) => sum + week.totalBreaks, 0)

  return (
    <div className="space-y-6 p-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weeks</p>
                <p className="text-2xl font-bold">{weeks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{formatMinutesToHours(grandTotalHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Coffee className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Breaks</p>
                <p className="text-2xl font-bold">{formatMinutesToHours(grandTotalBreaks)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Rows */}
      <Card className="pt-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="pt-0">
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[100px]">Week</th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Mon</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Tue</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Wed</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Thu</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Fri</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Sat</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[80px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">Sun</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium bg-emerald-50 dark:bg-emerald-950/20 min-w-[100px]">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Hours</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium bg-orange-50 dark:bg-orange-950/20 min-w-[100px]">
                    <div className="flex items-center justify-center gap-1">
                      <Coffee className="h-3 w-3" />
                      <span className="text-xs">Breaks</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, weekIndex) => {
                  const weekTotal = weekTotals[weekIndex]
                  
                  return (
                    <tr key={weekIndex} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium sticky left-0 bg-background z-10">
                        <div className="flex flex-col">
                          <span className="text-sm">{format(week.start, 'MMM d')}</span>
                          <span className="text-xs text-muted-foreground">to {format(week.end, 'MMM d')}</span>
                        </div>
                      </td>
                      {week.days.map((day, dayIndex) => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const dayData = dataMap.get(dateStr)
                        const hasData = dayData && dayData.totalMinutes > 0
                        
                        return (
                          <td key={dayIndex} className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-medium">{format(day, 'd')}</span>
                              {hasData ? (
                                <div className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                  {dayData.totalHours}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="p-3 text-center bg-emerald-50/50 dark:bg-emerald-950/10">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {weekTotal.totalHours > 0 ? formatMinutesToHours(weekTotal.totalHours) : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center bg-orange-50/50 dark:bg-orange-950/10">
                        <span className="font-semibold text-orange-700 dark:text-orange-400">
                          {weekTotal.totalBreaks > 0 ? formatMinutesToHours(weekTotal.totalBreaks) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Month View Component - supports single month or multiple months
function MonthView({ data, startDate, endDate }: { data: TimesheetRow[], startDate: string, endDate: string }) {
  // Parse the dates as local dates to avoid timezone issues
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
  const rangeStart = new Date(startYear, startMonth - 1, startDay)
  const rangeEnd = new Date(endYear, endMonth - 1, endDay)
  
  // Get all months in the range
  const months = useMemo(() => {
    const monthsList: { start: Date; end: Date; name: string; year: number }[] = []
    let currentMonth = startOfMonth(rangeStart)
    const lastMonth = startOfMonth(rangeEnd)
    
    // Add months until we reach the end date
    while (currentMonth <= lastMonth) {
      monthsList.push({
        start: currentMonth,
        end: endOfMonth(currentMonth),
        name: format(currentMonth, 'MMMM'),
        year: currentMonth.getFullYear()
      })
      currentMonth = new Date(currentMonth)
      currentMonth.setMonth(currentMonth.getMonth() + 1)
    }
    
    // Reverse the list so newest month appears first (descending order)
    return monthsList.reverse()
  }, [rangeStart, rangeEnd])

  // Create a map of date to timesheet data
  const dataMap = useMemo(() => {
    const map = new Map<string, TimesheetRow>()
    data.forEach(row => {
      map.set(row.date, row)
    })
    return map
  }, [data])

  const formatMinutesToHours = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  // Calculate stats for each month
  const monthStats = useMemo(() => {
    return months.map(month => {
      const monthDays = eachDayOfInterval({ start: month.start, end: month.end })
      let daysWorked = 0
      let totalHours = 0
      let totalBreaks = 0
      
      monthDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayData = dataMap.get(dateStr)
        if (dayData && dayData.totalMinutes > 0) {
          daysWorked++
          totalHours += dayData.totalMinutes || 0
          totalBreaks += dayData.breakMinutes || 0
        }
      })
      
      const totalDays = monthDays.length
      const daysNotWorked = totalDays - daysWorked
      const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0
      const attendanceRate = totalDays > 0 ? (daysWorked / totalDays) * 100 : 0
      
      return {
        daysWorked,
        daysNotWorked,
        totalDays,
        totalHours,
        totalBreaks,
        avgHoursPerDay,
        attendanceRate
      }
    })
  }, [months, dataMap])

  const grandTotals = useMemo(() => {
    return monthStats.reduce((acc, month) => ({
      daysWorked: acc.daysWorked + month.daysWorked,
      totalHours: acc.totalHours + month.totalHours,
      totalBreaks: acc.totalBreaks + month.totalBreaks,
    }), { daysWorked: 0, totalHours: 0, totalBreaks: 0 })
  }, [monthStats])

  return (
    <div className="space-y-6 p-6">
      {/* Grand Summary */}
      <Card className="bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Overall Summary ({months.length} Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-full bg-emerald-500/10">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm">Total Days Worked</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{grandTotals.daysWorked}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm">Total Working Hours</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{formatMinutesToHours(grandTotals.totalHours)}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Coffee className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm">Total Breaks</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{formatMinutesToHours(grandTotals.totalBreaks)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[120px]">Month</th>
                  <th className="p-3 text-center font-medium min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs">Days Worked</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="text-xs">Days Off</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-xs">Total Hours</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Coffee className="h-4 w-4 text-orange-600" />
                      <span className="text-xs">Total Breaks</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="text-xs">Avg Hours/Day</span>
                    </div>
                  </th>
                  <th className="p-3 text-center font-medium min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">Attendance</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((month, index) => {
                  const stats = monthStats[index]
                  const hasData = stats.daysWorked > 0
                  
                  return (
                    <tr 
                      key={index} 
                      className={cn(
                        "border-b transition-colors",
                        hasData ? "hover:bg-muted/30" : "opacity-60"
                      )}
                    >
                      <td className="p-3 font-medium sticky left-0 bg-background z-10">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{month.name}</span>
                          <span className="text-xs text-muted-foreground">{month.year}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className={cn(
                          "inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold",
                          hasData 
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {stats.daysWorked}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className={cn(
                          "inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold",
                          stats.daysNotWorked > 0
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {stats.daysNotWorked}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "font-semibold",
                          hasData ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"
                        )}>
                          {hasData ? formatMinutesToHours(stats.totalHours) : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "font-semibold",
                          hasData ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"
                        )}>
                          {hasData ? formatMinutesToHours(stats.totalBreaks) : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "font-semibold",
                          hasData ? "text-purple-700 dark:text-purple-400" : "text-muted-foreground"
                        )}>
                          {hasData ? formatMinutesToHours(Math.round(stats.avgHoursPerDay)) : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "text-sm font-semibold",
                            stats.attendanceRate >= 80 ? "text-emerald-600" :
                            stats.attendanceRate >= 50 ? "text-orange-600" :
                            stats.attendanceRate > 0 ? "text-red-600" :
                            "text-muted-foreground"
                          )}>
                            {hasData ? `${Math.round(stats.attendanceRate)}%` : '—'}
                          </span>
                          {hasData && (
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all",
                                  stats.attendanceRate >= 80 ? "bg-emerald-500" :
                                  stats.attendanceRate >= 50 ? "bg-orange-500" :
                                  "bg-red-500"
                                )}
                                style={{ width: `${stats.attendanceRate}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function EmployeeTimesheetViewer({ employeeId, employeeName, employeeImageUrl, readOnly }: EmployeeTimesheetViewerProps) {
  const [view, setView] = useState<TimesheetView>("week")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50) // Increased to accommodate 8 weeks of data
  const [searchValue, setSearchValue] = useState("")
  const [sortBy, setSortBy] = useState<string | null>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Calculate date range based on view
  const { startDate, endDate } = useMemo(() => {
    if (useCustomRange && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }
    const range = getDateRange(view, selectedDate)
    return range
  }, [view, selectedDate, useCustomRange, customStartDate, customEndDate])

  // Debug: Log what we're sending to API

  // Fetch timesheet data
  const timesheetParams = new URLSearchParams({
    limit: "1000",
    offset: "0",
    sortBy: "date",
    order: "desc",
    startDate,
    endDate,
  })

  const timesheetQuery = useEmployeeTimesheet(employeeId, timesheetParams)
  const rawTimesheets = (timesheetQuery.data?.data || []) as any[]
  const loading = timesheetQuery.isLoading

  // Determine if it's a single day selection
  const isSingleDay = useMemo(() => {
    return startDate === endDate
  }, [startDate, endDate])

  // Filter timesheets to match the requested date range (handle timezone issues from backend)
  const timesheets = useMemo(() => {
    // For all views, return all data since the API handles the date range filtering
    return rawTimesheets
  }, [rawTimesheets])

  const entryRows: TimesheetEntryRow[] = useMemo(() => {
    return timesheets.map((r: any) => ({
      date: r.date,
      clockIn: r.clockIn,
      breakIn: r.breakIn,
      breakOut: r.breakOut,
      clockOut: r.clockOut,
      breakHours: r.breakHours,
      totalHours: r.totalHours,
      clockInImageUrl: r.clockInImage,
      clockOutImageUrl: r.clockOutImage,
    }))
  }, [timesheets])

  // Check if any row has images to determine if we should show expand functionality
  const hasImages = useMemo(() => {
    return timesheets.some(row => 
      row.clockInImage || row.breakInImage || row.breakOutImage || row.clockOutImage
    )
  }, [timesheets])

  // Render expanded row content showing images and locations aligned with columns
  const renderExpandedRow = (row: TimesheetRow) => {
    const hasAnyImage = row.clockInImage || row.breakInImage || row.breakOutImage || row.clockOutImage
    if (!hasAnyImage) return null

    // Return array of cells that align with the columns
    // Order: [expander, date, clockIn, breakIn, breakOut, clockOut, breakHours, totalHours]
    return [
      null, // Expander column
      null, // Date column
      // Clock In column
      <PunchPhotoAndLocation
        key="clockIn"
        imageUrl={row.clockInImage}
        where={row.clockInWhere}
        locationName={row.clockInLocation}
      />,
      // Break In column
      <PunchPhotoAndLocation
        key="breakIn"
        imageUrl={row.breakInImage}
        where={row.breakInWhere}
        locationName={row.breakInLocation}
      />,
      // Break Out column
      <PunchPhotoAndLocation
        key="breakOut"
        imageUrl={row.breakOutImage}
        where={row.breakOutWhere}
        locationName={row.breakOutLocation}
      />,
      // Clock Out column
      <PunchPhotoAndLocation
        key="clockOut"
        imageUrl={row.clockOutImage}
        where={row.clockOutWhere}
        locationName={row.clockOutLocation}
      />,
      null, // Break Hours column
      null, // Total Hours column
    ]
  }

  const columns: ColumnDef<TimesheetRow>[] = useMemo(() => [
    // Expander column
    ...(hasImages ? [{
      id: 'expander',
      header: () => null,
      cell: ({ row }: any) => {
        const canExpand = row.original.clockInImage || row.original.breakInImage || 
                         row.original.breakOutImage || row.original.clockOutImage
        if (!canExpand) return null
        
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => row.toggleExpanded()}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )
      },
      enableSorting: false,
      enableHiding: false,
    }] : []),
    {
      id: 'date',
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => formatDateLong(row.original.date),
      enableSorting: true,
    },
    {
      id: 'clockIn',
      accessorKey: 'clockIn',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Clock In" />
      ),
      cell: ({ row }) => formatTime(row.original.clockIn),
      enableSorting: false,
    },
    {
      id: 'breakIn',
      accessorKey: 'breakIn',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Break In" />
      ),
      cell: ({ row }) => formatTime(row.original.breakIn),
      enableSorting: false,
    },
    {
      id: 'breakOut',
      accessorKey: 'breakOut',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Break Out" />
      ),
      cell: ({ row }) => formatTime(row.original.breakOut),
      enableSorting: false,
    },
    {
      id: 'clockOut',
      accessorKey: 'clockOut',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Clock Out" />
      ),
      cell: ({ row }) => formatTime(row.original.clockOut),
      enableSorting: false,
    },
    {
      id: 'breakHours',
      accessorKey: 'breakMinutes',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Break Time" />
      ),
      cell: ({ row }) => row.original.breakHours || '—',
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        return (rowA.original.breakMinutes || 0) - (rowB.original.breakMinutes || 0)
      },
    },
    {
      id: 'totalHours',
      accessorKey: 'totalMinutes',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Hours" />
      ),
      cell: ({ row }) => row.original.totalHours || '—',
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        return (rowA.original.totalMinutes || 0) - (rowB.original.totalMinutes || 0)
      },
    },
  ], [hasImages])

  const handleExportCSV = () => {
    if (timesheets.length === 0) return

    const headers = [
      "Date", "Clock In", "Break In", "Break Out", "Clock Out", 
      "Break Time", "Total Hours"
    ]
    
    const rows = timesheets.map(row => [
      formatDateLong(row.date || ""),
      formatTime(row.clockIn || ""),
      formatTime(row.breakIn || ""),
      formatTime(row.breakOut || ""),
      formatTime(row.clockOut || ""),
      row.breakHours || "—",
      row.totalHours || "—"
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => {
          const cellStr = String(cell).replace(/"/g, '""')
          return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') 
            ? `"${cellStr}"` 
            : cellStr
        }).join(",")
      )
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${employeeName}_timesheet_${startDate}_${endDate}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    setUseCustomRange(true)
  }

  const handleTodayClick = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
  }

  // Render the appropriate view based on current settings
  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading timesheet data...</p>
          </div>
        </div>
      )
    }

    // Use the card design (same as staff timesheet) for all views.
    // Keep the topbar + date range controls, but render entries as cards instead of a table.
    return (
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading timesheet data...</p>
            </div>
          </div>
        ) : (
          <>
            <TimesheetEntriesList
              entries={entryRows}
              employeeName={employeeName}
              employeeImageUrl={employeeImageUrl}
            />
            <div className="mt-6">
              <TimesheetShiftChart entries={entryRows} />
            </div>
          </>
        )}
      </div>
    )

    return null
  }

  return (
    <TimesheetViewer
      title="Timesheet"
      subtitle={`Daily punch records and hours worked`}
      employeeName={employeeName}
      employeeImageUrl={employeeImageUrl}
      view={view}
      onViewChange={setView}
      selectedDate={selectedDate}
      onSelectedDateChange={(d) => {
        setSelectedDate(d)
        setUseCustomRange(false)
      }}
      useCustomRange={useCustomRange}
      customStartDate={customStartDate}
      customEndDate={customEndDate}
      startDate={startDate}
      endDate={endDate}
      onCustomRangeChange={(s, e) => {
        setCustomStartDate(s)
        setCustomEndDate(e)
        setUseCustomRange(true)
      }}
      onToday={handleTodayClick}
      entries={entryRows}
      loading={loading}
      error={timesheetQuery.error}
      onExportCsv={handleExportCSV}
      onPrint={handlePrint}
    />
  )
}
