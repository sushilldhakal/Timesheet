"use client"

import { cva } from "class-variance-authority"
import { format, differenceInMinutes, parseISO } from "date-fns"
import { useRef, useState, useCallback, useEffect } from "react"

import { useCalendar } from "@/components/calendar/contexts/calendar-context"
import { useEventResize } from "@/components/calendar/hooks/use-event-resize"
import { DraggableEvent } from "@/components/calendar/components/dnd/draggable-event"
import { EventDetailsDialog } from "@/components/calendar/components/dialogs/event-details-dialog"

import { cn } from "@/lib/utils"

import type { HTMLAttributes, CSSProperties } from "react"
import type { IEvent } from "@/components/calendar/interfaces"
import type { VariantProps } from "class-variance-authority"

const calendarWeekEventCardVariants = cva(
  "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring relative group",
  {
    variants: {
      color: {
        blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 [&_.event-dot]:fill-blue-600",
        green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300 [&_.event-dot]:fill-green-600",
        red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 [&_.event-dot]:fill-red-600",
        yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 [&_.event-dot]:fill-yellow-600",
        purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 [&_.event-dot]:fill-purple-600",
        orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 [&_.event-dot]:fill-orange-600",
        gray: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",
        "blue-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-blue-600",
        "green-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-green-600",
        "red-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-red-600",
        "orange-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-orange-600",
        "purple-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-purple-600",
        "yellow-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-yellow-600",
        "gray-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-neutral-600",
      },
      layout: {
        vertical: "",
        horizontal: "",
        compact: "p-2",
      },
    },
    defaultVariants: {
      color: "blue-dot",
      layout: "vertical",
    },
  }
)

interface IProps extends HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof calendarWeekEventCardVariants>, "color"> {
  event: IEvent
  customStyle?: CSSProperties
  showDot?: boolean
  showTime?: boolean
  enableDragDrop?: boolean
  enableResize?: boolean
}

export function ResizableEventBlock({
  event,
  className,
  layout = "vertical",
  customStyle,
  showDot,
  showTime = true,
  enableDragDrop = true,
  enableResize = true,
}: IProps) {
  const { badgeVariant } = useCalendar()
  const { resizeStart, resizeEnd } = useEventResize()
  const blockRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState<"top" | "bottom" | null>(null)
  const [isDraggingTime, setIsDraggingTime] = useState<string | null>(null)

  const start = parseISO(event.startDate)
  const end = parseISO(event.endDate)
  const durationInMinutes = differenceInMinutes(end, start)

  const heightInPixels = layout === "vertical" ? (durationInMinutes / 60) * 96 - 8 : undefined
  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof calendarWeekEventCardVariants>["color"]
  const calendarWeekEventCardClasses = cn(
    calendarWeekEventCardVariants({ color, layout, className }),
    durationInMinutes < 35 && layout === "vertical" && "py-0 justify-center"
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: "top" | "bottom") => {
      if (!enableResize || layout !== "vertical") return
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(handle)
      setIsDraggingTime(handle)
    },
    [enableResize, layout]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = blockRef.current?.getBoundingClientRect()
      if (!rect) return

      const pixelsPerHour = 96 // Assuming 96px per hour
      const newY = e.clientY - rect.top

      if (isResizing === "top") {
        const minuteDiff = Math.round((newY / pixelsPerHour) * 60)
        const newStart = new Date(start)
        newStart.setMinutes(newStart.getMinutes() + minuteDiff)
        resizeStart(event, newStart)
      } else if (isResizing === "bottom") {
        const minuteDiff = Math.round((newY / pixelsPerHour) * 60)
        const newEnd = new Date(end)
        newEnd.setMinutes(newEnd.getMinutes() + minuteDiff)
        resizeEnd(event, newEnd)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(null)
      setIsDraggingTime(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, event, start, end, resizeStart, resizeEnd])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (e.currentTarget instanceof HTMLElement) e.currentTarget.click()
    }
  }

  const displayName = event.user?.name || event.title || "Vacant"
  const shouldShowDot = showDot ?? ["mixed", "dot"].includes(badgeVariant)
  const shouldShowTime = showTime && (layout === "compact" || durationInMinutes > 25)

  const content = (
    <div
      ref={blockRef}
      role="button"
      tabIndex={0}
      className={calendarWeekEventCardClasses}
      style={{
        height: heightInPixels ? `${heightInPixels}px` : undefined,
        ...customStyle,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Top resize handle */}
      {enableResize && layout === "vertical" && durationInMinutes > 60 && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-md",
            isDraggingTime === "top" && "bg-black/30 opacity-100"
          )}
          onMouseDown={(e) => handleMouseDown(e, "top")}
          title="Drag to change start time"
        />
      )}

      {/* Content */}
      <div className="flex items-center gap-1.5 truncate">
        {shouldShowDot && (
          <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
            <circle cx="4" cy="4" r="4" />
          </svg>
        )}
        <p className="truncate font-semibold">{displayName}</p>
      </div>

      {shouldShowTime && (
        <p className="text-muted-foreground">
          {format(start, "h:mm a")} - {format(end, "h:mm a")}
        </p>
      )}

      {event.title && event.user && layout === "compact" && (
        <p className="text-muted-foreground truncate">{event.title}</p>
      )}

      {/* Bottom resize handle */}
      {enableResize && layout === "vertical" && durationInMinutes > 60 && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-md",
            isDraggingTime === "bottom" && "bg-black/30 opacity-100"
          )}
          onMouseDown={(e) => handleMouseDown(e, "bottom")}
          title="Drag to change end time"
        />
      )}
    </div>
  )

  const innerContent = enableDragDrop ? (
    <DraggableEvent event={event}>{content}</DraggableEvent>
  ) : (
    content
  )

  return (
    <EventDetailsDialog event={event}>
      {innerContent}
    </EventDetailsDialog>
  )
}

export { calendarWeekEventCardVariants }
