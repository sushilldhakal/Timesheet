"use client"

import { useState } from "react"
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, parseISO, isValid } from "date-fns"
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
  /** Optional: enable range selection inside the same calendar popover (day view only). */
  rangeValue?: { startDate: string; endDate: string }
  onRangeChange?: (start: string, end: string) => void
}

function toYmdLocal(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function safeParseIsoDate(s: string): Date | null {
  const d = parseISO(String(s || ""))
  return isValid(d) ? d : null
}

export function TimesheetDateNavigator({
  view,
  selectedDate,
  onDateChange,
  rangeValue,
  onRangeChange,
}: TimesheetDateNavigatorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined)

  const getDisplayText = () => {
    switch (view) {
      case "day":
        if (
          rangeValue?.startDate &&
          rangeValue?.endDate &&
          rangeValue.startDate !== rangeValue.endDate
        ) {
          const s = safeParseIsoDate(rangeValue.startDate)
          const e = safeParseIsoDate(rangeValue.endDate)
          if (s && e) return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`
        }
        return format(selectedDate, "EEEE, d MMMM yyyy")
      case "week":
        const weekStart = new Date(selectedDate)
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1) // Monday
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Sunday
        return `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`
      case "month":
        return format(selectedDate, "MMMM yyyy")
      default:
        return format(selectedDate, "MMMM yyyy")
    }
  }

  const navigatePrevious = () => {
    let newDate: Date
    switch (view) {
      case "day":
        newDate = subDays(selectedDate, 1)
        break
      case "week":
        newDate = subWeeks(selectedDate, 1)
        break
      case "month":
        newDate = subMonths(selectedDate, 1)
        break
      default:
        newDate = subMonths(selectedDate, 1)
    }
    onDateChange(newDate)
  }

  const navigateNext = () => {
    let newDate: Date
    switch (view) {
      case "day":
        newDate = addDays(selectedDate, 1)
        break
      case "week":
        newDate = addWeeks(selectedDate, 1)
        break
      case "month":
        newDate = addMonths(selectedDate, 1)
        break
      default:
        newDate = addMonths(selectedDate, 1)
    }
    onDateChange(newDate)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setIsCalendarOpen(false)
    }
  }

  const isRangeEnabled = view === "day" && typeof onRangeChange === "function"
  const rangeSelected =
    isRangeEnabled && rangeValue?.startDate
      ? {
          from: safeParseIsoDate(rangeValue.startDate) ?? undefined,
          to: safeParseIsoDate(rangeValue.endDate) ?? undefined,
        }
      : undefined

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="size-6.5 px-0 [&_svg]:size-4.5"
        onClick={navigatePrevious}
      >
        <ChevronLeft />
      </Button>

      <Popover
        open={isCalendarOpen}
        onOpenChange={(open) => {
          setIsCalendarOpen(open)
          if (open) {
            // Seed pending range from the currently applied range (if any)
            setPendingRange(rangeSelected)
          } else {
            setPendingRange(undefined)
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto px-3 py-2 text-sm hover:text-foreground hover:bg-muted"
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {isRangeEnabled ? (
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={(pendingRange?.from ?? rangeSelected?.from ?? selectedDate) as Date}
              selected={pendingRange}
              onSelect={(r) => {
                setPendingRange(r)
                const from = r?.from
                const to = r?.to
                if (!from) {
                  onRangeChange("", "")
                  return
                }

                // Match `DateRangePicker`: selecting only `from` is allowed and does NOT close.
                const start = toYmdLocal(from)
                const end = toYmdLocal(to ?? from)
                onRangeChange(start, end)
              }}
            />
          ) : (
            <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} />
          )}
        </PopoverContent>
      </Popover>

      <Button 
        variant="outline" 
        className="size-6.5 px-0 [&_svg]:size-4.5"
        onClick={navigateNext}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}