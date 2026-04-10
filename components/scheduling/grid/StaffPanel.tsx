import React, { useRef, useEffect } from "react"
import type { Resource, Block } from '@/components/scheduling/core/types-scheduler'
import { useSchedulerContext } from '@/components/scheduling/shell/SchedulerProvider'
import { cn } from '@/lib/utils/cn'

interface StaffPanelProps {
  category: Resource
  date: Date
  dayShifts: Block[]
  onDragStaff: (args: { empId: string; categoryId: string; empName: string; pointerId: number }) => void
  anchorRect: DOMRect | null
  onClose: () => void
  /** When "drawer", render as slide-in panel from right (tablet). */
  variant?: "popover" | "drawer"
}

export function StaffPanel({
  category,
  date,
  dayShifts,
  onDragStaff,
  anchorRect,
  onClose,
  variant = "popover",
}: StaffPanelProps): React.ReactElement | null {
  const { employees, getColor, labels } = useSchedulerContext()
  const scheduledIds = new Set(
    dayShifts.filter((s) => s.categoryId === category.id).map((s) => s.employeeId)
  )
  const unscheduled = employees.filter(
    (e) => e.categoryId === category.id && !scheduledIds.has(e.id)
  )
  const c = getColor(category.colorIdx)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener("mousedown", h), 0)
    return () => document.removeEventListener("mousedown", h)
  }, [onClose])

  if (variant === "popover" && !anchorRect) return null

  const isDrawer = variant === "drawer"
  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-[8888] overflow-y-auto bg-background",
        isDrawer
          ? "bottom-0 right-0 top-0 w-[280px] border-l border-border py-3 shadow-[-8px_0_24px_var(--color-schedule-fg-08)]"
          : "max-h-60 min-w-[190px] rounded-[10px] py-1.5 shadow-[0_8px_32px_var(--color-schedule-fg-12)]",
      )}
      style={
        isDrawer
          ? undefined
          : {
              top: anchorRect!.bottom + 4,
              left: anchorRect!.left,
              border: `1.5px solid ${c.bg}30`,
            }
      }
    >
      <div
        className="mb-1 flex items-center justify-between border-b px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: c.bg, borderBottomColor: `${c.bg}33` }}
      >
        <span>Drag to schedule · {category.name}</span>
        {isDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="cursor-pointer border-none bg-transparent p-1 text-lg leading-none text-muted-foreground"
          >
            ×
          </button>
        )}
      </div>

      {unscheduled.length === 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          All {labels.staff.toLowerCase()} scheduled
        </div>
      )}

      {unscheduled.map((emp) => (
        <div
          key={emp.id}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            onDragStaff({ empId: emp.id, categoryId: category.id, empName: emp.name, pointerId: e.pointerId })
          }}
          className="flex cursor-grab touch-none select-none items-center gap-2 px-3 py-[7px] hover:bg-accent"
        >
          <div
            className="flex size-[26px] shrink-0 items-center justify-center rounded-full"
            style={{ background: c.light }}
          >
            <span className="text-[8px] font-bold" style={{ color: c.text }}>
              {emp.avatar}
            </span>
          </div>
          <span className="text-xs font-medium text-foreground">{emp.name}</span>
          <span className="ml-auto text-[9px] text-muted-foreground">drag →</span>
        </div>
      ))}
    </div>
  )
}
