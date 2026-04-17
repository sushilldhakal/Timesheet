"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { cn } from "@/lib/utils/cn"

export type AnalyticsView = "day" | "week" | "month"

interface AnalyticsHeaderProps {
  title: string
  description?: string
  selectedDate: Date
  onDateChange: (date: Date) => void
  view: AnalyticsView
  onViewChange: (view: AnalyticsView) => void
  locationId?: string
  locations?: Array<{ id: string; name: string }>
  onLocationChange?: (locationId: string) => void
  actions?: React.ReactNode
  className?: string
}

export function AnalyticsHeader({
  title,
  description,
  selectedDate,
  onDateChange,
  view,
  onViewChange,
  locationId,
  locations = [],
  onLocationChange,
  actions,
  className,
}: AnalyticsHeaderProps) {
  const handleToday = () => {
    onDateChange(new Date())
  }

  const viewSwitcher = (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {(["day", "week", "month"] as const).map((v) => (
        <Button
          key={v}
          variant={view === v ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange(v)}
          className="capitalize"
        >
          {v}
        </Button>
      ))}
    </div>
  )

  const nav = (
    <TimesheetDateNavigator
      view={view}
      selectedDate={selectedDate}
      onDateChange={onDateChange}
    />
  )

  const locationSelect = locations.length > 0 && (
    <Select value={locationId || ""} onValueChange={onLocationChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select location" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className={cn("space-y-3", className)}>
      <UnifiedCalendarTopbar
        onToday={handleToday}
        title={title}
        titleBadge={description && <span className="text-xs text-muted-foreground">{description}</span>}
        nav={nav}
        viewSwitcher={viewSwitcher}
        peopleSelect={locationSelect}
        actions={actions}
      />
    </div>
  )
}
