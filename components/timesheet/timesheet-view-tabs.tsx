"use client"

import { Button } from "@/components/ui/button"

export type TimesheetView = "day" | "week" | "month"

interface TimesheetViewTabsProps {
  view: TimesheetView
  onViewChange: (view: TimesheetView) => void
}

export function TimesheetViewTabs({ view, onViewChange }: TimesheetViewTabsProps) {
  const views: { key: TimesheetView; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ]

  return (
    <div className="flex items-center rounded-lg border p-1">
      {views.map((viewOption) => (
        <Button
          key={viewOption.key}
          variant={view === viewOption.key ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => onViewChange(viewOption.key)}
        >
          {viewOption.label}
        </Button>
      ))}
    </div>
  )
}