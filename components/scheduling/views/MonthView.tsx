import React, { useRef, useState, useCallback, useEffect } from "react"
import type { Block, Resource } from "../core/types"
import { useSchedulerContext } from "../context"
import { sameDay, isToday, fmt12, getDIM, getFirst, DOW_MON_FIRST, toDateISO } from "../core/constants"
import { Plus, Copy, ClipboardPaste } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { StaffPanel } from "../StaffPanel"
import { DayShiftsDialog } from "../modals/DayShiftsDialog"

interface MonthViewProps {
  date: Date
  shifts: Block[]
  setShifts: React.Dispatch<React.SetStateAction<Block[]>>
  onShiftClick: (block: Block, resource: Resource) => void
  onAddShift: (date: Date, categoryId?: string | null, empId?: string | null) => void
  copiedShift?: Block | null
  setCopiedShift?: React.Dispatch<React.SetStateAction<Block | null>>
  onDateDoubleClick?: (date: Date) => void
}

interface DragState {
  id: string
}

interface GhostPosition {
  x: number
  y: number
}

interface StaffPanelState {
  categoryId: string
  anchorRect: DOMRect
}

function MonthViewInner({
  date,
  shifts,
  setShifts,
  onShiftClick,
  onAddShift,
  copiedShift,
  setCopiedShift,
  onDateDoubleClick,
}: MonthViewProps): React.ReactElement {
  const { categories, employees, getColor, settings, nextUid, labels } = useSchedulerContext()
  const [moreShiftsDialog, setMoreShiftsDialog] = useState<Date | null>(null)
  const [hoverMore, setHoverMore] = useState<{ date: Date; rect: DOMRect } | null>(null)
  const y = date.getFullYear()
  const m = date.getMonth()
  const daysInMonth = getDIM(y, m)
  const firstDay = getFirst(y, m)

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d))

  const categoryMap: Record<string, Resource> = Object.fromEntries(
    categories.map((c) => [c.id, c])
  )

  const ref = useRef<HTMLDivElement>(null)
  const ds = useRef<DragState | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropT, setDropT] = useState<string | null>(null)
  const [gPos, setGPos] = useState<GhostPosition | null>(null)
  const [staffPanel, setStaffPanel] = useState<StaffPanelState | null>(null)
  const staffDragRef = useRef<{ empId: string; categoryId: string; empName: string; pointerId: number } | null>(null)
  const [isStaffDragging, setIsStaffDragging] = useState(false)

  const getCD = useCallback((cx: number, cy: number): string | null => {
    const el = document.elementFromPoint(cx, cy)
    return el?.closest("[data-cell-date]")?.getAttribute("data-cell-date") ?? null
  }, [])

  const clearStaffDrag = useCallback(() => {
    staffDragRef.current = null
    setIsStaffDragging(false)
    setDropT(null)
  }, [])

  useEffect(() => {
    if (!isStaffDragging) return
    const onMove = (e: PointerEvent) => setDropT(getCD(e.clientX, e.clientY))
    const onUp = (e: PointerEvent) => {
      const drag = staffDragRef.current
      if (!drag) return
      const ymd = getCD(e.clientX, e.clientY)
      if (ymd) {
        const emp = employees.find((x) => x.id === drag.empId)
        setShifts((prev) => [
          ...prev,
          {
            id: nextUid(),
            categoryId: drag.categoryId,
            employeeId: drag.empId,
            date: ymd,
            startH: 12,
            endH: 20,
            employee: emp?.name || drag.empName || "?",
            status: "draft",
          },
        ])
      }
      clearStaffDrag()
    }
    const onCancel = () => {
      if (staffDragRef.current) clearStaffDrag()
    }
    document.addEventListener("pointermove", onMove, { capture: true })
    document.addEventListener("pointerup", onUp, { capture: true })
    document.addEventListener("pointercancel", onCancel, { capture: true })
    return () => {
      document.removeEventListener("pointermove", onMove, { capture: true })
      document.removeEventListener("pointerup", onUp, { capture: true })
      document.removeEventListener("pointercancel", onCancel, { capture: true })
    }
  }, [isStaffDragging, getCD, employees, nextUid, setShifts, clearStaffDrag])

  const onSPD = useCallback((e: React.PointerEvent<HTMLDivElement>, shift: Block): void => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    ds.current = { id: shift.id }
    setDragId(shift.id)
  }, [])

  const onPM = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!ds.current) return
      setGPos({ x: e.clientX, y: e.clientY })
      setDropT(getCD(e.clientX, e.clientY))
    },
    [getCD]
  )

  const onPC = useCallback((): void => {
    ds.current = null
    setDragId(null)
    setDropT(null)
    setGPos(null)
  }, [])

  const onPU = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!ds.current) return
      const cd = getCD(e.clientX, e.clientY)
      const id = ds.current.id
      ds.current = null
      setDragId(null)
      setDropT(null)
      setGPos(null)
      if (cd) {
        const [yr, mo, dy] = cd.split("-").map(Number)
        const newDate = `${yr}-${String(mo).padStart(2, "0")}-${String(dy).padStart(2, "0")}`
        setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, date: newDate } : s)))
      }
    },
    [getCD, setShifts]
  )

  return (
    <div
      ref={ref}
      className="flex flex-1 select-none flex-row overflow-hidden"
      onPointerMove={onPM}
      onPointerUp={onPU}
      onPointerCancel={onPC}
    >
      <div className="w-[180px] shrink-0 overflow-y-auto border-r border-border bg-muted">
        {categories.map((cat) => {
          const c = getColor(cat.colorIdx)
          return (
            <div key={cat.id} className="border-b border-border px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="size-2 shrink-0 rounded-full" style={{ background: c.bg }} />
                <span className="text-[13px] font-semibold text-foreground">{cat.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setStaffPanel((p) =>
                    p?.categoryId === cat.id ? null : { categoryId: cat.id, anchorRect: rect }
                  )
                }}
                className="w-full cursor-pointer rounded-md border px-2 py-1 text-[11px] font-semibold"
                style={{ color: c.text, background: c.light, borderColor: c.border }}
              >
                {labels.staff ?? "Staff"}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="grid shrink-0 grid-cols-7 border-b-2 border-border">
          {DOW_MON_FIRST.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(96px,1fr)] grid-cols-7 overflow-y-auto">
          {cells.map((d, i) => {
            if (!d) {
              return <div key={`e${i}`} className="border-b border-r border-border bg-muted" />
            }
            const today = isToday(d)
            const closed = settings?.workingHours?.[d.getDay()] === null
            const dayShifts = shifts.filter((s) => sameDay(s.date, d))
            const ck = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            const isOver = dropT === ck
            return (
              <div
                key={d.toISOString()}
                data-cell-date={ck}
                className={cn(
                  "relative flex min-h-24 flex-col gap-0.5 border-b border-r border-border p-1",
                  isOver && "bg-accent ring-2 ring-inset ring-primary",
                  !isOver && today && "bg-accent",
                  !isOver && !today && closed && "bg-muted",
                  !isOver && !today && !closed && "bg-background",
                )}
              >
                <div className="mb-0.5 flex items-center justify-between">
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      onDateDoubleClick?.(d)
                    }}
                    title={onDateDoubleClick ? "Double-click to open week view" : undefined}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[13px]",
                      today ? "bg-primary font-bold text-primary-foreground" : "font-medium text-foreground",
                      closed && !today && "text-muted-foreground",
                      onDateDoubleClick && "cursor-pointer",
                    )}
                  >
                    {d.getDate()}
                  </div>
                  <div className="flex items-center gap-1">
                    {closed && <span className="text-[9px] font-semibold text-muted-foreground">CLOSED</span>}
                    <button
                      type="button"
                      onClick={() => onAddShift(d, null, null)}
                      className="flex size-[18px] items-center justify-center rounded-full border-[1.5px] border-dashed border-muted-foreground bg-transparent p-0 text-muted-foreground opacity-70"
                      title="Add Shift"
                    >
                      <Plus size={8} />
                    </button>
                    {copiedShift && (
                      <button
                        type="button"
                        onClick={() => {
                          setShifts((prev) => [
                            ...prev,
                            { ...copiedShift, id: nextUid(), date: toDateISO(d) },
                          ])
                          setCopiedShift?.(null)
                        }}
                        className="flex size-[18px] items-center justify-center rounded-full border-[1.5px] border-dashed border-primary bg-transparent p-0 text-primary opacity-70"
                        title="Paste Shift"
                      >
                        <ClipboardPaste size={8} />
                      </button>
                    )}
                  </div>
                </div>
                {dayShifts.slice(0, 3).map((shift) => {
                  const category = categoryMap[shift.categoryId]
                  if (!category) return null
                  const c = getColor(category.colorIdx)
                  const isDraft = shift.status === "draft"
                  const isDrag = dragId === shift.id
                  return (
                    <div
                      key={shift.id}
                      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => onSPD(e, shift)}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        if (!dragId) onShiftClick(shift, category)
                      }}
                      className={cn(
                        "flex touch-none items-center justify-between overflow-hidden text-ellipsis whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        isDrag ? "cursor-grabbing opacity-30" : "cursor-grab opacity-100",
                      )}
                      style={{
                        background: isDraft ? "transparent" : c.bg,
                        border: isDraft ? `1.5px dashed ${c.bg}` : "none",
                        color: isDraft ? c.bg : "var(--background)",
                      }}
                    >
                      <div className="min-w-0 flex-1 overflow-hidden text-ellipsis">
                        {isDraft && "✎ "}
                        {shift.employee.split(" ")[0]} {fmt12(shift.startH)}
                      </div>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCopiedShift?.(shift)
                        }}
                        className="z-10 flex cursor-pointer items-center border-none bg-transparent px-0.5"
                        style={{ color: isDraft ? c.bg : "var(--background)" }}
                        title="Copy Shift"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  )
                })}
                {dayShifts.length > 3 && (
                  <div
                    onMouseEnter={(e) =>
                      setHoverMore({ date: d, rect: e.currentTarget.getBoundingClientRect() })
                    }
                    onMouseLeave={() => setHoverMore(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMoreShiftsDialog(d)
                    }}
                    className="cursor-pointer pl-0.5 text-[10px] text-primary underline decoration-primary underline-offset-2"
                    title="Click to view all shifts"
                  >
                    +{dayShifts.length - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {hoverMore && (() => {
          const overflowShifts = shifts.filter((s) => sameDay(s.date, hoverMore.date)).slice(3)
          return (
            <div
              className="fixed z-[9998] ml-2 max-w-[220px] rounded-lg border border-border bg-popover p-2 text-[11px] text-popover-foreground shadow-lg"
              style={{ left: hoverMore.rect.right, top: hoverMore.rect.top }}
            >
              {overflowShifts.map((s) => {
                const cat = categoryMap[s.categoryId]
                const c = cat ? getColor(cat.colorIdx) : { bg: "#666", text: "#fff" }
                return (
                  <div key={s.id} className="mb-0.5 flex justify-between gap-2 last:mb-0">
                    <span style={{ color: c.text }}>{s.employee.split(" ")[0]}</span>
                    <span className="text-muted-foreground">
                      {fmt12(s.startH)}–{fmt12(s.endH)}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
        {moreShiftsDialog && (
          <DayShiftsDialog
            date={moreShiftsDialog}
            shifts={shifts.filter((s) => sameDay(s.date, moreShiftsDialog))}
            categoryMap={categoryMap}
            onClose={() => setMoreShiftsDialog(null)}
            onShiftClick={(shift, cat) => {
              setMoreShiftsDialog(null)
              onShiftClick(shift, cat)
            }}
          />
        )}
        {gPos &&
          dragId &&
          (() => {
            const s = shifts.find((x) => x.id === dragId)
            if (!s) return null
            const c = getColor(categoryMap[s.categoryId]?.colorIdx ?? 0)
            return (
              <div
                className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold shadow-lg text-background"
                style={{ left: gPos.x + 12, top: gPos.y - 10, background: c.bg }}
              >
                {s.employee.split(" ")[0]} · {fmt12(s.startH)}–{fmt12(s.endH)}
              </div>
            )
          })()}
      </div>
      {staffPanel && (
        <StaffPanel
          category={categoryMap[staffPanel.categoryId]!}
          date={date}
          dayShifts={[]}
          onDragStaff={({ empId, categoryId, empName, pointerId }) => {
            staffDragRef.current = { empId, categoryId, empName, pointerId }
            setIsStaffDragging(true)
          }}
          anchorRect={staffPanel.anchorRect}
          onClose={() => setStaffPanel(null)}
        />
      )}
    </div>
  )
}

export const MonthView = React.memo(MonthViewInner)
