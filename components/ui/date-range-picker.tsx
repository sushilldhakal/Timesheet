"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value: { startDate: string; endDate: string }
  onChange: (startDate: string, endDate: string) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date range",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse dates properly to avoid timezone issues
  const from = value.startDate ? new Date(value.startDate + 'T00:00:00') : undefined
  const to = value.endDate ? new Date(value.endDate + 'T00:00:00') : undefined
  
  const range: DateRange | undefined =
    from && to ? { from, to } : from ? { from, to: from } : undefined

  const handleSelect = (r: DateRange | undefined) => {
    if (!r?.from) {
      // If no date selected, clear the selection
      onChange("", "")
      return
    }
    
    // Format dates properly to avoid timezone issues
    const start = format(r.from, "yyyy-MM-dd")
    const end = r.to ? format(r.to, "yyyy-MM-dd") : start
    
    onChange(start, end)
    
    // Don't auto-close - let the user click outside to close
    // This matches shadcn UI behavior
  }

  const label = React.useMemo(() => {
    if (value.startDate && value.endDate) {
      const fromDate = new Date(value.startDate + 'T00:00:00')
      const toDate = new Date(value.endDate + 'T00:00:00')
      
      if (value.startDate === value.endDate) {
        return format(fromDate, "d MMM yyyy")
      }
      return `${format(fromDate, "d MMM yyyy")} – ${format(toDate, "d MMM yyyy")}`
    }
    return placeholder
  }, [value.startDate, value.endDate, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-[260px] justify-start text-left font-normal print:hidden",
            !range && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={from ?? to ?? new Date()}
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
        />
      </PopoverContent>
    </Popover>
  )
}
