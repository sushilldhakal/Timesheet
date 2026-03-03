"use client"

import { useMemo } from "react"
import { format, eachDayOfInterval, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShiftCell } from "./ShiftCell"
import { formatTime, calculateShiftDuration } from "@/lib/roster-validation"

interface RosterGridProps {
  roster: any
  validation: any
  onShiftsChange: (shifts: any[]) => void
}

export function RosterGrid({ roster, validation, onShiftsChange }: RosterGridProps) {
  // Get all unique locations and roles from shifts
  const locationRoleMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    roster.shifts.forEach((shift: any) => {
      const locId = shift.locationId._id.toString()
      const roleId = shift.roleId._id.toString()
      if (!map.has(locId)) map.set(locId, new Set())
      map.get(locId)!.add(roleId)
    })
    return map
  }, [roster])

  // Generate day columns for the week
  const days = useMemo(() => {
    const start = parseISO(roster.weekStartDate)
    const end = parseISO(roster.weekEndDate)
    return eachDayOfInterval({ start, end })
  }, [roster])

  // Get all unique locations and roles
  const locations = useMemo(() => {
    return Array.from(locationRoleMap.keys()).sort()
  }, [locationRoleMap])

  // Get shifts grouped by location and day
  const shiftsByLocationDay = useMemo(() => {
    const grouped = new Map<string, Map<string, any[]>>()

    roster.shifts.forEach((shift: any) => {
      const locId = shift.locationId._id.toString()
      const dayStr = format(new Date(shift.date), "yyyy-MM-dd")

      if (!grouped.has(locId)) {
        grouped.set(locId, new Map())
      }

      if (!grouped.get(locId)!.has(dayStr)) {
        grouped.get(locId)!.set(dayStr, [])
      }

      grouped.get(locId)!.get(dayStr)!.push(shift)
    })

    return grouped
  }, [roster])

  // Get employee hours per week for display
  const employeeWeeklyHours = useMemo(() => {
    const hours = new Map<string, number>()
    roster.shifts.forEach((shift: any) => {
      if (shift.employeeId) {
        const empId = shift.employeeId._id.toString()
        const duration = calculateShiftDuration(shift.startTime, shift.endTime)
        hours.set(empId, (hours.get(empId) || 0) + duration)
      }
    })
    return hours
  }, [roster])

  function handleShiftUpdate(shiftId: string, updates: any) {
    const updated = roster.shifts.map((s: any) =>
      s._id.toString() === shiftId ? { ...s, ...updates } : s
    )
    onShiftsChange(updated)
  }

  function handleShiftRemove(shiftId: string) {
    const updated = roster.shifts.map((s: any) =>
      s._id.toString() === shiftId ? { ...s, employeeId: null } : s
    )
    onShiftsChange(updated)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Weekly Roster</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 overflow-x-auto">
          {locations.map((locationId) => {
            const location = roster.shifts.find(
              (s: any) => s.locationId._id.toString() === locationId
            )?.locationId

            return (
              <div key={locationId} className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {location?.name}
                  <Badge variant="outline">{location?.type}</Badge>
                </h3>

                {/* Day columns table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-200 p-2 bg-gray-50 w-24">
                          Role
                        </th>
                        {days.map((day) => (
                          <th
                            key={day.toISOString()}
                            className="border border-gray-200 p-2 bg-gray-50 min-w-48"
                          >
                            <div className="text-sm font-semibold">
                              {format(day, "EEE")}
                            </div>
                            <div className="text-xs text-gray-600">
                              {format(day, "MMM d")}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Rows for each role at this location */}
                      {Array.from(locationRoleMap.get(locationId) || []).map(
                        (roleId) => {
                          const role = roster.shifts.find(
                            (s: any) => s.roleId._id.toString() === roleId
                          )?.roleId

                          return (
                            <tr key={roleId}>
                              <td className="border border-gray-200 p-2 bg-gray-50 font-medium text-sm">
                                {role?.name}
                              </td>

                              {/* Cell for each day */}
                              {days.map((day) => {
                                const dayStr = format(day, "yyyy-MM-dd")
                                const shiftsForDay =
                                  shiftsByLocationDay
                                    .get(locationId)
                                    ?.get(dayStr)
                                    ?.filter(
                                      (s: any) =>
                                        s.roleId._id.toString() === roleId
                                    ) || []

                                return (
                                  <td
                                    key={`${locationId}-${roleId}-${dayStr}`}
                                    className="border border-gray-200 p-2 min-w-48 bg-white hover:bg-blue-50 transition"
                                  >
                                    <div className="space-y-1">
                                      {shiftsForDay.map((shift: any) => (
                                        <ShiftCell
                                          key={shift._id.toString()}
                                          shift={shift}
                                          validation={
                                            validation?.shifts.find(
                                              (v: any) =>
                                                v.shiftId ===
                                                shift._id.toString()
                                            )
                                          }
                                          onUpdate={handleShiftUpdate}
                                          onRemove={handleShiftRemove}
                                          employeeHours={
                                            shift.employeeId
                                              ? employeeWeeklyHours.get(
                                                  shift.employeeId._id.toString()
                                                )
                                              : 0
                                          }
                                          roster={roster}
                                        />
                                      ))}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
