"use client"

import { useState } from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { StaffRosterView } from "@/components/staff/roster/StaffRosterView"
import { TeamRosterView } from "@/components/staff/roster/TeamRosterView"
import { RosterTabs } from "@/components/staff/roster/RosterTabs"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { useEmployeeProfile } from "@/lib/queries/employee-clock"

export default function StaffRosterPage() {
  const [activeTab, setActiveTab] = useState<"my-roster" | "team-roster">("my-roster")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { data: profileData, isLoading } = useEmployeeProfile()
  const employeeId = profileData?.data?.employee?.id

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekTitle = `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`

  if (isLoading) return null
  if (!employeeId) return null

  return (
    <div className="flex flex-col h-full">
      <UnifiedCalendarTopbar
        onToday={() => setSelectedDate(new Date())}
        title={weekTitle}
        nav={
          <TimesheetDateNavigator
            view="week"
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        }
      />

      <RosterTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden">
        {activeTab === "my-roster" ? (
          <StaffRosterView selectedDate={selectedDate} employeeId={employeeId} />
        ) : (
          <TeamRosterView selectedDate={selectedDate} />
        )}
      </div>
    </div>
  )
}