import * as React from "react"

import { cn } from "@/lib/utils/cn"

export type UnifiedCalendarTopbarProps = {
  /** Clickable "today" tile on the far left */
  onToday: () => void

  /** Main title text (e.g. "April 2026") */
  title: React.ReactNode
  /** Small badge next to title (e.g. "12 events") */
  titleBadge?: React.ReactNode

  /** Date navigation controls (e.g. prev + popover trigger + next) */
  nav?: React.ReactNode

  /** Optional quick action near view switcher (e.g. "Now") */
  quickAction?: React.ReactNode

  /** View mode switcher pills (Day/Week/Month/Year) */
  viewSwitcher?: React.ReactNode

  /** Grid/list toggle button */
  gridListToggle?: React.ReactNode

  /** People selector (staff multi-select / single select) */
  peopleSelect?: React.ReactNode

  /** Primary page actions (Add shift, Export, Print, etc.) */
  actions?: React.ReactNode

  className?: string
}

export function UnifiedCalendarTopbar({
  onToday,
  title,
  titleBadge,
  nav,
  quickAction,
  viewSwitcher,
  gridListToggle,
  peopleSelect,
  actions,
  className,
}: UnifiedCalendarTopbarProps): React.ReactElement {
  const now = new Date()
  const monthShort = now.toLocaleString("en-US", { month: "short" })
  const day = now.getDate()

  return (
    <div className={cn("flex shrink-0 flex-col gap-2.5 border-b bg-background py-2.5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-[auto_1fr] grid-rows-2 items-center gap-x-2 gap-y-1">
            <div className="row-span-2 self-stretch">
              <button
                className="flex h-full min-h-[56px] w-12 shrink-0 cursor-pointer flex-col items-center overflow-hidden rounded-md border border-border bg-background shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={onToday}
                title="Go to today"
                type="button"
              >
                <span className="flex h-5 w-full items-center justify-center bg-primary text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {monthShort}
                </span>
                <span className="flex w-full flex-1 items-center justify-center text-lg font-bold tabular-nums text-foreground">
                  {day}
                </span>
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-base font-semibold text-foreground">{title}</span>
              {titleBadge}
            </div>

            <div className="flex items-center">{nav}</div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {quickAction}

          {viewSwitcher && (
            <div className="flex items-center gap-2">
              {viewSwitcher}

              {(gridListToggle || peopleSelect || actions) && (
                <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
              )}

              {gridListToggle}
            </div>
          )}

          {peopleSelect && (
            <>
              <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
              {peopleSelect}
            </>
          )}

          {actions && (
            <>
              <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
              {actions}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

