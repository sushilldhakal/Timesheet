"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"

interface TimesheetTodayButtonProps {
  onTodayClick: () => void
}

export function TimesheetTodayButton({ onTodayClick }: TimesheetTodayButtonProps) {
  const [today, setToday] = useState<Date | null>(null)

  useEffect(() => {
    setToday(new Date())
  }, [])

  if (!today) {
    // Return a placeholder during SSR
    return (
      <button
        className="flex size-14 cursor-pointer flex-col items-start overflow-hidden rounded-lg border hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={onTodayClick}
      >
        <p className="flex h-6 w-full items-center justify-center bg-primary text-center text-xs font-semibold text-primary-foreground">
          TODAY
        </p>
        <p className="flex w-full items-center justify-center text-lg font-bold">•</p>
      </button>
    )
  }

  return (
    <button
      className="flex size-14 cursor-pointer flex-col items-start overflow-hidden rounded-lg border hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onTodayClick}
    >
      <p className="flex h-6 w-full items-center justify-center bg-primary text-center text-xs font-semibold text-primary-foreground">
        {format(today, "MMM").toUpperCase()}
      </p>
      <p className="flex w-full items-center justify-center text-lg font-bold">{today.getDate()}</p>
    </button>
  )
}