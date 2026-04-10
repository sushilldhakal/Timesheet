"use client"

import { useState, useEffect, useMemo } from "react"
import { useCalendarEvents } from "@/lib/queries/calendar"
import { format, startOfWeek, endOfWeek, isSameDay, parseISO, addDays } from "date-fns"
import { Clock, MapPin, Users, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TeamRosterViewProps {
  selectedDate: Date
}

interface TeamShift {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar?: string
  startTime: string
  endTime: string
  duration: number
  role: string
  location: string
  status: string
}

export function TeamRosterView({ selectedDate }: TeamRosterViewProps) {
  const [currentDay, setCurrentDay] = useState(selectedDate)
  const [teamShifts, setTeamShifts] = useState<TeamShift[]>([])

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

  const { data: eventsData, isLoading } = useCalendarEvents({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    publishedOnly: true,
  })

  // Transform events to team shifts
  useEffect(() => {
    const rawEvents = (eventsData as { events?: unknown[] } | undefined)?.events
    if (rawEvents?.length) {
      const shifts = rawEvents
        .filter((event: any) => isSameDay(parseISO(event.startDate), currentDay))
        .map((event: any) => {
          const startDate = parseISO(event.startDate)
          const endDate = parseISO(event.endDate)
          const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
          
          return {
            id: event.id,
            employeeId: event.user?.id || '',
            employeeName: event.user?.name || 'Unknown Employee',
            employeeAvatar: event.user?.picturePath,
            startTime: format(startDate, "HH:mm"),
            endTime: format(endDate, "HH:mm"),
            duration: Math.round(duration * 10) / 10,
            role: event.title?.split(" - ")[0] || "Unknown Role",
            location: event.title?.split(" - ")[1] || "Unknown Location",
            status: "confirmed"
          }
        })
      
      setTeamShifts(shifts)
    }
  }, [eventsData, currentDay])

  // Group shifts by role
  const shiftsByRole = useMemo(() => {
    const grouped: Record<string, TeamShift[]> = {}
    
    teamShifts.forEach(shift => {
      if (!grouped[shift.role]) {
        grouped[shift.role] = []
      }
      grouped[shift.role].push(shift)
    })
    
    // Sort shifts within each role by start time
    Object.keys(grouped).forEach(role => {
      grouped[role].sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
    
    return grouped
  }, [teamShifts])

  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const totalStaff = new Set(teamShifts.map(shift => shift.employeeId)).size
    const totalHours = teamShifts.reduce((sum, shift) => sum + shift.duration, 0)
    const totalShifts = teamShifts.length
    const roleCount = Object.keys(shiftsByRole).length
    
    return { totalStaff, totalHours, totalShifts, roleCount }
  }, [teamShifts, shiftsByRole])

  const navigateDay = (direction: "prev" | "next") => {
    const newDay = direction === "prev" 
      ? addDays(currentDay, -1)
      : addDays(currentDay, 1)
    setCurrentDay(newDay)
  }

  const goToToday = () => {
    setCurrentDay(new Date())
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
        
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
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
      {/* Day Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {format(currentDay, "EEEE, MMMM d, yyyy")}
          </h2>
          {isSameDay(currentDay, new Date()) && (
            <Badge variant="default">Today</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDay("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="px-3"
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDay("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              Working today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              Scheduled hours
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              Active shifts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.roleCount}</div>
            <p className="text-xs text-muted-foreground">
              Different roles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Roster by Role */}
      <div className="space-y-6">
        {Object.keys(shiftsByRole).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shifts scheduled</h3>
              <p className="text-muted-foreground text-center">
                There are no team shifts scheduled for {format(currentDay, "MMMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(shiftsByRole).map(([role, shifts]) => {
            const roleHours = shifts.reduce((sum, shift) => sum + shift.duration, 0)
            
            return (
              <Card key={role}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      {role}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{shifts.length} staff</span>
                      <span>{roleHours}h total</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={shift.employeeAvatar} />
                            <AvatarFallback className="text-xs">
                              {shift.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {shift.employeeName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {shift.duration}h shift
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{shift.startTime} - {shift.endTime}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{shift.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Mobile Timeline View */}
      <div className="md:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Timeline View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamShifts
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((shift) => (
                  <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-medium">{shift.startTime}</p>
                      <p className="text-xs text-muted-foreground">{shift.endTime}</p>
                    </div>
                    
                    <div className="w-px h-12 bg-border" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={shift.employeeAvatar} />
                          <AvatarFallback className="text-xs">
                            {shift.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm">{shift.employeeName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {shift.role} • {shift.location} • {shift.duration}h
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}