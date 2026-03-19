"use client"

import { User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RosterTabsProps {
  activeTab: "my-roster" | "team-roster"
  onTabChange: (tab: "my-roster" | "team-roster") => void
}

export function RosterTabs({ activeTab, onTabChange }: RosterTabsProps) {
  return (
    <div className="flex border-b bg-muted/30">
      <Button
        variant={activeTab === "my-roster" ? "default" : "ghost"}
        onClick={() => onTabChange("my-roster")}
        className="flex-1 sm:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-12"
        data-state={activeTab === "my-roster" ? "active" : "inactive"}
      >
        <User className="h-4 w-4 mr-2" />
        My Roster
      </Button>
      
      <Button
        variant={activeTab === "team-roster" ? "default" : "ghost"}
        onClick={() => onTabChange("team-roster")}
        className="flex-1 sm:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-12"
        data-state={activeTab === "team-roster" ? "active" : "inactive"}
      >
        <Users className="h-4 w-4 mr-2" />
        Team Roster
      </Button>
    </div>
  )
}