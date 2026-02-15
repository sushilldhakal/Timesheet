"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
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
  const from = value.startDate ? new Date(value.startDate) : undefined
  const to = value.endDate ? new Date(value.endDate) : undefined
  const range: DateRange | undefined =
    from && to ? { from, to } : from ? { from, to: from } : undefined

  const handleSelect = (r: DateRange | undefined) => {
    if (!r?.from) return
    const start = format(r.from, "yyyy-MM-dd")
    const end = r.to ? format(r.to, "yyyy-MM-dd") : start
    onChange(start, end)
    if (r.from && r.to) setOpen(false)
  }

  const label =
    value.startDate && value.endDate
      ? `${format(new Date(value.startDate), "d MMM yyyy")} – ${format(new Date(value.endDate), "d MMM yyyy")}`
      : placeholder

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
        <Card className="border-0">
          <CardContent className="p-0 pointer-events-auto">
            <Calendar
              mode="range"
              defaultMonth={from ?? to ?? new Date()}
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              className="pointer-events-auto"
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
            />
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
