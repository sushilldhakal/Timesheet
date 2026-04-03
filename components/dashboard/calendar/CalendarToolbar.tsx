import * as React from "react"

import { cn } from "@/lib/utils/cn"

export type CalendarToolbarProps = {
  /** Left side: date controls (today, month title, prev/next, date picker). */
  left?: React.ReactNode
  /** Right side: view switcher, filters (user select), actions. */
  right?: React.ReactNode
  /** Optional second row below the main toolbar. */
  bottom?: React.ReactNode
  /** Border + background wrapper (default matches Scheduling spacing). */
  className?: string
}

export function CalendarToolbar({
  left,
  right,
  bottom,
  className,
}: CalendarToolbarProps): React.ReactElement {
  return (
    <div className={cn("border-b bg-background", className)}>
      <div className="flex flex-wrap items-center gap-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">{left}</div>
        <div className="flex items-center gap-3">{right}</div>
      </div>
      {bottom && <div className="pb-3">{bottom}</div>}
    </div>
  )
}

