"use client"

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils/cn"

interface PublicHolidayYearNavigatorProps {
  selectedYear: number
  onYearChange: (year: number) => void
  className?: string
}

export function PublicHolidayYearNavigator({
  selectedYear,
  onYearChange,
  className,
}: PublicHolidayYearNavigatorProps) {
  const currentYear = new Date().getFullYear()
  
  // Generate year options (current year ± 5 years)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  const handlePreviousYear = () => {
    onYearChange(selectedYear - 1)
  }

  const handleNextYear = () => {
    onYearChange(selectedYear + 1)
  }

  const handleCurrentYear = () => {
    onYearChange(currentYear)
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousYear}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous year</span>
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 min-w-[80px] font-semibold"
          >
            {selectedYear}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="center">
          <div className="grid grid-cols-3 gap-1">
            {yearOptions.map((year) => (
              <Button
                key={year}
                variant={year === selectedYear ? "default" : "ghost"}
                size="sm"
                onClick={() => onYearChange(year)}
                className="h-8 w-16 text-sm"
              >
                {year}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextYear}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next year</span>
      </Button>

      {selectedYear !== currentYear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCurrentYear}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Today
        </Button>
      )}
    </div>
  )
}