import React, { useRef, useState, useCallback, useMemo } from 'react'
import type { Block, Resource } from '@shadcn-scheduler/core'
import { isToday, DAY_NAMES, MONTHS_SHORT, getWeekDates } from '@shadcn-scheduler/core'
import { useSchedulerContext } from '@shadcn-scheduler/shell'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ListViewProps {
  shifts: Block[]
  setShifts: React.Dispatch<React.SetStateAction<Block[]>>
  onShiftClick: (block: Block, resource: Resource) => void
  onPublish: (...shiftIds: string[]) => void
  onUnpublish: (shiftId: string) => void
  onAddShift?: (date: Date, categoryId?: string | null, empId?: string | null) => void
  currentDate: Date
  view: string
}

interface DragState { id: string }
interface GhostPosition { x: number; y: number }
interface GroupedDay { date: string; shifts: Block[] }

function ListViewInner({
  shifts,
  setShifts,
  onShiftClick,
  onPublish,
  onUnpublish,
  onAddShift,
  currentDate,
  view,
}: ListViewProps): React.ReactElement {
  const { categories, getColor, labels, slots, getTimeLabel } = useSchedulerContext()
  const base = view.replace('list', '') || 'day'
  const categoryMap: Record<string, Resource> = Object.fromEntries(
    categories.map((c) => [c.id, c])
  )

  const [start, end] = useMemo((): [Date, Date] => {
    if (base === 'day') return [currentDate, currentDate]
    if (base === 'week') {
      const wd = getWeekDates(currentDate)
      return [wd[0], wd[6]]
    }
    if (base === 'month') {
      const y = currentDate.getFullYear(), m = currentDate.getMonth()
      return [new Date(y, m, 1), new Date(y, m + 1, 0)]
    }
    const y = currentDate.getFullYear()
    return [new Date(y, 0, 1), new Date(y, 11, 31)]
  }, [base, currentDate])

  const grouped = useMemo((): GroupedDay[] => {
    const inRange = shifts.filter((s) => {
      const sd = new Date(s.date + 'T12:00:00')
      const st = new Date(start); st.setHours(0, 0, 0, 0)
      const en = new Date(end); en.setHours(23, 59, 59, 999)
      return sd >= st && sd <= en
    })
    inRange.sort((a, b) => a.date.localeCompare(b.date) || a.startH - b.startH)
    const map = new Map<string, GroupedDay>()
    inRange.forEach((s) => {
      const k = s.date
      const list = map.get(k)
      if (list) list.shifts.push(s)
      else map.set(k, { date: s.date, shifts: [s] })
    })
    return Array.from(map.values())
  }, [shifts, start, end])

  const ds = useRef<DragState | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropT, setDropT] = useState<string | null>(null)
  const [gPos, setGPos] = useState<GhostPosition | null>(null)

  const onIPD = useCallback((e: React.PointerEvent<HTMLDivElement>, shift: Block): void => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    ds.current = { id: shift.id }
    setDragId(shift.id)
  }, [])

  const onPM = useCallback((e: React.PointerEvent<HTMLDivElement>): void => {
    if (!ds.current) return
    setGPos({ x: e.clientX, y: e.clientY })
    const el = document.elementFromPoint(e.clientX, e.clientY)
    setDropT(el?.closest('[data-drop-date]')?.getAttribute('data-drop-date') ?? null)
  }, [])

  const onPU = useCallback((e: React.PointerEvent<HTMLDivElement>): void => {
    if (!ds.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const dt = el?.closest('[data-drop-date]')?.getAttribute('data-drop-date')
    const id = ds.current.id
    ds.current = null; setDragId(null); setDropT(null); setGPos(null)
    if (dt) setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, date: dt } : s)))
  }, [setShifts])

  if (!grouped.length) {
    if (slots.emptyState) {
      return (
        <div className="flex flex-1 items-center justify-center">
          {slots.emptyState({ view })}
        </div>
      )
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">No {labels.shift}s in this period</p>
        {onAddShift && (
          <button
            type="button"
            onClick={() => onAddShift(currentDate)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={16} /> Add {labels.shift}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative flex-1 select-none overflow-y-auto pb-6"
      onPointerMove={onPM}
      onPointerUp={onPU}
    >
      {grouped.map(({ date, shifts: ds_ }) => {
        const drafts = ds_.filter((s) => s.status === 'draft')
        const dateStr = date.slice(0, 10)
        const dateObj = new Date(dateStr + 'T12:00:00')
        const isOT = dropT === dateStr

        return (
          <div key={date}>
            <div
              data-drop-date={dateStr}
              className={cn(
                'sticky top-0 z-[5] flex items-center justify-between border-b border-border bg-background px-5 pb-2 pt-3',
                isOT && 'ring-2 ring-inset ring-primary',
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold',
                    isToday(dateObj) ? 'bg-primary text-background' : 'bg-border text-foreground',
                  )}
                >
                  {dateObj.getDate()}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {DAY_NAMES[dateObj.getDay()]}, {MONTHS_SHORT[dateObj.getMonth()]} {dateObj.getDate()}, {dateObj.getFullYear()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {ds_.length} shift{ds_.length !== 1 ? 's' : ''}{drafts.length > 0 ? ` · ${drafts.length} draft` : ''}
                  </div>
                </div>
              </div>
              {drafts.length > 0 && (
                <button
                  type="button"
                  onClick={() => onPublish(...drafts.map((s) => s.id))}
                  className="cursor-pointer rounded-md border-none bg-accent px-2.5 py-1 text-[11px] font-bold text-primary"
                >
                  Publish all
                </button>
              )}
            </div>
            {ds_.map((shift) => {
              const category = categoryMap[shift.categoryId]
              const c = getColor(category?.colorIdx ?? 0)
              const isDraft = shift.status === 'draft'
              const isDrag = dragId === shift.id
              return (
                <div
                  key={shift.id}
                  data-drop-date={dateStr}
                  onPointerDown={(e) => onIPD(e, shift)}
                  onClick={() => { if (!dragId) onShiftClick(shift, category!) }}
                  className={cn(
                    'flex touch-none items-center border-b border-border px-5 py-2.5 transition-colors',
                    isDrag ? 'cursor-grabbing bg-accent opacity-50' : 'cursor-grab bg-background hover:bg-accent/50',
                  )}
                >
                  <div className="mr-2.5 shrink-0 text-sm text-muted-foreground">⠿</div>
                  <div
                    className="mr-3.5 h-9 w-0.5 shrink-0 rounded-sm"
                    style={{ background: c.bg, opacity: isDraft ? 0.4 : 1 }}
                  />
                  <div
                    className="mr-3 flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: isDraft ? 'transparent' : c.light,
                      border: isDraft ? `1.5px dashed ${c.bg}` : 'none',
                    }}
                  >
                    <div
                      className="size-2 rounded-full"
                      style={{ background: c.bg, opacity: isDraft ? 0.6 : 1 }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-foreground">{shift.employee}</span>
                      {isDraft && (
                        <span className="rounded px-1.5 py-px text-[9px] font-bold text-accent-foreground bg-accent">
                          DRAFT
                        </span>
                      )}
                    </div>
                    <div className="mt-px text-xs text-muted-foreground">
                      {category?.name} · {getTimeLabel(shift.date, shift.startH)} – {getTimeLabel(shift.date, shift.endH)} · {shift.endH - shift.startH}h
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (isDraft) onPublish(shift.id); else onUnpublish(shift.id) }}
                    className={cn(
                      'shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold',
                      isDraft ? 'bg-accent text-primary' : 'bg-border text-muted-foreground',
                    )}
                  >
                    {isDraft ? 'Publish' : 'Draft'}
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}
      {gPos && dragId && (() => {
        const s = shifts.find((x) => x.id === dragId)
        if (!s) return null
        const c = getColor(categoryMap[s.categoryId]?.colorIdx ?? 0)
        return (
          <div
            className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-bold shadow-lg text-background"
            style={{ left: gPos.x + 14, top: gPos.y - 12, background: c.bg }}
          >
            {s.employee} · {getTimeLabel(s.date, s.startH)}–{getTimeLabel(s.date, s.endH)}
          </div>
        )
      })()}
    </div>
  )
}

export const ListView = React.memo(ListViewInner)
