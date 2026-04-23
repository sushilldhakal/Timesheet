import * as React from "react"

import { cn } from "@/lib/utils/cn"

export type CalendarPageShellProps = {
  /** Optional top header (title/description/metadata). */
  header?: React.ReactNode
  /** Toolbar row (date nav, view switcher, filters, actions). */
  toolbar?: React.ReactNode
  /** Main content area (calendar/grid/list/table/etc). */
  children: React.ReactNode
  /** Outer wrapper classes. */
  className?: string
  /** Inner max-width container classes. */
  containerClassName?: string
}

/**
 * CalendarPageShell
 *
 * A consistent SaaS page structure:
 * - optional header section
 * - sticky-ish toolbar section
 * - main content
 *
 * This is intentionally "slot-based" so Scheduling/Timesheet/Leave/Unavailability
 * can reuse identical spacing/layout while keeping their current logic intact.
 */
export function CalendarPageShell({
  header,
  toolbar,
  children,
  className,
  containerClassName,
}: CalendarPageShellProps): React.ReactElement {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {(header || toolbar) && (
        <div className={cn("shrink-0", containerClassName)}>
          {header}
          {toolbar}
        </div>
      )}
      <div className={cn("min-h-0 flex-1", containerClassName)}>{children}</div>
    </div>
  )
}

