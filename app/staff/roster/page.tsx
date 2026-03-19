"use client"

import { useState } from "react"
import { StaffRosterView } from "@/components/staff/roster/StaffRosterView"
import { TeamRosterView } from "@/components/staff/roster/TeamRosterView"
import { RosterTabs } from "@/components/staff/roster/RosterTabs"
import { RosterHeader } from "@/components/staff/roster/RosterHeader"

export default function StaffRosterPage() {
  const [activeTab, setActiveTab] = useState<"my-roster" | "team-roster">("my-roster")
  const [selectedDate, setSelectedDate] = useState(new Date())

  return (
    <div className="flex flex-col h-full">
      <RosterHeader 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
      
      <RosterTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <div className="flex-1 overflow-hidden">
        {activeTab === "my-roster" ? (
          <StaffRosterView selectedDate={selectedDate} />
        ) : (
          <TeamRosterView selectedDate={selectedDate} />
        )}
      </div>
    </div>
  )
}