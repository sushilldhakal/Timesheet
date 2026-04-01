/**
 * KanbanView — Day / Week / Month / Year board layouts for @shadcn-scheduler.
 *
 * Day    – category columns, full-height cards with break stripe
 * Week   – category rows × day columns, compact cards, table layout (no overflow clip)
 * Month  – 7-col calendar grid, shift pills per day, drag to move, right-click menu
 * Year   – 12 mini-month calendars, click-through to month, heatmap dots
 *
 * Every card: double-click → ShiftModal · right-click → Edit/Copy/Cut/Delete
 * Every empty cell/column: right-click → Add shift · Paste (if clipboard)
 * All cards: HTML5 draggable
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Block, Resource } from '@shadcn-scheduler/core'
import {
  toDateISO, fmt12, isToday as isTodayFn,
  DOW_MON_FIRST, MONTHS_SHORT, MONTHS,
  getDIM, getFirst, sameDay,
} from '@shadcn-scheduler/core'
import { useSchedulerContext } from '@shadcn-scheduler/shell'
import {
  AddShiftModal, ShiftModal,
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator, ContextMenuLabel,
} from '@shadcn-scheduler/grid-engine'
import { Pencil, Copy, Scissors, Trash2, Plus, ClipboardPaste, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SchedulingWeatherDayBadge } from '@/components/scheduling/weather/SchedulingWeatherDayBadge'

function employerBadgeLabel(shift: Block): string {
  const m = shift.meta as { employerBadge?: string } | undefined
  const v = m?.employerBadge?.trim()
  return v || 'Own staff'
}

// ─── Public props ─────────────────────────────────────────────────────────────

export interface KanbanViewProps {
  date: Date
  shifts: Block[]
  setShifts: React.Dispatch<React.SetStateAction<Block[]>>
  onShiftClick?: (block: Block, resource: Resource) => void
  onAddShift?: (date: Date, categoryId?: string) => void
  readOnly?: boolean
  mode?: 'day' | 'week' | 'month' | 'year'
  /** Required for week mode — Mon…Sun ordered Dates */
  dates?: Date[]
  /** Called when the user drills from year → month */
  onMonthDrill?: (year: number, month: number) => void
  /** Called when the user clicks "Go to Day View" from a week column header */
  onGoToDay?: (date: Date) => void
  onBlockCreate?: (block: Block) => void
  onBlockUpdate?: (block: Block) => void
  onBlockDelete?: (shiftId: string) => void
  /** Location coordinates for Open-Meteo (location category lat/lng) */
  weatherCoords?: { lat: number; lng: number } | null
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface AddPrompt { date: Date; categoryId?: string }
interface EditTarget { shift: Block; category: Resource }
interface CellMenu { clientX: number; clientY: number; date: Date; categoryId?: string }

interface BoardState {
  shifts: Block[]
  setShifts: React.Dispatch<React.SetStateAction<Block[]>>
  readOnly?: boolean
  onBlockCreate?: (block: Block) => void
  onBlockUpdate?: (block: Block) => void
  onBlockDelete?: (shiftId: string) => void
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function getInitials(shift: Block, employees: Resource[]): string {
  const emp = employees.find((e) => e.id === shift.employeeId)
  return (
    emp?.avatar ??
    shift.employee.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  )
}

/** Display initials from a person or resource name */
function resourceInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase() || '?'
}

/** Category initials — e.g. "Bar Floating/Polishing" → "BF", "Barista" → "B" */
function getCatInitials(name: string): string {
  // Strip group prefix like "Bar Group · " if present
  const short = name.includes('·') ? name.split('·').pop()!.trim() : name
  return short.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function useConflicts(subset: Block[]): Set<string> {
  return useMemo(() => {
    const ids = new Set<string>()
    const byEmp = new Map<string, Block[]>()
    subset.forEach((s) => {
      const list = byEmp.get(s.employeeId) ?? []
      list.push(s)
      byEmp.set(s.employeeId, list)
    })
    byEmp.forEach((list) => {
      list.forEach((a, i) => {
        list.slice(i + 1).forEach((b) => {
          if (a.date === b.date && a.startH < b.endH && b.startH < a.endH) {
            ids.add(a.id); ids.add(b.id)
          }
        })
      })
    })
    return ids
  }, [subset])
}

function Av({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-[1.5px] font-extrabold tracking-wide"
      style={{
        width: size,
        height: size,
        fontSize: size <= 24 ? 8 : 10,
        background: `${color}18`,
        borderColor: `${color}40`,
        color,
      }}
    >
      {initials}
    </div>
  )
}

/** Compute proportional break position within a shift. Returns null if no break. */
function breakOverlayProps(shift: Block): { leftPct: number; widthPct: number; title: string } | null {
  if (shift.breakStartH === undefined || shift.breakEndH === undefined) return null
  const dur = shift.endH - shift.startH
  if (dur <= 0) return null
  const leftPct  = ((shift.breakStartH - shift.startH) / dur) * 100
  const widthPct = ((shift.breakEndH   - shift.breakStartH) / dur) * 100
  const mins = Math.round((shift.breakEndH - shift.breakStartH) * 60)
  return { leftPct, widthPct, title: `Break ${fmt12(shift.breakStartH)}–${fmt12(shift.breakEndH!)} (${mins}m)` }
}

// ─── Cell right-click popover (portal) ───────────────────────────────────────

function CellCtxMenu({
  menu, readOnly, clipboard, onAddShift, onPaste, onClose,
}: {
  menu: CellMenu; readOnly?: boolean; clipboard: Block | null
  onAddShift: () => void; onPaste: () => void; onClose: () => void
}) {
  useEffect(() => {
    const h = () => onClose()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('pointerdown', h)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('pointerdown', h); window.removeEventListener('keydown', esc) }
  }, [onClose])

  const content = (
    <>
      <div className="fixed inset-0 z-[99998]" onPointerDown={onClose} />
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed z-[99999] min-w-[180px] rounded-[10px] border border-border bg-popover py-1 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
        style={{ top: menu.clientY + 4, left: menu.clientX }}
      >
        {!readOnly && (
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-accent"
            onClick={() => { onAddShift(); onClose() }}
          >
            <Plus size={14} className="shrink-0 text-primary" />
            Add shift
          </button>
        )}
        {(!readOnly && clipboard) && <div className="my-1 h-px bg-border" />}
        {clipboard && (
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-accent"
            onClick={() => { onPaste(); onClose() }}
          >
            <ClipboardPaste size={14} className="shrink-0 text-primary" />
            Paste — {clipboard.employee}
          </button>
        )}
      </div>
    </>
  )
  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}

// ─── Shift card right-click (Radix) ──────────────────────────────────────────

function ShiftCtxMenu({
  shift, color, readOnly, onEdit, onCopy, onCut, onDelete, children,
}: {
  shift: Block; color: { bg: string }; readOnly?: boolean
  onEdit: () => void; onCopy: () => void; onCut: () => void; onDelete: () => void
  children: React.ReactNode
}) {
  if (readOnly) return <>{children}</>
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="contents" onContextMenu={(e) => e.stopPropagation()}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel className="font-semibold" style={{ color: color.bg }}>{shift.employee}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onEdit} className="gap-2"><Pencil size={14} className="text-muted-foreground" />Edit shift</ContextMenuItem>
        <ContextMenuItem onClick={onCopy} className="gap-2"><Copy size={14} className="text-muted-foreground" />Copy shift</ContextMenuItem>
        <ContextMenuItem onClick={onCut} className="gap-2"><Scissors size={14} className="text-muted-foreground" />Cut shift</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive"><Trash2 size={14} />Delete shift</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ─── Drop-zone wrapper ────────────────────────────────────────────────────────

function DropZone({
  dropKey, activeDropKey, color, onDragOver, onDragLeave, onDrop, onContextMenu, children, style, className,
}: {
  dropKey: string; activeDropKey: string | null; color: { bg: string }
  onDragOver: (k: string) => void; onDragLeave: () => void; onDrop: (k: string) => void
  onContextMenu?: (e: React.MouseEvent) => void
  children: React.ReactNode; style?: React.CSSProperties; className?: string
}) {
  const isOver = activeDropKey === dropKey
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(dropKey) }}
      onDragLeave={onDragLeave} onDrop={(e) => { e.preventDefault(); onDrop(dropKey) }}
      onContextMenu={onContextMenu}
      className={cn('transition-[background,outline] duration-75', className)}
      style={{
        ...style,
        background: isOver ? `color-mix(in srgb, ${color.bg} 10%, var(--background))` : (style?.background ?? 'transparent'),
        outline: isOver ? `2px dashed ${color.bg}60` : undefined,
        outlineOffset: isOver ? -2 : undefined,
      }}
    >
      {children}
    </div>
  )
}

// ─── Day-view full card ───────────────────────────────────────────────────────
// The card IS the colored block — same as the grid's shift block.
// Break overlay: position:absolute; top:0; height:100% spanning the full card,
// identical CSS to the GridView break div.

function DayCard({
  shift, color, conflictIds, nowH, iso, dragShiftId, onDoubleClick, onDragStart, onDragEnd,
}: {
  shift: Block; color: { bg: string; text: string }; conflictIds: Set<string>
  nowH: number; iso: string; dragShiftId: string | null
  onDoubleClick: () => void; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
}) {
  const { employees } = useSchedulerContext()
  const isDraft = shift.status === 'draft'
  const hasConflict = conflictIds.has(shift.id)
  const isLive = iso === toDateISO(new Date()) && nowH >= shift.startH && nowH < shift.endH
  const dur = shift.endH - shift.startH
  const hrs = dur % 1 === 0 ? `${dur}h` : `${dur.toFixed(1)}h`
  const initials = getInitials(shift, employees)
  const beingDragged = dragShiftId === shift.id
  const brk = breakOverlayProps(shift)

  return (
    <div
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onDoubleClick={onDoubleClick}
      title="Double-click to edit · Right-click for options"
      className={cn(
        "relative min-h-20 select-none overflow-hidden rounded-[10px] px-[13px] py-[11px] transition-[box-shadow,transform,opacity] duration-100",
        isDraft && "bg-background",
        beingDragged ? "cursor-grabbing opacity-35 shadow-none" : "cursor-grab opacity-100 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      )}
      style={{
        background: isDraft ? undefined : color.bg,
        border: isDraft
          ? `1px dashed ${hasConflict ? 'var(--destructive)' : color.bg}`
          : `1px solid ${hasConflict ? 'var(--destructive)' : 'transparent'}`,
      }}
      onMouseEnter={(e) => { if (beingDragged) return; const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)'; el.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = beingDragged ? 'none' : '0 1px 4px rgba(0,0,0,0.08)'; el.style.transform = '' }}
    >
      {/* Left accent strip — 4px darker overlay, exactly like the grid */}
      {!isDraft && <div className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-1 bg-black/18" />}

      {/* Break overlay — same div as GridView: position:absolute; top:0; height:100% */}
      {brk && (
        <div
          title={brk.title}
          className="pointer-events-none absolute top-0 z-[2] h-full border-l border-r border-dashed border-white/35 bg-black/15"
          style={{ left: `${brk.leftPct}%`, width: `${brk.widthPct}%` }}
        />
      )}

      {/* Content — z-index:3 so it sits above the break overlay */}
      <div className="relative z-[3]">
        {/* Avatar + name + badges */}
        <div className="mb-[7px] flex items-center gap-2">
          <Av initials={initials} color={isDraft ? color.bg : 'rgba(255,255,255,0.95)'} size={30} />
          <span className={cn("min-w-0 flex-1 truncate text-[13px] font-bold", isDraft ? "text-foreground" : "text-white/[0.97]")}>{shift.employee}</span>
          {hasConflict && <span className="shrink-0 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">⚡ Conflict</span>}
          {!hasConflict && isLive && <span className="shrink-0 rounded-full bg-white/22 px-1.5 py-0.5 text-[9px] font-bold text-white/95">● Live</span>}
          {!hasConflict && !isLive && isDraft && <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Draft</span>}
        </div>

        {/* Time + hours */}
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs font-medium", isDraft ? "text-muted-foreground" : "text-white/80")}>{fmt12(shift.startH)} – {fmt12(shift.endH)}</span>
          <span
            className={cn(
              "ml-auto rounded-full px-[7px] py-0.5 text-[10px] font-bold",
              isDraft ? "" : "bg-black/18 text-white/90"
            )}
            style={isDraft ? { background: `${color.bg}14`, color: color.bg } : undefined}
          >
            {hrs}
          </span>
        </div>

        {/* Break label — text only, the visual is the overlay above */}
        {brk && (
          <div className={cn("mt-[5px] flex items-center gap-1 text-[10px]", isDraft ? "text-muted-foreground" : "text-white/72")}>
            ☕ {fmt12(shift.breakStartH!)} – {fmt12(shift.breakEndH!)}
          </div>
        )}
        <div className={cn("mt-1.5 truncate text-[10px] font-semibold", isDraft ? "text-muted-foreground" : "text-white/78")}>
          {employerBadgeLabel(shift)}
        </div>
      </div>
    </div>
  )
}

// ─── Week-view compact card ───────────────────────────────────────────────────
// Matches the screenshot: white card · colored square badge · time · name
// Break overlay: position:absolute; top:0; height:100% (same as GridView)

const TOOLTIP_DELAY = 200
const TOOLTIP_LEAVE = 120

function WeekCard({
  shift, color, catInitials, catName, conflictIds, nowH, iso, dragShiftId, onDoubleClick, onDragStart, onDragEnd,
}: {
  shift: Block; color: { bg: string; text: string }; catInitials: string; catName: string
  conflictIds: Set<string>; nowH: number; iso: string; dragShiftId: string | null
  onDoubleClick: () => void; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
}) {
  const isDraft = shift.status === 'draft'
  const hasConflict = conflictIds.has(shift.id)
  const isLive = iso === toDateISO(new Date()) && nowH >= shift.startH && nowH < shift.endH
  const beingDragged = dragShiftId === shift.id
  const brk = breakOverlayProps(shift)
  const dur = shift.endH - shift.startH
  const hrs = dur % 1 === 0 ? `${dur}h` : `${dur.toFixed(1)}h`

  const cardRef = useRef<HTMLDivElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = () => {
    if (beingDragged) return
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    enterTimer.current = setTimeout(() => setShowTooltip(true), TOOLTIP_DELAY)
  }
  const handleLeave = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    leaveTimer.current = setTimeout(() => setShowTooltip(false), TOOLTIP_LEAVE)
  }

  // Tooltip position — same logic as GridView
  const tooltipPortal = showTooltip && cardRef.current ? (() => {
    const r = cardRef.current!.getBoundingClientRect()
    const showBelow = r.top < 140
    const popTop = showBelow ? r.bottom + 8 : r.top - 8
    const popLeft = Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120)
    return createPortal(
      <div
        onPointerEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }}
        onPointerLeave={handleLeave}
        className="fixed z-[99999] min-w-[190px] max-w-[280px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-border bg-popover px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
        style={{
          top: showBelow ? popTop : undefined,
          bottom: showBelow ? undefined : window.innerHeight - popTop,
          left: popLeft,
        }}
      >
        {/* Employee + colored dot */}
        <div className="mb-1 flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full" style={{ background: color.bg }} />
          <span className="text-[13px] font-bold text-foreground">{shift.employee}</span>
        </div>
        {/* Category name */}
        <div className="mb-1 text-[11px] font-semibold" style={{ color: color.bg }}>{catName}</div>
        <div className="mb-1 truncate text-[10px] text-muted-foreground">
          {employerBadgeLabel(shift)}
        </div>
        {/* Time + duration */}
        <div className="text-[11px] font-semibold text-foreground">
          {fmt12(shift.startH)} – {fmt12(shift.endH)}
          <span className="ml-1.5 font-normal text-muted-foreground">{hrs}</span>
        </div>
        {/* Break */}
        {brk && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            Break: {fmt12(shift.breakStartH!)}–{fmt12(shift.breakEndH!)}
          </div>
        )}
        {/* Conflict */}
        {hasConflict && (
          <div className="mt-2 rounded-md bg-destructive px-2 py-1 text-[10px] font-semibold text-destructive-foreground">
            ⚡ Shift conflict — cannot publish
          </div>
        )}
        {/* Draft */}
        {isDraft && !hasConflict && (
          <div className="mt-1 text-[10px] text-muted-foreground">Draft — not published</div>
        )}
      </div>,
      document.body
    )
  })() : null

  return (
    <>
      <div
        ref={cardRef}
        draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onDoubleClick={onDoubleClick}
        onPointerEnter={handleEnter} onPointerLeave={handleLeave}
        className={cn(
          "relative box-border flex h-[42px] min-h-[42px] max-h-[42px] shrink-0 select-none overflow-hidden rounded-md py-0 pl-1 pr-1 transition-[opacity,box-shadow] duration-100",
          isDraft ? "bg-muted/40" : "bg-muted/30",
          beingDragged ? "cursor-grabbing opacity-35" : "cursor-grab opacity-100"
        )}
        style={{
          border: hasConflict
            ? '1.5px solid var(--destructive)'
            : isDraft
              ? `1.5px dashed ${color.bg}`
              : '1px solid color-mix(in srgb, var(--border) 85%, transparent)',
          boxShadow: '0 1px 0 color-mix(in srgb, var(--foreground) 6%, transparent)',
        }}
        onMouseEnter={(e) => { if (!beingDragged) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)' }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 1px 0 color-mix(in srgb, var(--foreground) 6%, transparent)'
        }}
      >
        {/* Break overlay */}
        {brk && (
          <div
            className="pointer-events-none absolute top-0 z-[2] h-full border-l border-r border-dashed border-black/20 bg-black/[0.07]"
            style={{ left: `${brk.leftPct}%`, width: `${brk.widthPct}%` }}
          />
        )}

        {/* Status dot */}
        {(isLive || !isDraft) && (
          <div
            className="absolute top-1 right-1 z-[3] size-1.5 rounded-full"
            style={{
              background: hasConflict
                ? 'var(--destructive)'
                : isLive
                  ? '#22c55e'
                  : `${color.bg}80`,
            }}
          />
        )}

        {/* Content — 42px row: badge + time line + name (employer in tooltip) */}
        <div className="relative z-[3] flex h-full items-center gap-1.5">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-extrabold tracking-wide text-white/95"
            style={{ background: color.bg }}
          >
            {catInitials}
          </div>
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-1 leading-none">
              <span className={cn("whitespace-nowrap text-[11px] font-bold leading-tight", hasConflict ? "text-destructive" : "text-foreground")}>{fmt12(shift.startH)}</span>
              <span className="whitespace-nowrap text-[11px] font-bold leading-tight text-muted-foreground">{fmt12(shift.endH)}</span>
              {isDraft && <span className="ml-0.5 text-[8px] leading-none" style={{ color: color.bg }}>▶</span>}
              {brk && <span className="ml-px text-[9px] text-muted-foreground">☕</span>}
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-muted-foreground">
              {shift.employee}
            </div>
          </div>
        </div>
      </div>
      {tooltipPortal}
    </>
  )
}

// ─── Day-view layout ─────────────────────────────────────────────────────────

/** Faint horizontal guides every 31px; shift cards are 42px with 11px overlap (reference week board). */
const KANBAN_GRID_ROW_PX = 31
const KANBAN_SHIFT_H_PX = 42

const kanbanColumnGridStyle: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(
    to bottom,
    transparent,
    transparent ${KANBAN_GRID_ROW_PX - 1}px,
    color-mix(in srgb, var(--border) 72%, transparent) ${KANBAN_GRID_ROW_PX - 1}px,
    color-mix(in srgb, var(--border) 72%, transparent) ${KANBAN_GRID_ROW_PX}px
  )`,
}

function DayLayout({ date, shifts, setShifts, readOnly, onBlockCreate, onBlockUpdate, onBlockDelete }: { date: Date } & BoardState) {
  const { categories, getColor, nextUid } = useSchedulerContext()
  const iso = toDateISO(date)
  const nowH = new Date().getHours() + new Date().getMinutes() / 60
  const dayShifts = useMemo(() => shifts.filter((s) => s.date === iso), [shifts, iso])
  const conflictIds = useConflicts(dayShifts)

  const [addPrompt, setAddPrompt] = useState<AddPrompt | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [clipboard, setClipboard] = useState<Block | null>(null)
  const [cellMenu, setCellMenu] = useState<CellMenu | null>(null)
  const dragRef = useRef<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)

  const del = (id: string) => { setShifts((p) => p.filter((s) => s.id !== id)); onBlockDelete?.(id) }
  const cut = (s: Block) => { setClipboard(s); del(s.id) }
  const paste = (d: Date, catId: string) => {
    if (!clipboard) return
    const b: Block = { ...clipboard, id: nextUid(), categoryId: catId, date: toDateISO(d), status: 'draft' }
    setShifts((p) => [...p, b]); onBlockCreate?.(b); setClipboard(null)
  }

  return (
    <>
    <div className="box-border flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex min-h-0 min-w-0 flex-1 divide-x divide-border overflow-x-auto overflow-y-hidden">
      {categories.map((cat) => {
        const c = getColor(cat.colorIdx)
        const catShifts = dayShifts.filter((s) => s.categoryId === cat.id).sort((a, b) => a.startH - b.startH)
        const totalH = catShifts.reduce((acc, s) => acc + (s.endH - s.startH), 0)
        const draftN = catShifts.filter((s) => s.status === 'draft').length
        const pubN = catShifts.filter((s) => s.status === 'published').length
        return (
          <div key={cat.id} className="flex max-h-full w-[250px] min-w-[250px] shrink-0 flex-col overflow-hidden bg-background first:rounded-l-md last:rounded-r-md">
            <div
              className="shrink-0 border-b border-border px-3.5 pb-2.5 pt-3 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--border)_80%,transparent)]"
              style={{ borderTop: `3px solid ${c.bg}`, background: `${c.bg}07` }}
            >
              <div className="flex items-center gap-[7px]">
                <div className="size-2 shrink-0 rounded-full" style={{ background: c.bg }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">{cat.name}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ color: c.bg, background: `${c.bg}20` }}
                >
                  {catShifts.length}
                </span>
              </div>
              <div className="mt-[5px] flex gap-2 text-[10px] text-muted-foreground">
                <span>{totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h</span>
                {pubN > 0 && <span className="font-semibold" style={{ color: c.bg }}>· {pubN} pub</span>}
                {draftN > 0 && <span className="font-semibold">· {draftN} draft</span>}
              </div>
            </div>

            <DropZone dropKey={cat.id} activeDropKey={dropKey} color={c}
              onDragOver={setDropKey} onDragLeave={() => setDropKey(null)}
              onDrop={(k) => { const id = dragRef.current; if (!id) return; setShifts((p) => p.map((s) => s.id === id ? { ...s, categoryId: k } : s)); dragRef.current = null; setDragId(null); setDropKey(null) }}
              onContextMenu={(e) => { if (readOnly && !clipboard) return; e.preventDefault(); setCellMenu({ clientX: e.clientX, clientY: e.clientY, date, categoryId: cat.id }) }}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2"
            >
              {catShifts.length === 0 && (
                <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-7 text-center text-[11px] text-muted-foreground">No shifts — right-click to add</div>
              )}
              <div
                className={cn(
                  "flex flex-col rounded-[2px]",
                  catShifts.length > 0 && "[&>*]:-mb-[11px] [&>*:last-child]:mb-0"
                )}
                style={kanbanColumnGridStyle}
              >
              {catShifts.map((shift) => (
                <ShiftCtxMenu key={shift.id} shift={shift} color={c} readOnly={readOnly}
                  onEdit={() => setEditTarget({ shift, category: cat })}
                  onCopy={() => setClipboard(shift)} onCut={() => cut(shift)} onDelete={() => del(shift.id)}
                >
                  <WeekCard shift={shift} color={c} catInitials={getCatInitials(cat.name)} catName={cat.name} conflictIds={conflictIds} nowH={nowH} iso={iso} dragShiftId={dragId}
                    onDoubleClick={() => setEditTarget({ shift, category: cat })}
                    onDragStart={(e) => { dragRef.current = shift.id; setDragId(shift.id); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => { dragRef.current = null; setDragId(null); setDropKey(null) }}
                  />
                </ShiftCtxMenu>
              ))}
              </div>
            </DropZone>

            {!readOnly && (
              <div className="shrink-0 px-2 pb-2">
                <button
                  type="button"
                  onClick={() => setAddPrompt({ date, categoryId: cat.id })}
                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-3 py-2 text-xs font-semibold transition-colors"
                  style={{
                    color: c.bg,
                    borderColor: `${c.bg}35`,
                    background: `${c.bg}04`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${c.bg}10` }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${c.bg}04` }}
                >
                  <span className="text-base leading-none">+</span> Add shift
                </button>
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>

    {cellMenu && <CellCtxMenu menu={cellMenu} readOnly={readOnly} clipboard={clipboard} onAddShift={() => setAddPrompt({ date: cellMenu.date, categoryId: cellMenu.categoryId })} onPaste={() => paste(cellMenu.date, cellMenu.categoryId!)} onClose={() => setCellMenu(null)} />}
    {addPrompt && <AddShiftModal date={addPrompt.date} categoryId={addPrompt.categoryId} onAdd={(b) => { setShifts((p) => [...p, b]); onBlockCreate?.(b) }} onClose={() => setAddPrompt(null)} />}
    {editTarget && (
      <ShiftModal shift={editTarget.shift} category={editTarget.category} allShifts={shifts} onClose={() => setEditTarget(null)}
        onPublish={(id) => setShifts((p) => p.map((s) => s.id === id ? { ...s, status: 'published' as const } : s))}
        onUnpublish={(id) => setShifts((p) => p.map((s) => s.id === id ? { ...s, status: 'draft' as const } : s))}
        onDelete={(id) => { del(id); setEditTarget(null) }}
        onUpdate={(u) => { setShifts((p) => p.map((s) => s.id === u.id ? u : s)); onBlockUpdate?.(u) }}
      />
    )}
    </>
  )
}

// ─── Week-view layout ─────────────────────────────────────────────────────────

const CAT_W = 180

function WeekLayout({ dates, shifts, setShifts, readOnly, onBlockCreate, onBlockUpdate, onBlockDelete, onGoToDay, weatherCoords }: { dates: Date[]; onGoToDay?: (date: Date) => void; weatherCoords?: { lat: number; lng: number } | null } & BoardState) {
  const { categories, employees, getColor, nextUid } = useSchedulerContext()
  const nowH = new Date().getHours() + new Date().getMinutes() / 60

  /** Same grouping as UserSelect: employees whose primary category matches each role row */
  const employeesByCategory = useMemo(() => {
    const m = new Map<string, Resource[]>()
    for (const e of employees) {
      const cid = e.categoryId
      if (!cid) continue
      const list = m.get(cid) ?? []
      list.push(e)
      m.set(cid, list)
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return m
  }, [employees])

  const idx = useMemo(() => {
    const m = new Map<string, Block[]>()
    for (const s of shifts) { const k = `${s.categoryId}:${s.date}`; const l = m.get(k) ?? []; l.push(s); m.set(k, l) }
    return m
  }, [shifts])

  const weekShifts = useMemo(() => shifts.filter((s) => dates.some((d) => toDateISO(d) === s.date)), [shifts, dates])
  const conflictIds = useConflicts(weekShifts)

  const [addPrompt, setAddPrompt] = useState<AddPrompt | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [clipboard, setClipboard] = useState<Block | null>(null)
  const [cellMenu, setCellMenu] = useState<CellMenu | null>(null)
  const dragRef = useRef<string | null>(null)
  /** Dragging a person from the left roster onto a day cell creates a draft shift */
  const rosterDragRef = useRef<{ employeeId: string; categoryId: string; name: string } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [dayPopover, setDayPopover] = useState<{ date: Date; rect: DOMRect } | null>(null)

  const handleWeekCellDrop = useCallback(
    (cellKey: string) => {
      const roster = rosterDragRef.current
      if (roster) {
        const [nc, nd] = cellKey.split(':') as [string, string]
        if (nc !== roster.categoryId) {
          rosterDragRef.current = null
          setDragId(null)
          setDropKey(null)
          return
        }
        const block: Block = {
          id: nextUid(),
          categoryId: nc,
          employeeId: roster.employeeId,
          date: nd,
          startH: 9,
          endH: 17,
          employee: roster.name,
          status: 'draft',
        }
        setShifts((p) => [...p, block])
        onBlockCreate?.(block)
        rosterDragRef.current = null
        setDragId(null)
        setDropKey(null)
        return
      }
      const id = dragRef.current
      if (!id) return
      const [nc, nd] = cellKey.split(':') as [string, string]
      setShifts((p) => p.map((s) => (s.id === id ? { ...s, categoryId: nc, date: nd } : s)))
      dragRef.current = null
      setDragId(null)
      setDropKey(null)
    },
    [nextUid, onBlockCreate, setShifts],
  )

  const toggleCat = (catId: string) =>
    setCollapsedCats((prev) => { const n = new Set(prev); n.has(catId) ? n.delete(catId) : n.add(catId); return n })

  const del = (id: string) => { setShifts((p) => p.filter((s) => s.id !== id)); onBlockDelete?.(id) }
  const cut = (s: Block) => { setClipboard(s); del(s.id) }
  const paste = (d: Date, catId: string) => {
    if (!clipboard) return
    const b: Block = { ...clipboard, id: nextUid(), categoryId: catId, date: toDateISO(d), status: 'draft' }
    setShifts((p) => [...p, b]); onBlockCreate?.(b); setClipboard(null)
  }

  return (
    <div className="box-border h-full min-h-0 overflow-visible rounded-lg border border-border bg-background">
      <div className="sticky top-16 z-30 border-b border-border bg-background shadow-[0_1px_0_0_var(--border)]">
        <div
          className="grid"
          style={{
            minWidth: CAT_W + dates.length * 140,
            gridTemplateColumns: `${CAT_W}px repeat(${dates.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="border-r border-border px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Category
          </div>
          {dates.map((d, i) => {
            const today = isTodayFn(d); const iso = toDateISO(d)
            const dayShifts = weekShifts.filter((s) => s.date === iso)
            const dayH = dayShifts.reduce((a, s) => a + (s.endH - s.startH), 0)
            return (
              <div
                key={i}
                onClick={(e) => setDayPopover({ date: d, rect: (e.currentTarget as HTMLDivElement).getBoundingClientRect() })}
                className={cn(
                  'cursor-pointer select-none px-2.5 py-2',
                  i < dates.length - 1 && 'border-r border-border',
                  today ? 'bg-primary/15' : 'bg-background'
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  <div className={cn('whitespace-nowrap text-xs font-bold', today ? 'text-primary' : 'text-foreground')}>
                    {DOW_MON_FIRST[(d.getDay() + 6) % 7]}{' '}
                    <span
                      className={cn(
                        'inline-flex size-[22px] items-center justify-center rounded-full text-xs',
                        today ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground'
                      )}
                    >
                      {d.getDate()}
                    </span>{' '}
                    {MONTHS_SHORT[d.getMonth()]}
                  </div>
                  <span
                    className="inline-flex shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <SchedulingWeatherDayBadge
                      date={d}
                      coords={weatherCoords ?? null}
                      rangeStart={dates[0]}
                      rangeEnd={dates[dates.length - 1]}
                    />
                  </span>
                </div>
                {dayH > 0 && <div className="mt-0.5 text-[10px] text-muted-foreground">{dayH % 1 === 0 ? dayH : dayH.toFixed(1)}h</div>}
              </div>
            )
          })}
        </div>
      </div>
      <div
        className="table w-full border-collapse"
        style={{ tableLayout: 'fixed', minWidth: CAT_W + dates.length * 140 }}
      >

        {/* Rows — each is an accordion; click label to collapse/expand */}
        {categories.map((cat, ci) => {
          const c = getColor(cat.colorIdx)
          const catW = weekShifts.filter((s) => s.categoryId === cat.id)
          const roster = employeesByCategory.get(cat.id) ?? []
          const totalH = catW.reduce((a, s) => a + (s.endH - s.startH), 0)
          const uniqueEmployees = new Set(catW.map((s) => s.employee)).size
          const draftN = catW.filter((s) => s.status === 'draft').length
          const isCollapsed = collapsedCats.has(cat.id)
          const borderB = ci < categories.length - 1 ? '1px solid var(--border)' : undefined
          return (
            <div key={cat.id} className="table-row">
              {/* Accordion label — click to collapse / expand */}
              <div
                onClick={() => toggleCat(cat.id)}
                className={cn(
                  "table-cell cursor-pointer select-none border-r border-border align-middle shadow-[inset_0_-1px_0_0_var(--border)]",
                  isCollapsed ? "px-2.5 py-1.5" : "p-2.5"
                )}
                style={{
                  width: CAT_W,
                  minWidth: CAT_W,
                  borderBottom: borderB,
                  borderLeft: `3px solid ${c.bg}`,
                  background: `${c.bg}06`,
                }}
              >
                {/* Row 1: colored square + name + chevron */}
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 shrink-0 rounded-sm" style={{ background: c.bg }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-foreground">{cat.name}</span>
                  {/* Chevron rotates when expanded */}
                  <span
                    className={cn(
                      "inline-block shrink-0 text-[10px] text-muted-foreground transition-transform duration-150",
                      isCollapsed ? "rotate-0" : "rotate-90"
                    )}
                  >
                    ›
                  </span>
                </div>
                {/* Stats row — hidden when collapsed */}
                {!isCollapsed && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="font-bold text-foreground">{catW.length}</span>
                    {uniqueEmployees > 0 && <><span>👥</span><span>{uniqueEmployees}</span></>}
                    {draftN > 0 && <><span className="text-[11px]">□</span><span>{draftN}</span></>}
                    {totalH > 0 && <><span>{totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h</span><span>⏱</span></>}
                  </div>
                )}
                {/* Roster — draggable onto week day cells (creates draft 9–17 shift) */}
                {!isCollapsed && roster.length > 0 && (
                  <div
                    className="mt-2 space-y-1 rounded-md border border-border/60 bg-background/40 p-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {roster.map((emp) => {
                      const ini = resourceInitialsFromName(emp.name)
                      return (
                        <div
                          key={emp.id}
                          draggable={!readOnly}
                          title={
                            readOnly
                              ? emp.name
                              : `${emp.name} — drag onto a day to add a draft shift (9am–5pm)`
                          }
                          onDragStart={(e) => {
                            if (readOnly) return
                            e.dataTransfer.effectAllowed = 'copy'
                            e.dataTransfer.setData('text/plain', `employee:${emp.id}`)
                            rosterDragRef.current = {
                              employeeId: emp.id,
                              categoryId: cat.id,
                              name: emp.name,
                            }
                            dragRef.current = null
                            setDragId(`__roster__${emp.id}`)
                            setDropKey(null)
                          }}
                          onDragEnd={() => {
                            rosterDragRef.current = null
                            setDragId(null)
                            setDropKey(null)
                          }}
                          className={cn(
                            'group flex items-center gap-1 rounded-md border px-1 py-0.5 transition-[background,border-color,box-shadow]',
                            readOnly
                              ? 'cursor-default border-transparent'
                              : 'cursor-grab border-transparent bg-muted/30 active:cursor-grabbing hover:border-border hover:bg-muted/70 hover:shadow-sm',
                            dragId === `__roster__${emp.id}` && 'opacity-40 ring-1 ring-primary/30',
                          )}
                        >
                          {!readOnly && (
                            <GripVertical
                              className="size-3 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground"
                              aria-hidden
                            />
                          )}
                          <Av initials={ini} color={c.bg} size={20} />
                          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight text-foreground">
                            {emp.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {dates.map((d, di) => {
                const iso = toDateISO(d); const today = isTodayFn(d)
                const cellKey = `${cat.id}:${iso}`
                const cellShifts = (idx.get(cellKey) ?? []).sort((a, b) => a.startH - b.startH)
                const todayBg = today ? 'color-mix(in srgb, var(--primary) 3%, var(--background))' : 'var(--background)'
                /* When collapsed: render just a thin strip, no content */
                if (isCollapsed) {
                  return (
                    <div
                      key={di}
                      className={cn(
                        "table-cell border-b border-border py-1.5",
                        di < dates.length - 1 && "border-r border-border"
                      )}
                      style={{ borderBottom: borderB, background: todayBg }}
                    />
                  )
                }
                return (
                  <DropZone key={di} dropKey={cellKey} activeDropKey={dropKey} color={c}
                    onDragOver={setDropKey} onDragLeave={() => setDropKey(null)}
                    onDrop={handleWeekCellDrop}
                    onContextMenu={(e) => { if (readOnly && !clipboard) return; e.preventDefault(); setCellMenu({ clientX: e.clientX, clientY: e.clientY, date: d, categoryId: cat.id }) }}
                    className={cn(
                      "table-cell align-top border-b border-border px-1.5 py-1",
                      di < dates.length - 1 && "border-r border-border"
                    )}
                    style={{ borderBottom: borderB, background: todayBg }}
                  >
                    <div
                      className={cn(
                        "flex min-h-[8px] flex-col rounded-[2px]",
                        cellShifts.length > 0 && "[&>*]:-mb-[11px] [&>*:last-child]:mb-0"
                      )}
                      style={kanbanColumnGridStyle}
                    >
                      {cellShifts.map((shift) => (
                        <ShiftCtxMenu key={shift.id} shift={shift} color={c} readOnly={readOnly}
                          onEdit={() => setEditTarget({ shift, category: cat })}
                          onCopy={() => setClipboard(shift)} onCut={() => cut(shift)} onDelete={() => del(shift.id)}
                        >
                          <WeekCard shift={shift} color={c} catInitials={getCatInitials(cat.name)} catName={cat.name} conflictIds={conflictIds} nowH={nowH} iso={iso} dragShiftId={dragId}
                            onDoubleClick={() => setEditTarget({ shift, category: cat })}
                            onDragStart={(e) => {
                              rosterDragRef.current = null
                              dragRef.current = shift.id
                              setDragId(shift.id)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => { dragRef.current = null; setDragId(null); setDropKey(null) }}
                          />
                        </ShiftCtxMenu>
                      ))}
                      {cellShifts.length === 0 && !readOnly && (
                        <div
                          title="Right-click to add a shift"
                          className="rounded border border-dashed border-transparent transition-all duration-100"
                          style={{ minHeight: KANBAN_GRID_ROW_PX, height: 4 }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLDivElement
                            el.style.borderColor = `${c.bg}40`
                            el.style.background = `${c.bg}08`
                            el.style.height = `${KANBAN_SHIFT_H_PX}px`
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement
                            el.style.borderColor = 'transparent'
                            el.style.background = 'transparent'
                            el.style.height = '4px'
                          }}
                        />
                      )}
                    </div>
                  </DropZone>
                )
              })}
            </div>
          )
        })}
      </div>

      {cellMenu && <CellCtxMenu menu={cellMenu} readOnly={readOnly} clipboard={clipboard} onAddShift={() => setAddPrompt({ date: cellMenu.date, categoryId: cellMenu.categoryId })} onPaste={() => paste(cellMenu.date, cellMenu.categoryId!)} onClose={() => setCellMenu(null)} />}
      {addPrompt && <AddShiftModal date={addPrompt.date} categoryId={addPrompt.categoryId} onAdd={(b) => { setShifts((p) => [...p, b]); onBlockCreate?.(b) }} onClose={() => setAddPrompt(null)} />}
      {editTarget && (
        <ShiftModal shift={editTarget.shift} category={editTarget.category} allShifts={shifts} onClose={() => setEditTarget(null)}
          onPublish={(id) => setShifts((p) => p.map((s) => s.id === id ? { ...s, status: 'published' as const } : s))}
          onUnpublish={(id) => setShifts((p) => p.map((s) => s.id === id ? { ...s, status: 'draft' as const } : s))}
          onDelete={(id) => { del(id); setEditTarget(null) }}
          onUpdate={(u) => { setShifts((p) => p.map((s) => s.id === u.id ? u : s)); onBlockUpdate?.(u) }}
        />
      )}

      {/* Day header click popover — "Go to Day View" */}
      {dayPopover && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setDayPopover(null)} />
          <div
            className="fixed z-[9999] min-w-[200px] max-w-[240px] -translate-x-1/2 rounded-[10px] border border-border bg-popover px-3.5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
            style={{
              top: dayPopover.rect.bottom + 6,
              left: Math.min(dayPopover.rect.left + dayPopover.rect.width / 2, window.innerWidth - 220),
            }}
          >
            <button type="button" onClick={() => setDayPopover(null)} className="absolute top-2 right-2 cursor-pointer border-none bg-transparent p-0.5 text-sm leading-none text-muted-foreground">✕</button>
            <button
              type="button"
              onClick={() => { onGoToDay?.(dayPopover.date); setDayPopover(null) }}
              className="mb-1.5 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-bold text-foreground"
            >
              <span className="text-sm">→</span> Open day view
            </button>
            <div className="text-[11px] leading-snug text-muted-foreground">
              Opens the day panel with full drag and resize for this date.
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ─── Month-view layout ────────────────────────────────────────────────────────

function MonthLayout({ date, shifts, setShifts, readOnly, onBlockCreate, onBlockUpdate, onBlockDelete }: { date: Date } & BoardState) {
  const { categories, getColor, nextUid } = useSchedulerContext()
  const y = date.getFullYear(); const m = date.getMonth()
  const daysInMonth = getDIM(y, m)
  const firstDay = getFirst(y, m)

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d))

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const [addPrompt, setAddPrompt] = useState<AddPrompt | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [clipboard, setClipboard] = useState<Block | null>(null)
  const [cellMenu, setCellMenu] = useState<CellMenu | null>(null)
  const dragRef = useRef<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropISO, setDropISO] = useState<string | null>(null)

  const del = (id: string) => { setShifts((p) => p.filter((s) => s.id !== id)); onBlockDelete?.(id) }
  const cut = (s: Block) => { setClipboard(s); del(s.id) }
  const paste = (d: Date) => {
    if (!clipboard) return
    const b: Block = { ...clipboard, id: nextUid(), date: toDateISO(d), status: 'draft' }
    setShifts((p) => [...p, b]); onBlockCreate?.(b); setClipboard(null)
  }

  const getDateFromEl = useCallback((cx: number, cy: number): string | null => {
    const el = document.elementFromPoint(cx, cy)
    return el?.closest('[data-month-cell]')?.getAttribute('data-month-cell') ?? null
  }, [])

  useEffect(() => {
    if (!dragId) return
    const onUp = (e: PointerEvent) => {
      const iso = getDateFromEl(e.clientX, e.clientY)
      if (iso && dragRef.current) {
        setShifts((p) => p.map((s) => s.id === dragRef.current ? { ...s, date: iso } : s))
      }
      dragRef.current = null; setDragId(null); setDropISO(null)
    }
    const onMove = (e: PointerEvent) => setDropISO(getDateFromEl(e.clientX, e.clientY))
    document.addEventListener('pointerup', onUp, { capture: true })
    document.addEventListener('pointermove', onMove, { capture: true })
    return () => { document.removeEventListener('pointerup', onUp, { capture: true }); document.removeEventListener('pointermove', onMove, { capture: true }) }
  }, [dragId, getDateFromEl, setShifts])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid shrink-0 grid-cols-7 border-b-2 border-border">
        {DOW_MON_FIRST.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(100px,1fr)] grid-cols-7 overflow-y-auto">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="border-b border-r border-border bg-muted" />
          const today = isTodayFn(d)
          const iso = toDateISO(d)
          const isOver = dropISO === iso
          const dayShifts = shifts.filter((s) => sameDay(s.date, d))

          return (
            <div
              key={iso}
              data-month-cell={iso}
              onContextMenu={(e) => { if (readOnly && !clipboard) return; e.preventDefault(); setCellMenu({ clientX: e.clientX, clientY: e.clientY, date: d }) }}
              className={cn(
                "relative flex flex-col gap-0.5 border-b border-r border-border p-1 px-1",
                isOver && "bg-accent outline outline-2 -outline-offset-2 outline-primary",
                !isOver && today && "bg-primary/6",
                !isOver && !today && "bg-background"
              )}
            >
              {/* Day number + buttons */}
              <div className="mb-0.5 flex items-center justify-between">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[13px]",
                    today ? "bg-primary font-bold text-primary-foreground" : "bg-transparent font-medium text-foreground"
                  )}
                >
                  {d.getDate()}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setAddPrompt({ date: d })} className="flex size-[18px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-dashed border-muted-foreground bg-transparent p-0 text-muted-foreground" title="Add shift"><Plus size={8} /></button>
                    {clipboard && <button type="button" onClick={() => paste(d)} className="flex size-[18px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-dashed border-primary bg-transparent p-0 text-primary" title="Paste shift"><ClipboardPaste size={8} /></button>}
                  </div>
                )}
              </div>

              {/* Shift pills — up to 3, then "+N more" */}
              {dayShifts.slice(0, 3).map((shift) => {
                const cat = catMap[shift.categoryId]
                if (!cat) return null
                const c = getColor(cat.colorIdx)
                const isDraft = shift.status === 'draft'
                return (
                  <ShiftCtxMenu key={shift.id} shift={shift} color={c} readOnly={readOnly}
                    onEdit={() => setEditTarget({ shift, category: cat })}
                    onCopy={() => setClipboard(shift)} onCut={() => cut(shift)} onDelete={() => del(shift.id)}
                  >
                    <div
                      title={`${shift.employee} · ${employerBadgeLabel(shift)}`}
                      onPointerDown={(e) => { e.stopPropagation(); dragRef.current = shift.id; setDragId(shift.id) }}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditTarget({ shift, category: cat }) }}
                      className={cn(
                        "flex touch-none items-center justify-between overflow-hidden text-ellipsis whitespace-nowrap rounded px-[5px] py-0.5 text-[10px] font-semibold",
                        isDraft ? "border-[1.5px] border-dashed bg-transparent" : "border border-transparent text-white/[0.97]",
                        dragId === shift.id ? "cursor-grabbing opacity-30" : "cursor-grab opacity-100"
                      )}
                      style={
                        isDraft
                          ? { borderColor: c.bg, color: c.bg }
                          : { background: c.bg }
                      }
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {isDraft && '✎ '}{shift.employee.split(' ')[0]} {fmt12(shift.startH)}
                        {shift.breakStartH !== undefined && ' ☕'}
                      </span>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setClipboard(shift) }}
                        className={cn(
                          "flex cursor-pointer items-center border-none bg-transparent px-0.5",
                          isDraft ? "" : "text-white/85"
                        )}
                        style={isDraft ? { color: c.bg } : undefined}
                        title="Copy"
                      >
                        <Copy size={9} />
                      </button>
                    </div>
                  </ShiftCtxMenu>
                )
              })}
              {dayShifts.length > 3 && (
                <div className="cursor-pointer pl-0.5 text-[10px] text-primary">
                  +{dayShifts.length - 3} more
                </div>
              )}
            </div>
          )
        })}
      </div>

      {cellMenu && <CellCtxMenu menu={cellMenu} readOnly={readOnly} clipboard={clipboard} onAddShift={() => setAddPrompt({ date: cellMenu.date })} onPaste={() => paste(cellMenu.date)} onClose={() => setCellMenu(null)} />}
      {addPrompt && <AddShiftModal date={addPrompt.date} categoryId={addPrompt.categoryId} onAdd={(b) => { setShifts((p) => [...p, b]); onBlockCreate?.(b) }} onClose={() => setAddPrompt(null)} />}
      {editTarget && (
        <ShiftModal shift={editTarget.shift} category={editTarget.category} allShifts={shifts} onClose={() => setEditTarget(null)}
          onPublish={(id) => setShifts((p) => p.map((s) => s.id === id ? { ...s, status: 'published' as const } : s))}
          onUnpublish={(id) => setShifts((p) => p.map((s) => s.id === id ? { ...s, status: 'draft' as const } : s))}
          onDelete={(id) => { del(id); setEditTarget(null) }}
          onUpdate={(u) => { setShifts((p) => p.map((s) => s.id === u.id ? u : s)); onBlockUpdate?.(u) }}
        />
      )}
    </div>
  )
}

// ─── Year-view layout ─────────────────────────────────────────────────────────

function YearLayout({ date, shifts, onMonthDrill }: { date: Date; shifts: Block[]; onMonthDrill?: (y: number, m: number) => void }) {
  const year = date.getFullYear()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {MONTHS.map((mName, m) => {
          const days = getDIM(year, m)
          const first = getFirst(year, m)
          const ms = shifts.filter((s) => { const d = new Date(s.date + 'T12:00:00'); return d.getFullYear() === year && d.getMonth() === m })
          const cells: (number | null)[] = []
          for (let i = 0; i < first; i++) cells.push(null)
          for (let d = 1; d <= days; d++) cells.push(d)

          return (
            <div
              key={m}
              role="button"
              tabIndex={0}
              onClick={() => onMonthDrill?.(year, m)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMonthDrill?.(year, m) } }}
              className="cursor-pointer rounded-xl border border-border bg-background p-3 shadow-sm transition-[box-shadow,transform] duration-150"
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = ''; el.style.transform = '' }}
            >
              <div className="mb-2 text-[13px] font-bold text-foreground">{mName}</div>
              <div className="mb-0.5 grid grid-cols-7">
                {'MTWTFSS'.split('').map((c, i) => <div key={i} className="text-center text-[8px] font-bold text-muted-foreground">{c}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />
                  const has = ms.some((s) => new Date(s.date + 'T12:00:00').getDate() === d)
                  const tod = isTodayFn(new Date(year, m, d))
                  return (
                    <div
                      key={d}
                      className={cn(
                        "rounded-sm text-center text-[9px] leading-4",
                        tod || has ? "bg-primary font-bold text-primary-foreground" : "bg-transparent font-normal text-muted-foreground"
                      )}
                    >
                      {d}
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className={cn("size-1.5 shrink-0 rounded-full", ms.length > 0 ? "bg-primary" : "bg-muted-foreground")} />
                  <span className={cn("text-[10px]", ms.length > 0 ? "text-foreground" : "text-muted-foreground")}>{ms.length} shifts</span>
                </div>
                {ms.filter((s) => s.status === 'draft').length > 0 && (
                  <span className="text-[9px] font-semibold text-accent-foreground">{ms.filter((s) => s.status === 'draft').length} draft</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function KanbanView({
  date, shifts, setShifts, readOnly, mode = 'day', dates,
  onMonthDrill, onGoToDay, onBlockCreate, onBlockUpdate, onBlockDelete,
  weatherCoords,
}: KanbanViewProps): React.ReactElement {
  if (mode === 'year') {
    return <YearLayout date={date} shifts={shifts} onMonthDrill={onMonthDrill} />
  }
  if (mode === 'month') {
    return <MonthLayout date={date} shifts={shifts} setShifts={setShifts} readOnly={readOnly} onBlockCreate={onBlockCreate} onBlockUpdate={onBlockUpdate} onBlockDelete={onBlockDelete} />
  }
  if (mode === 'week' && dates && dates.length > 0) {
    return <WeekLayout dates={dates} shifts={shifts} setShifts={setShifts} readOnly={readOnly} onGoToDay={onGoToDay} onBlockCreate={onBlockCreate} onBlockUpdate={onBlockUpdate} onBlockDelete={onBlockDelete} weatherCoords={weatherCoords} />
  }
  return <DayLayout date={date} shifts={shifts} setShifts={setShifts} readOnly={readOnly} onBlockCreate={onBlockCreate} onBlockUpdate={onBlockUpdate} onBlockDelete={onBlockDelete} />
}
