"use client"

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns"

interface RosterHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function RosterHeader({ selectedDate, onDateChange }: RosterHeaderProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }) // Sunday

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = direction === "prev" 
      ? subWeeks(selectedDate, 1)
      : addWeeks(selectedDate, 1)
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="flex flex-col gap-4 p-6 border-b bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            My Roster
          </h1>
          <p className="mt-2 text-muted-foreground">
            View your scheduled shifts and team roster
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={goToToday}
          className="hidden sm:flex"
        >
          Today
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-lg font-semibold text-foreground min-w-[200px] text-center">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button 
          variant="outline" 
          onClick={goToToday}
          className="sm:hidden"
          size="sm"
        >
          Today
        </Button>
      </div>
    </div>
  )
}