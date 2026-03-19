"use client"

import { useState, useEffect, useMemo } from "react"
import { useMe } from "@/lib/queries/auth"
import { useCalendarEvents } from "@/lib/queries/calendar"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns"
import { Clock, MapPin, Briefcase, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface StaffRosterViewProps {
  selectedDate: Date
}

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  duration: number
  role: string
  location: string
  status: string
  notes?: string
}

export function StaffRosterView({ selectedDate }: StaffRosterViewProps) {
  const { data: userInfo } = useMe()
  const [shifts, setShifts] = useState<Shift[]>([])

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { data: eventsData, isLoading } = useCalendarEvents({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    userId: userInfo?.user?.id || "all"
  })

  // Transform events to shifts
  useEffect(() => {
    if (eventsData?.data?.events && userInfo?.user?.id) {
      const userShifts = eventsData.data.events
        .filter((event: any) => event.user?.id === userInfo.user?.id)
        .map((event: any) => {
          const startDate = parseISO(event.startDate)
          const endDate = parseISO(event.endDate)
          const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) // hours
          
          return {
            id: event.id,
            date: startDate,
            startTime: format(startDate, "HH:mm"),
            endTime: format(endDate, "HH:mm"),
            duration: Math.round(duration * 10) / 10, // Round to 1 decimal
            role: event.title?.split(" - ")[0] || "Unknown Role",
            location: event.title?.split(" - ")[1] || "Unknown Location",
            status: "confirmed",
            notes: event.description
          }
        })
      
      setShifts(userShifts)
    }
  }, [eventsData, userInfo])

  // Group shifts by day
  const shiftsByDay = useMemo(() => {
    const grouped: Record<string, Shift[]> = {}
    
    weekDays.forEach(day => {
      const dayKey = format(day, "yyyy-MM-dd")
      grouped[dayKey] = shifts.filter(shift => 
        isSameDay(shift.date, day)
      ).sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
    
    return grouped
  }, [shifts, weekDays])

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const totalHours = shifts.reduce((sum, shift) => sum + shift.duration, 0)
    const totalShifts = shifts.length
    const daysWorking = Object.values(shiftsByDay).filter(dayShifts => dayShifts.length > 0).length
    
    return { totalHours, totalShifts, daysWorking }
  }, [shifts, shiftsByDay])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDays.map((day, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled shifts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Days</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.daysWorking}</div>
            <p className="text-xs text-muted-foreground">
              Out of 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayKey = format(day, "yyyy-MM-dd")
          const dayShifts = shiftsByDay[dayKey] || []
          const isToday = isSameDay(day, new Date())
          const totalDayHours = dayShifts.reduce((sum, shift) => sum + shift.duration, 0)

          return (
            <Card key={index} className={`${isToday ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {format(day, "EEE")}
                    </CardTitle>
                    <p className="text-lg font-bold">
                      {format(day, "d")}
                    </p>
                  </div>
                  {dayShifts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {totalDayHours}h
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {dayShifts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No shifts</p>
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {shift.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {shift.duration}h
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{shift.startTime} - {shift.endTime}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{shift.location}</span>
                        </div>
                      </div>
                      
                      {shift.notes && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          {shift.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Mobile Compact View */}
      <div className="lg:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Week Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weekDays.map((day, index) => {
              const dayKey = format(day, "yyyy-MM-dd")
              const dayShifts = shiftsByDay[dayKey] || []
              const isToday = isSameDay(day, new Date())

              return (
                <div key={index} className={`p-4 rounded-lg border ${isToday ? 'bg-primary/5 border-primary' : 'bg-card'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{format(day, "EEEE, MMM d")}</h3>
                      {isToday && <Badge variant="default" className="text-xs mt-1">Today</Badge>}
                    </div>
                    {dayShifts.length > 0 && (
                      <Badge variant="secondary">
                        {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  {dayShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No shifts scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">{shift.role}</p>
                            <p className="text-xs text-muted-foreground">
                              {shift.startTime} - {shift.endTime} • {shift.location}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {shift.duration}h
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}