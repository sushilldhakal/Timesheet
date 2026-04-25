"use client"

import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { TimesheetView } from "./timesheet-view-tabs"

interface TimesheetDateNavigatorProps {
  view: TimesheetView
  selectedDate: Date
  onDateChange: (date: Date) => void
  rangeValue?: { startDate: string; endDate: string }
  onRangeChange?: (start: string, end: string) => void
}

export function TimesheetDateNavigator({
  view,
  selectedDate,
  onDateChange,
  onRangeChange,
}: TimesheetDateNavigatorProps) {
  const displayText = (() => {
    if (view === "week") {
      const s = new Date(selectedDate)
      s.setDate(s.getDate() - s.getDay() + 1)
      const e = new Date(s)
      e.setDate(s.getDate() + 6)
      return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`
    }
    if (view === "month") return format(selectedDate, "MMMM yyyy")
    return format(selectedDate, "EEEE, d MMMM yyyy")
  })()

  const prev = () => {
    if (view === "day") onDateChange(subDays(selectedDate, 1))
    else if (view === "week") onDateChange(subWeeks(selectedDate, 1))
    else onDateChange(subMonths(selectedDate, 1))
  }

  const next = () => {
    if (view === "day") onDateChange(addDays(selectedDate, 1))
    else if (view === "week") onDateChange(addWeeks(selectedDate, 1))
    else onDateChange(addMonths(selectedDate, 1))
  }

  const calendarSelected: DateRange = { from: selectedDate, to: selectedDate }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={prev}>
        <ChevronLeft />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-auto px-3 py-2 text-sm hover:text-foreground hover:bg-muted">
            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            month={selectedDate}
            selected={calendarSelected}
            onSelect={(r) => {
              if (r?.from) {
                onDateChange(r.from)
                if (onRangeChange) {
                  onRangeChange(
                    format(r.from, "yyyy-MM-dd"),
                    format(r.to ?? r.from, "yyyy-MM-dd"),
                  )
                }
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={next}>
        <ChevronRight />
      </Button>
    </div>
  )
}
