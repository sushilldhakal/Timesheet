import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import type { Block, Resource , SchedulerMarker , ShiftDependency, EmployeeAvailability, FlatRow } from '@/components/scheduling/core/types-scheduler'
import { useSchedulerContext } from '@/components/scheduling/shell/SchedulerProvider'
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  SNAP,
  SIDEBAR_W,
  SHIFT_H,
  ROLE_HDR,
  HOUR_HDR_H,
  ADD_BTN_H,
  DAY_SCROLL_BUFFER,
  WEEK_TIME_LABEL_GAP,
  DOW_MON_FIRST,
  MONTHS_SHORT,
  snapH,
  snapToInterval,
  clamp,
  sameDay,
  isToday,
  fmt12,
  hourBg,
  isOutsideWorkingHours,
  DASHED_BG,
  getWeekDates,
  toDateISO,
  parseBlockDate,
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_THRESHOLD_PX,
  SWIPE_MIN_DELTA_X_PX,
  SWIPE_MAX_DELTA_Y_PX,
  RESIZE_HANDLE_MIN_TOUCH_PX,
  ZOOM_LEVELS,
} from '@/components/scheduling/core/constants-scheduler'
import { packShifts, getCategoryRowHeight, findConflicts, getConflictCount, wouldConflictAt, isUnavailable } from '@/components/scheduling/core/packing'
import { useScrollToNow } from '@/components/scheduling/hooks/useScrollToNow'
import { useMediaQuery, useIsTablet } from '@/components/scheduling/hooks/useMediaQuery'
import { useFlatRows } from '@/components/scheduling/hooks/useFlatRows'
import { StaffPanel } from "./StaffPanel"
import { RoleWarningModal } from "../modals/RoleWarningModal"
import { AddShiftModal } from "../modals/AddShiftModal"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuLabel, ContextMenuTrigger } from "../ui/context-menu"
import { Plus, Copy, ClipboardPaste, Trash2, AlertTriangle, Pencil, Scissors, ChevronsLeft, ChevronsRight, MapPin, ZoomIn, ZoomOut, Link2 } from "lucide-react"
import { cn } from '@/lib/utils/cn'
import { GridViewSidebar } from "./GridViewSidebar"

interface DragState {
  type: "move" | "resize-left" | "resize-right"
  id: string
  sx: number
  sy: number
  startH: number
  endH: number
  categoryId: string
  empId: string
  dur: number
  blockEl: HTMLElement | null
  blockColor: string
  /** Where inside the block the pointer landed — stored once at pointerdown to avoid per-frame reflows */
  grabOffsetX: number
  grabOffsetY: number
  /** Scroll container rect captured at drag start — stable until drag ends */
  gridRect: DOMRect | null
  /** Lane (track) the block occupied when grabbed — ghost uses this so it renders at the correct vertical slot */
  srcTrack: number
  /** Row key at drag start — when ghost crosses into a different row, srcTrack resets to 0 */
  srcCategoryKey: string
}

/** Keep shift bars inside day column bounds (float math; use with overflow-x on grid for ring/shadow). */
function clampShiftHoriz(
  left: number,
  width: number,
  rightLimit: number,
  minWidth: number,
  minLeft?: number
): { left: number; width: number } | null {
  let l = left
  let w = width
  if (minLeft !== undefined && l < minLeft) {
    const d = minLeft - l
    l = minLeft
    w -= d
  }
  const room = rightLimit - l
  if (room < minWidth) return null
  w = Math.min(w, room)
  if (w < minWidth) return null
  return { left: l, width: w }
}

export interface GridViewProps {
  dates: Date[]
  shifts: Block[]
  setShifts: React.Dispatch<React.SetStateAction<Block[]>>
  selEmps: Set<string>
  onShiftClick: (block: Block, resource: Resource) => void
  onAddShift: (date: Date, categoryId?: string, empId?: string) => void
  isWeekView?: boolean
  setDate?: React.Dispatch<React.SetStateAction<Date>>
  /** Day view with multiple days: [Mon 7-5pm][Tue 7-5pm]... horizontal scroll */
  isDayViewMultiDay?: boolean
  /** The date that should be centered/focused (e.g. from calendar pick) */
  focusedDate?: Date
  copiedShift?: Block | null
  setCopiedShift?: React.Dispatch<React.SetStateAction<Block | null>>
  zoom?: number
  /** Double-click on date header (week view) switches to day view */
  onDateDoubleClick?: (date: Date) => void
  /** Week view: report visible center date for header only (does not change buffer). */
  onVisibleCenterChange?: (date: Date) => void
  /** Called when user scrolls near edge; use for prefetching. */
  onVisibleRangeChange?: (visibleStartDate: Date, visibleEndDate: Date) => void
  /** Scroll threshold (0–1) for firing onVisibleRangeChange. Default 0.8 */
  prefetchThreshold?: number
  /** Called when user confirms delete from the grid (after confirm dialog). */
  onDeleteShift?: (shiftId: string) => void
  /** Ref to receive scrollToNow() for the header Now button. */
  scrollToNowRef?: React.MutableRefObject<(() => void) | null>
  /** When true, scroll to current time on mount (day/week view). */
  initialScrollToNow?: boolean
  /** P12-13: When true, show skeleton blocks (same layout as real data). */
  isLoading?: boolean
  /** Swipe on grid background: call with 1 or -1 to navigate. */
  onSwipeNavigate?: (dir: number) => void
  /** Pinch zoom: call with new zoom level (from ZOOM_LEVELS). */
  onPinchZoom?: (zoom: number) => void
  /** Current zoom level for pinch (0.5–2). */
  setZoom?: React.Dispatch<React.SetStateAction<number>>
  /** Mobile: show only one resource (category) at a time; index into categories. */
  mobileResourceIndex?: number
  /** Mobile: called when user swipes/clicks to prev/next resource (dir is -1 or 1). */
  onMobileResourceChange?: (dir: number) => void
  /** Keyboard: when no block focused, Arrow Left/Right calls this to navigate. */
  onNavigate?: (dir: number) => void
  /** Called after a block is moved (for aria-live announcement). */
  onBlockMoved?: (block: Block, newDate: string, newStartH: number, newEndH: number) => void
  /** Called when block focus changes (for Scheduler Ctrl+C / Ctrl+V). */
  onFocusedBlockChange?: (blockId: string | null) => void
  /** When true, disable drag, resize, click-to-add; view-only. */
  readOnly?: boolean
  /** P14-12: Webhook-style callbacks with full Block payload. */
  onBlockCreate?: (block: Block) => void
  onBlockDelete?: (block: Block) => void
  onBlockMove?: (block: Block) => void
  onBlockResize?: (block: Block) => void
  onBlockPublish?: (block: Block) => void
  /** Marker lines rendered over the grid at specific date+hour positions. */
  markers?: SchedulerMarker[]
  onMarkersChange?: (markers: SchedulerMarker[]) => void
  dependencies?: ShiftDependency[]
  onDependenciesChange?: (deps: ShiftDependency[]) => void
  availability?: EmployeeAvailability[]
  /** When true, hides the floating + add and paste buttons on each row.
   *  Use for Timeline view where double-click / right-click replaces them. */
  hideFloatingButtons?: boolean
  /** Single-day day view: stretch hour columns to fill the grid column width (ResizeObserver). */
  dayTimelineFillContainer?: boolean
  /** Controlled sidebar width (px). When set, GridView uses this width. */
  sidebarWidth?: number
  /** Called when user resizes the sidebar width (px). */
  onSidebarWidthChange?: (w: number) => void
}

export interface StaffPanelState {
  categoryId: string
  anchorRect: DOMRect
}

interface DropHoverState {
  categoryId: string
  di?: number
  hour?: number
}

interface CategoryWarnState {
  shift?: Block
  newCategoryId?: string
  ns?: number
  ne?: number
  newDate?: string
  empName?: string
  fromCategory?: Resource
  toCategory?: Resource
  onConfirmAction?: () => void
}

export interface AddPromptState {
  date: Date
  categoryId: string
  hour: number
  employeeId?: string
}

function GridViewInner({
  dates,
  shifts,
  setShifts,
  selEmps,
  onShiftClick,
  onAddShift,
  isWeekView,
  setDate,
  isDayViewMultiDay = false,
  focusedDate,
  copiedShift,
  setCopiedShift,
  zoom = 1,
  onDateDoubleClick,
  onVisibleCenterChange,
  onVisibleRangeChange,
  prefetchThreshold = 0.8,
  onDeleteShift,
  scrollToNowRef,
  initialScrollToNow = false,
  isLoading = false,
  readOnly = false,
  onSwipeNavigate,
  onPinchZoom,
  setZoom,
  mobileResourceIndex,
  onMobileResourceChange,
  onNavigate,
  onBlockMoved,
  onFocusedBlockChange,
  onBlockCreate,
  onBlockDelete,
  onBlockMove,
  onBlockResize,
  onBlockPublish,
  markers = [],
  onMarkersChange,
  dependencies = [],
  onDependenciesChange,
  availability = [],
  hideFloatingButtons = false,
  dayTimelineFillContainer = false,
  sidebarWidth: sidebarWidthProp,
  onSidebarWidthChange,
}: GridViewProps): React.ReactElement {
  const { categories, employees, nextUid, getColor, labels, settings, slots, snapMinutes, allowOvernight, getTimeLabel, timelineSidebarFlat } = useSchedulerContext()
  const CATEGORIES =
    mobileResourceIndex !== undefined && onMobileResourceChange
      ? [categories[mobileResourceIndex]].filter(Boolean)
      : categories
  const isMobileSingleResource = mobileResourceIndex !== undefined && onMobileResourceChange
  const isTouchDevice = useMediaQuery("(pointer: coarse)")
  const isTablet = useIsTablet()
  const snapHours = (snapMinutes ?? 30) / 60
  const snapLocal = useCallback(
    (v: number) => snapToInterval(v, snapHours),
    [snapHours]
  )
  const ALL_EMPLOYEES = employees

  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  /** Sidebar rows container — translated vertically to sync with grid scrollTop */
  /** Current grid scrollTop — read synchronously during render for sticky sidebar headers */
  /** Inner wide div inside headerRef — translateX'd instead of scrollLeft to avoid layout recalc lag */
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const initRef = useRef<boolean>(false)
  const lastReportedDayIdxRef = useRef<number>(-1)
  const scrollTriggeredUpdateRef = useRef(false)
  const lastReportedRangeRef = useRef<{ start: number; end: number } | null>(null)

  /** Row highlighted during block drag — ref avoids re-renders on every cell hover */
  const hoveredCategoryId = useRef<string | null>(null)
  const rowHoverHighlightRef = useRef<HTMLDivElement>(null)
  /** Resizable sidebar width */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // sidebarWidth mirrors the panel pixel size for the header stub alignment
  const [sidebarWidth, _setSidebarWidth] = useState(SIDEBAR_W)
  const setSidebarWidth = useCallback((w: number) => {
    _setSidebarWidth(w)
    onSidebarWidthChange?.(w)
  }, [onSidebarWidthChange])
  // Controlled mode: keep internal state in sync with prop.
  useEffect(() => {
    if (typeof sidebarWidthProp === "number" && Number.isFinite(sidebarWidthProp)) {
      _setSidebarWidth(sidebarWidthProp)
    }
  }, [sidebarWidthProp])
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c)
  }, [])

  const timelineFillActive =
    !!dayTimelineFillContainer && !isWeekView && !isDayViewMultiDay && dates.length === 1
  const [timelineInnerW, setTimelineInnerW] = useState<number | null>(null)
  const gridTimelineColRef = useRef<HTMLDivElement>(null)
  const visibleHourSpanForFill = Math.max(settings.visibleTo - settings.visibleFrom, 1)
  useLayoutEffect(() => {
    if (!timelineFillActive) {
      setTimelineInnerW(null)
      return
    }
    const el = gridTimelineColRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setTimelineInnerW(el.getBoundingClientRect().width)
    })
    ro.observe(el)
    setTimelineInnerW(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [timelineFillActive, dates, sidebarCollapsed, sidebarWidth])

  const HOUR_W =
    timelineFillActive && timelineInnerW != null && timelineInnerW > 0
      ? Math.max(32, timelineInnerW / visibleHourSpanForFill)
      : 96 * zoom
  /** Sort: "name" | "hours" | "scheduled" | null */
  const [sortBy, setSortBy] = useState<"name" | "hours" | "scheduled" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  /** Multi-select: set of selected block IDs */
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
  /** Rubber-band drag selection rect — null when not active */
  const [selRect, setSelRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [pendingMarker, setPendingMarker] = useState<{ id: string; clientX: number; clientY: number } | null>(null)
  const [headerPopover, setHeaderPopover] = useState<{ clientX: number; clientY: number; date: string; hour: number } | null>(null)
  const [gridContextMenu, setGridContextMenu] = useState<{ clientX: number; clientY: number; date: Date; hour: number; categoryId: string; employeeId?: string } | null>(null)
  const selRectStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)

  const [staffPanel, setStaffPanel] = useState<StaffPanelState | null>(null)
  const staffDragRef = useRef<{ empId: string; fromCategoryId: string; empName: string; pointerId: number } | null>(null)
  const [dragEmpId, setDragEmpId] = useState<string | null>(null)
  const [isStaffDragging, setIsStaffDragging] = useState(false)
  const dropHoverRef = useRef<DropHoverState | null>(null)
  const dropHighlightRef = useRef<HTMLDivElement>(null)
  const [categoryWarn, setCategoryWarn] = useState<CategoryWarnState | null>(null)
  const [addPrompt, setAddPrompt] = useState<AddPromptState | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [shiftToDeleteConfirm, setShiftToDeleteConfirm] = useState<Block | null>(null)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const blockRefsRef = useRef<Record<string, HTMLDivElement | null>>({})
  /** Dep-draw drag state — which block/side we started from and current pointer pos */
  const depDragRef = useRef<{
    fromId: string
    fromSide: "top" | "right" | "bottom" | "left"
    startX: number   // grid-relative X of the dot we dragged from
    startY: number   // grid-relative Y of the dot we dragged from
    curX: number
    curY: number
  } | null>(null)
  /** Ref to the live SVG preview path — updated via direct DOM mutation, zero re-renders */
  const depPreviewPathRef = useRef<SVGPathElement | null>(null)
  const depPreviewArrowRef = useRef<SVGMarkerElement | null>(null)
  /** ID of the dep SVG layer element — used to attach the preview path */
  const depSvgRef = useRef<SVGSVGElement | null>(null)
  /** Block currently hovered for dep-draw targeting highlight */
  const [depHoveredBlockId, setDepHoveredBlockId] = useState<string | null>(null)
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null)
  const [selectedDepId, setSelectedDepId] = useState<string | null>(null)
  const [editingDep, setEditingDep] = useState<ShiftDependency | null>(null)
  /** P12-01: IDs of blocks just added (one-frame scale-in animation). */
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set())
  /** P12-02: IDs of blocks being deleted (fade-out then remove). */
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  /** P12-23: ID of block that was dropped into a conflicting position (show red, revert). */
  const [dropConflictId, setDropConflictId] = useState<string | null>(null)
  /** P12-10: Block hover tooltip after 200ms (or immediately when hovering conflict icon). */
  const [tooltipBlockId, setTooltipBlockId] = useState<string | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const TOOLTIP_HOVER_MS = 200
  const TOOLTIP_LEAVE_MS = 150
  const prevShiftsRef = useRef<Block[]>(shifts)
  useEffect(() => {
    const prevIds = new Set(prevShiftsRef.current.map((s) => s.id))
    const added = shifts.filter((s) => !prevIds.has(s.id)).map((s) => s.id)
    if (added.length) {
      setNewlyAddedIds((prev) => new Set([...prev, ...added]))
      const raf = requestAnimationFrame(() => setNewlyAddedIds(new Set()))
      return () => cancelAnimationFrame(raf)
    }
    prevShiftsRef.current = shifts
  }, [shifts])
  useEffect(() => {
    prevShiftsRef.current = shifts
  })

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])


  // ── Sidebar sort ────────────────────────────────────────────
  const toggleSort = useCallback((col: "name" | "hours" | "scheduled") => {
    if (sortBy === col) {
      // Same column — flip direction
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      // New column — set it and reset to asc
      setSortBy(col)
      setSortDir("asc")
    }
  }, [sortBy])

  // ── Multi-select ────────────────────────────────────────────
  const toggleBlockSelect = useCallback((id: string, multi: boolean) => {
    setSelectedBlockIds((prev) => {
      if (!multi) return new Set(prev.has(id) && prev.size === 1 ? [] : [id])
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const deleteSelectedBlocks = useCallback(() => {
    if (!onDeleteShift) return
    selectedBlockIds.forEach((id) => onDeleteShift(id))
    setSelectedBlockIds(new Set())
  }, [selectedBlockIds, onDeleteShift])

  const moveSelectedBlocks = useCallback((offsetDays: number) => {
    setShifts((prev) => prev.map((s) => {
      if (!selectedBlockIds.has(s.id)) return s
      const d = new Date(s.date + "T12:00:00")
      d.setDate(d.getDate() + offsetDays)
      return { ...s, date: toDateISO(d) }
    }))
  }, [selectedBlockIds, setShifts])

  const COL_W_WEEK = useMemo((): number => {
    if (!isWeekView) return HOUR_W
    const vh = settings.visibleTo - settings.visibleFrom
    return Math.max(vh * 18, 160) * zoom
  }, [isWeekView, settings, zoom, HOUR_W])

  const PX_WEEK = isWeekView ? COL_W_WEEK / Math.max(settings.visibleTo - settings.visibleFrom, 1) : 1
  /** Day view: 0.5 = 30-min slots when zoomed in, 1 = hourly */
  const dayTimeStep = zoom >= 1.25 ? 0.5 : 1
  /** Week view: 1h when zoomed in, 2h at default, 4h when zoomed out (narrow column) */
  const weekTimeLabelGap = !isWeekView
    ? WEEK_TIME_LABEL_GAP
    : zoom >= 1.25
      ? 1
      : zoom >= 0.8
        ? 2
        : 4
  const DAY_VISIBLE_SLOTS = useMemo(() => {
    const count = Math.round((settings.visibleTo - settings.visibleFrom) / dayTimeStep)
    return Array.from({ length: count }, (_, k) => settings.visibleFrom + k * dayTimeStep)
  }, [settings.visibleFrom, settings.visibleTo, dayTimeStep])
  const SLOT_W = HOUR_W * dayTimeStep
  const DAY_WIDTH = (settings.visibleTo - settings.visibleFrom) * HOUR_W
  const isSingleDayTimeline = !isWeekView && !isDayViewMultiDay
  const laneH = isSingleDayTimeline ? 31 : SHIFT_H
  // Single-day day view uses a compact 31px lane with a 27px bar inset by 2px top/bottom.
  const blockBarInnerH = isSingleDayTimeline ? 27 : SHIFT_H - 8
  const ghostBarH = isSingleDayTimeline ? 27 : SHIFT_H - 6
  // Day overview layout uses a single full-width timeline and navigates via the week strip,
  // so we must disable hidden day-scroll buffer to keep drag coordinates aligned.
  const hasDayScrollNav = !timelineFillActive && !isWeekView && !!setDate && !isDayViewMultiDay
  const TOTAL_W = isWeekView
    ? dates.length * COL_W_WEEK
    : isDayViewMultiDay
      ? dates.length * DAY_WIDTH
      : hasDayScrollNav
        ? 2 * DAY_SCROLL_BUFFER + DAY_WIDTH
        : DAY_WIDTH

  const isDayViewNav = isWeekView && dates.length === 7
  const scrollNavDelta = isDayViewNav ? 1 : 7
  const scrollNavCols = isDayViewNav ? 1 : 7
  const weekViewScrollCol = useMemo((): number => {
    if (!isWeekView || dates.length === 0) return 7
    if (isDayViewNav) return 3
    if (focusedDate) {
      const weekStart = getWeekDates(focusedDate)[0]
      const idx = dates.findIndex((d) => sameDay(d, weekStart))
      if (idx >= 0) return idx
    }
    return Math.floor(dates.length / 2) - 3
  }, [isWeekView, isDayViewNav, dates, focusedDate])
  const centerDayIdx = isDayViewMultiDay ? Math.floor(dates.length / 2) : 0
  useEffect(() => {
    if (!initRef.current && scrollRef.current) {
      const performScroll = (): void => {
        if (!scrollRef.current || initRef.current) return
        if (isWeekView) {
          scrollRef.current.scrollLeft = weekViewScrollCol * COL_W_WEEK
        } else if (hasDayScrollNav) {
          scrollRef.current.scrollLeft = DAY_SCROLL_BUFFER
        } else if (isDayViewMultiDay) {
          const vw = scrollRef.current.clientWidth
          scrollRef.current.scrollLeft = Math.max(0, centerDayIdx * DAY_WIDTH + DAY_WIDTH / 2 - vw / 2)
        } else {
          scrollRef.current.scrollLeft = 0
        }
        initRef.current = true
        lastReportedDayIdxRef.current = centerDayIdx
      }
      // Defer so layout is complete; rAF + rAF helps ensure layout has been painted
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(performScroll)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isWeekView, hasDayScrollNav, isDayViewMultiDay, weekViewScrollCol, COL_W_WEEK, centerDayIdx, DAY_WIDTH])

  const prevDatesRef = useRef(dates)
  // Track previous zoom so we can anchor-scroll when zoom changes
  const prevZoomRef = useRef(zoom)
  React.useLayoutEffect(() => {
    if (prevDatesRef.current !== dates) {
      const oldDates = prevDatesRef.current
      prevDatesRef.current = dates
      if (oldDates.length > 0 && dates.length > 0 && scrollRef.current) {
        if (scrollTriggeredUpdateRef.current) {
          // Edge load: preserve scroll position relative to content
          const diffDays = Math.round((dates[0].getTime() - oldDates[0].getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays !== 0) {
            if (isDayViewMultiDay) {
              scrollRef.current.scrollLeft -= diffDays * DAY_WIDTH
            } else if (isWeekView) {
              scrollRef.current.scrollLeft -= diffDays * COL_W_WEEK
            }
            
          
          }
          scrollTriggeredUpdateRef.current = false
        } else {
          // Navigated via header buttons, reset scroll to center (week: to focused week; day: to focused day)
          if (isWeekView) {
            scrollRef.current.scrollLeft = weekViewScrollCol * COL_W_WEEK
          } else if (hasDayScrollNav) {
            scrollRef.current.scrollLeft = DAY_SCROLL_BUFFER
          } else if (isDayViewMultiDay) {
            const vw = scrollRef.current.clientWidth
            scrollRef.current.scrollLeft = Math.max(0, centerDayIdx * DAY_WIDTH + DAY_WIDTH / 2 - vw / 2)
          }
          
        
        }
      }
    }
  }, [dates, isDayViewMultiDay, isWeekView, hasDayScrollNav, weekViewScrollCol, centerDayIdx, DAY_WIDTH, COL_W_WEEK])

  // ── Anchor zoom: keep the visible horizontal center fixed when zoom changes ──
  useEffect(() => {
    const prevZoom = prevZoomRef.current
    prevZoomRef.current = zoom
    if (prevZoom === zoom) return
    const el = scrollRef.current
    if (!el) return
    // The content width scales proportionally with zoom.
    // ratio = new content width / old content width = zoom / prevZoom
    const ratio = zoom / prevZoom
    const centerX = el.scrollLeft + el.clientWidth / 2
    const newScrollLeft = Math.max(0, centerX * ratio - el.clientWidth / 2)
    el.scrollLeft = newScrollLeft
    // Sync header
  }, [zoom])

  const focusedDateTime = focusedDate?.getTime()
  useEffect(() => {
    if (!isDayViewMultiDay || !scrollRef.current || !focusedDate || dates.length === 0) return
    if (scrollTriggeredUpdateRef.current) {
      scrollTriggeredUpdateRef.current = false
      return
    }
    const idx = dates.findIndex((d) => d.getTime() === focusedDateTime)
    if (idx < 0) return
    const vw = scrollRef.current.clientWidth
    const targetScroll = Math.max(0, idx * DAY_WIDTH + DAY_WIDTH / 2 - vw / 2)
    scrollRef.current.scrollLeft = targetScroll
    lastReportedDayIdxRef.current = idx
  }, [isDayViewMultiDay, focusedDateTime, dates, DAY_WIDTH])

  const VISIBLE_RANGE_DEBOUNCE_MS = 100
  const visibleRangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reportVisibleRange = useCallback(
    (el: HTMLDivElement, forceReport = false): void => {
      if (!onVisibleRangeChange || dates.length === 0 || !(isWeekView || isDayViewMultiDay)) return
      const colW = isWeekView ? COL_W_WEEK : DAY_WIDTH
      const maxScroll = el.scrollWidth - el.clientWidth
      const firstIdx = clamp(Math.floor(el.scrollLeft / colW), 0, dates.length - 1)
      const lastIdx = clamp(
        Math.floor((el.scrollLeft + el.clientWidth) / colW),
        0,
        dates.length - 1
      )
      const startT = dates[firstIdx].getTime()
      const endT = dates[lastIdx].getTime()
      if (!forceReport && maxScroll > 0) {
        const scrollRatio = el.scrollLeft / maxScroll
        const nearRight = scrollRatio >= prefetchThreshold
        const nearLeft = scrollRatio <= 1 - prefetchThreshold
        if (!nearRight && !nearLeft) return
      }
      const last = lastReportedRangeRef.current
      if (!forceReport && last && last.start === startT && last.end === endT) return
      lastReportedRangeRef.current = { start: startT, end: endT }
      const fire = (): void => {
        onVisibleRangeChange(new Date(dates[firstIdx]), new Date(dates[lastIdx]))
      }
      if (forceReport) {
        if (visibleRangeDebounceRef.current) {
          clearTimeout(visibleRangeDebounceRef.current)
          visibleRangeDebounceRef.current = null
        }
        fire()
        return
      }
      if (visibleRangeDebounceRef.current) clearTimeout(visibleRangeDebounceRef.current)
      visibleRangeDebounceRef.current = setTimeout(fire, VISIBLE_RANGE_DEBOUNCE_MS)
    },
    [
      onVisibleRangeChange,
      dates,
      isWeekView,
      isDayViewMultiDay,
      COL_W_WEEK,
      DAY_WIDTH,
      prefetchThreshold,
    ]
  )

  const onWeekScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>): void => {
      if (!isWeekView) return
      const el = e.currentTarget
      const maxScrollLeft = el.scrollWidth - el.clientWidth
      const threshold = COL_W_WEEK * (isDayViewNav ? 1.5 : 3)

      let didEdgeLoad = false
      // Edge: load prev/next week when scrolling near the ends (only if there's room to scroll)
      if (setDate && maxScrollLeft > threshold * 2) {
        if (el.scrollLeft < threshold) {
          didEdgeLoad = true
          scrollTriggeredUpdateRef.current = true
          setDate((d) => {
            const nd = new Date(d)
            nd.setDate(nd.getDate() - scrollNavDelta)
            return nd
          })
        } else if (el.scrollLeft > maxScrollLeft - threshold) {
          didEdgeLoad = true
          scrollTriggeredUpdateRef.current = true
          setDate((d) => {
            const nd = new Date(d)
            nd.setDate(nd.getDate() + scrollNavDelta)
            return nd
          })
        }
      }

      // Center: report visible week for header only (no setDate — buffer stays put, no scroll reset)
      if (!didEdgeLoad && onVisibleCenterChange) {
        const centerX = el.scrollLeft + el.clientWidth / 2
        const centerDayIdx = clamp(Math.floor(centerX / COL_W_WEEK), 0, dates.length - 1)
        if (centerDayIdx !== lastReportedDayIdxRef.current && dates[centerDayIdx]) {
          lastReportedDayIdxRef.current = centerDayIdx
          onVisibleCenterChange(new Date(dates[centerDayIdx]))
        }
      }

      
      reportVisibleRange(el)
    },
    [isWeekView, setDate, onVisibleCenterChange, COL_W_WEEK, isDayViewNav, scrollNavDelta, reportVisibleRange, dates]
  )

  const onDayScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>): void => {
      if (isWeekView) return
      const el = e.currentTarget
      
      if (isDayViewMultiDay && setDate) {
        const sl = el.scrollLeft
        const vw = el.clientWidth
        const maxScrollLeft = el.scrollWidth - vw
        const centerX = sl + vw / 2
        const dayIdx = clamp(Math.floor(centerX / DAY_WIDTH), 0, dates.length - 1)
        
        if (dayIdx !== lastReportedDayIdxRef.current && dates[dayIdx]) {
          lastReportedDayIdxRef.current = dayIdx
          scrollTriggeredUpdateRef.current = true
          const newDate = new Date(dates[dayIdx])
          setDate(newDate)
        }
        
        const halfWindow = Math.floor(dates.length / 2)
        if (maxScrollLeft > DAY_WIDTH * 2) {
          if (sl < DAY_WIDTH) {
            scrollTriggeredUpdateRef.current = true
            setDate((d) => {
              const nd = new Date(d)
              nd.setDate(nd.getDate() - halfWindow)
              return nd
            })
            lastReportedDayIdxRef.current = halfWindow
          } else if (sl > maxScrollLeft - DAY_WIDTH) {
            scrollTriggeredUpdateRef.current = true
            setDate((d) => {
              const nd = new Date(d)
              nd.setDate(nd.getDate() + halfWindow)
              return nd
            })
            lastReportedDayIdxRef.current = halfWindow
          }
        }
      } else if (hasDayScrollNav && setDate) {
        const sl = el.scrollLeft
        if (sl < DAY_SCROLL_BUFFER / 2) {
          setDate((d) => {
            const nd = new Date(d)
            nd.setDate(nd.getDate() - 1)
            return nd
          })
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollLeft = DAY_SCROLL_BUFFER
            
          })
        } else if (sl > DAY_SCROLL_BUFFER + DAY_WIDTH - DAY_SCROLL_BUFFER / 2) {
          setDate((d) => {
            const nd = new Date(d)
            nd.setDate(nd.getDate() + 1)
            return nd
          })
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollLeft = DAY_SCROLL_BUFFER
            
          })
        }
      }
      reportVisibleRange(el)
    },
    [isWeekView, isDayViewMultiDay, hasDayScrollNav, setDate, DAY_WIDTH, TOTAL_W, dates, reportVisibleRange]
  )

  /** P12-13/14: Skeleton blocks for loading state (same packing layout). */
  const skeletonBlocks = useMemo((): Block[] => {
    if (!isLoading) return []
    const out: Block[] = []
    CATEGORIES.forEach((cat) => {
      dates.forEach((date, di) => {
        out.push(
          {
            id: `skel-${cat.id}-${di}-0`,
            categoryId: cat.id,
            employeeId: "skeleton",
            date: toDateISO(date),
            startH: 9,
            endH: 13,
            employee: "",
            status: "published",
          },
          {
            id: `skel-${cat.id}-${di}-1`,
            categoryId: cat.id,
            employeeId: "skeleton",
            date: toDateISO(date),
            startH: 14,
            endH: 18,
            employee: "",
            status: "published",
          }
        )
      })
    })
    return out
  }, [isLoading, CATEGORIES, dates])

  const displayShifts = useMemo(
    () => (isLoading ? skeletonBlocks : shifts.filter((s) => selEmps.has(s.employeeId))),
    [isLoading, skeletonBlocks, shifts, selEmps]
  )

  const shiftIndex = useMemo((): Map<string, Block[]> => {
    const idx = new Map<string, Block[]>()
    for (const s of displayShifts) {
      const key = `${s.categoryId}:${s.date}`
      const list = idx.get(key)
      if (list) list.push(s)
      else idx.set(key, [s])
    }
    return idx
  }, [displayShifts])

  /** Sidebar-sorted categories — pre-computes aggregates to avoid O(n²) filter inside comparator */
  const SORTED_CATEGORIES = useMemo(() => {
    if (!sortBy) return CATEGORIES
    if (sortBy === "name") {
      return [...CATEGORIES].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name)
        return sortDir === "asc" ? cmp : -cmp
      })
    }
    // Pre-compute per-category value once — O(n) scan instead of O(n log n) × O(n) filter
    const catMap = new Map<string, number>()
    for (const s of shifts) {
      const prev = catMap.get(s.categoryId) ?? 0
      catMap.set(s.categoryId, prev + (sortBy === "hours" ? (s.endH - s.startH) : 1))
    }
    return [...CATEGORIES].sort((a, b) => {
      const av = catMap.get(a.id) ?? 0
      const bv = catMap.get(b.id) ?? 0
      return sortDir === "asc" ? av - bv : bv - av
    })
  }, [CATEGORIES, sortBy, sortDir, shifts])

  /**
   * Phase 4 — flat row list for the virtualizer.
   * In "individual" mode: category header + one row per employee.
   * In "category" mode: category header rows only (shifts stack inside like the original model).
   */
  const rowMode = settings.rowMode ?? "category"
  // In flat EPG/timeline mode: skip category headers, one row per resource
  const effectiveRowMode: "category" | "individual" | "flat" =
    (timelineSidebarFlat && isDayViewMultiDay) ? "flat" : rowMode
  const flatRows = useFlatRows(SORTED_CATEGORIES, ALL_EMPLOYEES, collapsed, effectiveRowMode, shifts)

  // Pre-compute max packed tracks per category across all dates — O(dates × categories × shifts)
  // Separated so virtualizer estimateSize can use it without re-running flatRows loop
  const maxTracksPerCat = useMemo((): Map<string, number> => {
    const map = new Map<string, number>()
    for (const [key, dayShifts] of shiftIndex.entries()) {
      const catId = key.split(":")[0]
      if (!catId) continue
      const h = getCategoryRowHeight(catId, dayShifts, laneH)
      const prev = map.get(catId) ?? 0
      if (h > prev) map.set(catId, h)
    }
    return map
  }, [shiftIndex, laneH])

  const categoryHeights = useMemo((): Record<string, number> => {
    const result: Record<string, number> = {}
    // Sidebar category header includes a small extra strip (progress bar area) below ROLE_HDR.
    // If we don't account for it in the virtualized row height, it overlaps the first employee row.
    const CAT_HDR_EXTRA_H = 10
    flatRows.forEach((row) => {
      const key = row.kind === "employee" && row.employee
        ? `emp:${row.employee.id}`
        : `cat:${row.category.id}`
      if (row.kind === "category") {
        if (effectiveRowMode === "flat") {
          // Compact fixed height for EPG/TV-style flat timeline rows
          result[key] = ROLE_HDR
        } else if (effectiveRowMode === "category" && !collapsed.has(row.category.id)) {
          // Use pre-computed max height — no inner dates.forEach loop
          result[key] = Math.max(maxTracksPerCat.get(row.category.id) ?? 0, ROLE_HDR + laneH) + CAT_HDR_EXTRA_H
        } else {
          result[key] = ROLE_HDR + CAT_HDR_EXTRA_H
        }
        return
      }
      const emp = row.employee!
      let maxTracks = 1
      for (const d of dates) {
        const dayBlocks = (shiftIndex.get(`${row.category.id}:${toDateISO(d)}`) ?? []).filter((s) => s.employeeId === emp.id)
        const sorted = [...dayBlocks].sort((a, b) => a.startH - b.startH)
        if (sorted.length === 0) continue
        const nums = packShifts(sorted)
        const tc = nums.reduce((mx, t) => Math.max(mx, t + 1), 1)
        if (tc > maxTracks) maxTracks = tc
      }
      // Employee rows: add a small vertical padding in larger views, but keep single-day
      // day view truly compact (31px lanes) so the grid row height matches the lane height.
      result[key] = maxTracks * laneH + (isSingleDayTimeline ? 0 : 16)
    })
    return result
  }, [maxTracksPerCat, flatRows, effectiveRowMode, collapsed, shiftIndex, dates, laneH, isSingleDayTimeline])

  // NOTE: vrTopsRef is updated from virtualizer vr.start values every render
  const vrTopsRef = useRef<Record<string, number>>({})

  const categoryTops = useMemo((): Record<string, number> => {
    if (Object.keys(vrTopsRef.current).length === flatRows.length) {
      return { ...vrTopsRef.current }
    }
    const map: Record<string, number> = {}
    let acc = 0
    flatRows.forEach((row) => {
      const key = row.kind === "employee" && row.employee
        ? `emp:${row.employee.id}`
        : `cat:${row.category.id}`
      map[key] = acc
      acc += categoryHeights[key] ?? ROLE_HDR
    })
    return map
  }, [categoryHeights, flatRows])

  // For conflict detection: in day view with buffer, only the focused day counts (not all buffer days).
  const conflictRangeDates = useMemo((): Date[] => {
    if (isDayViewMultiDay && dates.length > 1 && focusedDate) {
      return [focusedDate]
    }
    if (isDayViewMultiDay && dates.length > 1) {
      const centerIdx = Math.floor(dates.length / 2)
      return dates[centerIdx] ? [dates[centerIdx]] : [dates[0]]
    }
    return dates
  }, [dates, isDayViewMultiDay, focusedDate])

  const visibleDateSet = useMemo(() => {
    const set = new Set<string>()
    conflictRangeDates.forEach((d) => set.add(toDateISO(d)))
    return set
  }, [conflictRangeDates])

  const visibleShifts = useMemo(
    () =>
      shifts.filter((s) =>
        visibleDateSet.has(typeof s.date === "string" ? s.date : toDateISO(s.date))
      ),
    [shifts, visibleDateSet]
  )

  const conflictIds = useMemo(() => findConflicts(visibleShifts), [visibleShifts])

  const orderedBlockIds = useMemo((): string[] => {
    const ids: string[] = []
    CATEGORIES.forEach((cat) => {
      dates.forEach((date) => {
        const dayShifts = shiftIndex.get(`${cat.id}:${toDateISO(date)}`) ?? []
        const sorted = [...dayShifts].sort((a, b) => a.startH - b.startH)
        sorted.forEach((s) => ids.push(s.id))
      })
    })
    return ids
  }, [shiftIndex, dates, CATEGORIES])

  // Pre-computed packing: "catId:dateISO" → { shiftId → trackNum }
  // Avoids calling packShifts() inline on every render iteration
  const packedTracksIndex = useMemo((): Map<string, Map<string, number>> => {
    const out = new Map<string, Map<string, number>>()
    for (const [key, dayShifts] of shiftIndex.entries()) {
      const sorted = [...dayShifts].sort((a, b) => a.startH - b.startH)
      const nums = packShifts(sorted)
      const trackMap = new Map<string, number>()
      sorted.forEach((s, i) => trackMap.set(s.id, nums[i] ?? 0))
      out.set(key, trackMap)
    }
    return out
  }, [shiftIndex])

  const categoryHasShifts = useMemo((): Record<string, boolean> => {
    const map: Record<string, boolean> = {}
    for (const [key, list] of shiftIndex.entries()) {
      if (list.length > 0) {
        const catId = key.split(":")[0]
        map[catId] = true
      }
    }
    return map
  }, [shiftIndex])

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => {
      const row = flatRows[i]
      if (!row) return ROLE_HDR
      const key = row.kind === "employee" && row.employee
        ? `emp:${row.employee.id}`
        : `cat:${row.category.id}`
      return categoryHeights[key] ?? ROLE_HDR
    },
    overscan: 6,
  })

  // Force virtualizer to re-measure whenever row heights change.
  // This is necessary because @tanstack/react-virtual caches estimateSize results
  // and won't pick up changes to categoryHeights (e.g. new shift added, collapse toggled)
  // without an explicit measure() call.
  const categoryHeightsRef = useRef(categoryHeights)
  useEffect(() => {
    if (categoryHeightsRef.current !== categoryHeights) {
      categoryHeightsRef.current = categoryHeights
      rowVirtualizer.measure()
    }
  })

  const totalHVirtual = rowVirtualizer.getTotalSize()

  const ds = useRef<DragState | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  /** Floating label that appears near the resize handle showing live time */
  const resizeLabelRef = useRef<HTMLDivElement | null>(null)
  /** Edge-scroll RAF: direction (-1 left, 0 none, 1 right) + speed multiplier */
  const edgeScrollRef = useRef<{ dirX: number; speedX: number; dirY: number; speedY: number } | null>(null)
  const edgeRafRef = useRef<number | null>(null)
  /** Raw pointer position updated every pointermove — read by drag RAF loop */
  const dragPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)
  /** RAF id for the drag ghost update loop */
  const dragRafRef = useRef<number | null>(null)
  const layoutRef = useRef({
    categoryTops: {} as Record<string, number>,
    categoryHeights: {} as Record<string, number>,
    dates: [] as Date[],
    shifts: [] as Block[],
    CATEGORIES: [] as Resource[],
    collapsed: new Set<string>(),
    flatRows: [] as typeof flatRows,
  })
  layoutRef.current = {
    categoryTops,
    categoryHeights,
    dates,
    shifts,
    CATEGORIES,
    collapsed,
    flatRows,
  }
  const [dragId, setDragId] = useState<string | null>(null)
  const gridPointerIdsRef = useRef<Set<number>>(new Set())
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null)
  const longPressPointerIdRef = useRef<number | null>(null)
  /** Long press on a specific block — for touch drag activation */
  const blockLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blockLongPressIdRef = useRef<string | null>(null)
  /** Block that is "activating" on long press (shows scale-up feedback) */
  const [activatingBlockId, setActivatingBlockId] = useState<string | null>(null)
  const pinchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const initialPinchDistRef = useRef<number | null>(null)
  const initialZoomRef = useRef<number>(1)

  const getGridXY = useCallback((cx: number, cy: number): { x: number; y: number } => {
    const sr = scrollRef.current?.getBoundingClientRect()
    if (!sr) return { x: 0, y: 0 }
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    // Grid is inside scroll container: contentX = scrollLeft + (clientX - visibleLeft)
    // When hasDayScrollNav, grid starts after buffer; otherwise at 0
    const contentX = scrollLeft + (cx - sr.left)
    // Subtract HOUR_HDR_H: the time header sits inside scrollRef but categoryTops
    // are virtualizer vr.start values which start at 0 relative to gridRef (below the header).
    const contentY = scrollTop + (cy - sr.top) - HOUR_HDR_H
    const gridX = hasDayScrollNav ? contentX - DAY_SCROLL_BUFFER : contentX
    return { x: gridX, y: contentY }
  }, [hasDayScrollNav])

  const getCategoryAtY = useCallback(
    (y: number): Resource => {
      if (y < 0) return CATEGORIES[0]!
      // Find the flat row whose top ≤ y < top + height
      for (const row of flatRows) {
        const key = row.kind === "employee" && row.employee
          ? `emp:${row.employee.id}`
          : `cat:${row.category.id}`
        const top = categoryTops[key] ?? 0
        const h   = categoryHeights[key] ?? 0
        if (y >= top && y < top + h) return row.category
      }
      return CATEGORIES[CATEGORIES.length - 1]!
    },
    [categoryTops, categoryHeights, flatRows, CATEGORIES]
  )

  const getHourAtX = useCallback(
    (x: number, di: number = 0): number => {
      if (isWeekView) {
        const localX = x - di * COL_W_WEEK
        return snapH(clamp(settings.visibleFrom + localX / PX_WEEK, 0, 24))
      }
      if (isDayViewMultiDay) {
        const localX = x - di * DAY_WIDTH
        return snapH(
          clamp(settings.visibleFrom + localX / HOUR_W, settings.visibleFrom, settings.visibleTo)
        )
      }
      return snapH(
        clamp(settings.visibleFrom + x / HOUR_W, settings.visibleFrom, settings.visibleTo)
      )
    },
    [isWeekView, isDayViewMultiDay, COL_W_WEEK, DAY_WIDTH, PX_WEEK, HOUR_W, settings.visibleFrom, settings.visibleTo]
  )

  const getDateIdx = useCallback(
    (x: number): number => {
      if (isDayViewMultiDay) return clamp(Math.floor(x / DAY_WIDTH), 0, dates.length - 1)
      if (!isWeekView) return 0
      return clamp(Math.floor(x / COL_W_WEEK), 0, dates.length - 1)
    },
    [isWeekView, isDayViewMultiDay, COL_W_WEEK, DAY_WIDTH, dates.length]
  )

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartRef.current = null
    longPressPointerIdRef.current = null
  }, [])

  const clearBlockLongPress = useCallback(() => {
    if (blockLongPressTimerRef.current) {
      clearTimeout(blockLongPressTimerRef.current)
      blockLongPressTimerRef.current = null
    }
    blockLongPressIdRef.current = null
    setActivatingBlockId(null)
  }, [])

  const cleanupPointer = useCallback((pointerId: number) => {
    gridPointerIdsRef.current.delete(pointerId)
    if (longPressPointerIdRef.current === pointerId) clearLongPress()
    pinchPointersRef.current.delete(pointerId)
    if (pinchPointersRef.current.size < 2) initialPinchDistRef.current = null
  }, [clearLongPress])

  const clearStaffDrag = useCallback(() => {
    staffDragRef.current = null
    setIsStaffDragging(false)
    setDragEmpId(null)
    dropHoverRef.current = null; if (dropHighlightRef.current) dropHighlightRef.current.style.display = "none"
    if (ghostRef.current) ghostRef.current.style.display = "none"
          if (resizeLabelRef.current) resizeLabelRef.current.style.display = "none"  }, [])

  const commitStaffDropAtClientXY = useCallback(
    (clientX: number, clientY: number) => {
      const drag = staffDragRef.current
      if (!drag) return
      const { x, y } = getGridXY(clientX, clientY)
      const newCat = getCategoryAtY(y)
      const di = getDateIdx(x)
      const hour = getHourAtX(x, di)
      const date = dates[di] ?? dates[0]
      if (!date) return
      const startH = Math.floor(hour)
      const endH = Math.min(startH + 4, 23)
      const emp = ALL_EMPLOYEES.find((x) => x.id === drag.empId)
      const fromCategoryId = drag.fromCategoryId

      if (fromCategoryId !== newCat.id) {
        const fromCategory = CATEGORIES.find((c) => c.id === fromCategoryId)
        const toCategory = CATEGORIES.find((c) => c.id === newCat.id)
        setCategoryWarn({
          empName: emp?.name ?? drag.empName,
          fromCategory,
          toCategory,
          onConfirmAction: () =>
            setShifts((prev) => [
              ...prev,
              (() => {
                const created: Block = {
                  id: nextUid(),
                  categoryId: newCat.id,
                  employeeId: drag.empId,
                  date: toDateISO(date),
                  startH,
                  endH,
                  employee: emp?.name || drag.empName || "?",
                  status: "draft",
                }
                onBlockCreate?.(created)
                return created
              })(),
            ]),
        })
      } else {
        setShifts((prev) => [
          ...prev,
          (() => {
            const created: Block = {
              id: nextUid(),
              categoryId: newCat.id,
              employeeId: drag.empId,
              date: toDateISO(date),
              startH,
              endH,
              employee: emp?.name || drag.empName || "?",
              status: "draft",
            }
            onBlockCreate?.(created)
            return created
          })(),
        ])
      }
    },
    [getGridXY, getCategoryAtY, getDateIdx, getHourAtX, dates, ALL_EMPLOYEES, CATEGORIES, nextUid, setShifts, onBlockCreate]
  )

  const onStaffPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = staffDragRef.current
      if (!drag) return
      const { x, y } = getGridXY(e.clientX, e.clientY)
      const cat = getCategoryAtY(y)
      const di = getDateIdx(x)
      const hour = getHourAtX(x, di)
      dropHoverRef.current = { categoryId: cat.id, di, hour }

      const ghostEl = ghostRef.current
      if (!ghostEl) return
      ghostEl.style.display = "flex"
      ghostEl.style.left = "0"
      ghostEl.style.top = "0"
      ghostEl.style.width = `160px`
      ghostEl.style.height = `26px`
      ghostEl.style.borderRadius = "999px"
      ghostEl.style.transform = `translate(${x + 8}px, ${y + HOUR_HDR_H + 8}px)`
      ghostEl.style.background = "var(--primary)"
      ghostEl.style.borderColor = "var(--primary)"
      const label = ghostEl.querySelector("[data-ghost-label]") as HTMLElement | null
      if (label) {
        label.textContent = drag.empName
        label.style.color = "var(--primary-foreground)"
        label.style.background = "transparent"
      }
    },
    [getGridXY, getCategoryAtY, getDateIdx, getHourAtX]
  )

  const onStaffPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!staffDragRef.current) return
      commitStaffDropAtClientXY(e.clientX, e.clientY)
      clearStaffDrag()
    },
    [commitStaffDropAtClientXY, clearStaffDrag]
  )

  const onStaffPointerCancel = useCallback(() => {
    if (!staffDragRef.current) return
    clearStaffDrag()
  }, [clearStaffDrag])

  useEffect(() => {
    if (!isStaffDragging) return
    document.addEventListener("pointermove", onStaffPointerMove, { capture: true })
    document.addEventListener("pointerup", onStaffPointerUp, { capture: true })
    document.addEventListener("pointercancel", onStaffPointerCancel, { capture: true })
    return () => {
      document.removeEventListener("pointermove", onStaffPointerMove, { capture: true })
      document.removeEventListener("pointerup", onStaffPointerUp, { capture: true })
      document.removeEventListener("pointercancel", onStaffPointerCancel, { capture: true })
    }
  }, [isStaffDragging, onStaffPointerMove, onStaffPointerUp, onStaffPointerCancel])

  /** Compute the lane (track) a block occupies in its row at the moment of drag start.
   *  Used so the ghost renders at the correct vertical slot instead of always at lane 0. */
  const getSrcTrack = useCallback((shift: Block): { srcTrack: number; srcCategoryKey: string } => {
    const rowKey = (effectiveRowMode === "individual" || effectiveRowMode === "flat")
      ? `emp:${shift.employeeId}`
      : `cat:${shift.categoryId}`
    // Find the day's shifts for this block's row — same logic as render path
    const dayKey = `${shift.categoryId}:${shift.date}`
    const dayShifts = shiftIndex.get(dayKey) ?? []
    const filtered = (effectiveRowMode === "individual" || effectiveRowMode === "flat")
      ? dayShifts.filter((s) => s.employeeId === shift.employeeId)
      : dayShifts
    const sorted = [...filtered].sort((a, b) => a.startH - b.startH)
    const trackNums = packShifts(sorted)
    const idx = sorted.findIndex((s) => s.id === shift.id)
    const srcTrack = idx >= 0 ? (trackNums[idx] ?? 0) : 0
    return { srcTrack, srcCategoryKey: rowKey }
  }, [shiftIndex, effectiveRowMode])

  // ── Dependency draw handlers ──────────────────────────────────────────────
  // ── Dep-draw: stable handler refs so addEventListener/removeEventListener identity is constant ──
  const depMoveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const depUpHandlerRef   = useRef<((e: PointerEvent) => void) | null>(null)

  // Keep onDependenciesChange + dependencies in a ref so handlers are never stale
  const onDependenciesChangeRef = useRef(onDependenciesChange)
  const dependenciesRef = useRef(dependencies)
  onDependenciesChangeRef.current = onDependenciesChange
  dependenciesRef.current = dependencies

  const startDepDraw = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    shift: Block,
    side: "top" | "right" | "bottom" | "left"
  ) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const el = blockRefsRef.current[shift.id]
    if (!el || !scrollRef.current) return
    const scrollEl = scrollRef.current
    const scrollRect = scrollEl.getBoundingClientRect()
    const br = el.getBoundingClientRect()
    const dotX = scrollEl.scrollLeft + (
      side === "left"   ? br.left  - scrollRect.left :
      side === "right"  ? br.right - scrollRect.left :
      br.left + br.width / 2 - scrollRect.left
    )
    const dotY = scrollEl.scrollTop + (
      side === "top"    ? br.top    - scrollRect.top :
      side === "bottom" ? br.bottom - scrollRect.top :
      br.top + br.height / 2 - scrollRect.top
    ) - HOUR_HDR_H
    depDragRef.current = { fromId: shift.id, fromSide: side, startX: dotX, startY: dotY, curX: dotX, curY: dotY }

    // Create live preview path in the dep SVG layer
    if (depSvgRef.current && !depPreviewPathRef.current) {
      depSvgRef.current.style.pointerEvents = "auto"
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      path.setAttribute("fill", "none")
      path.setAttribute("stroke", "var(--primary)")
      path.setAttribute("stroke-width", "2")
      path.setAttribute("stroke-dasharray", "6 3")
      path.setAttribute("opacity", "0.8")
      path.setAttribute("marker-end", "url(#dep-preview-arrow)")
      depPreviewPathRef.current = path
      depSvgRef.current.appendChild(path)
    }

    // Define handlers and store in refs so removeEventListener works by identity
    const onMove = (ev: PointerEvent) => {
      const drag = depDragRef.current
      if (!drag || !scrollRef.current) return
      const sEl = scrollRef.current
      const r = sEl.getBoundingClientRect()
      drag.curX = sEl.scrollLeft + ev.clientX - r.left
      drag.curY = sEl.scrollTop  + ev.clientY - r.top - HOUR_HDR_H
      const p = depPreviewPathRef.current
      if (p) {
        const cp = Math.max(Math.abs(drag.curX - drag.startX) * 0.5, 40)
        p.setAttribute("d", `M ${drag.startX} ${drag.startY} C ${drag.startX + cp} ${drag.startY}, ${drag.curX - cp} ${drag.curY}, ${drag.curX} ${drag.curY}`)
      }
      let hoverId: string | null = null
      for (const [id, bEl] of Object.entries(blockRefsRef.current)) {
        if (!bEl || id === drag.fromId) continue
        const br2 = bEl.getBoundingClientRect()
        if (ev.clientX >= br2.left && ev.clientX <= br2.right && ev.clientY >= br2.top && ev.clientY <= br2.bottom) {
          hoverId = id; break
        }
      }
      setDepHoveredBlockId(hoverId)
    }

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      depMoveHandlerRef.current = null
      depUpHandlerRef.current   = null
      const drag = depDragRef.current
      depDragRef.current = null
      if (depPreviewPathRef.current) { depPreviewPathRef.current.remove(); depPreviewPathRef.current = null }
      if (depSvgRef.current) depSvgRef.current.style.pointerEvents = "none"
      setDepHoveredBlockId(null)
      if (!drag || !onDependenciesChangeRef.current) return
      let targetId: string | null = null
      for (const [id, bEl] of Object.entries(blockRefsRef.current)) {
        if (!bEl || id === drag.fromId) continue
        const br2 = bEl.getBoundingClientRect()
        if (ev.clientX >= br2.left && ev.clientX <= br2.right && ev.clientY >= br2.top && ev.clientY <= br2.bottom) {
          targetId = id; break
        }
      }
      if (!targetId) return
      const type: ShiftDependency["type"] =
        drag.fromSide === "left"  ? "start-to-start" :
        drag.fromSide === "top"   ? "start-to-start" :
        "finish-to-start"
      const newDep: ShiftDependency = {
        id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromId: drag.fromId,
        toId: targetId,
        type,
        color: "var(--primary)",
      }
      onDependenciesChangeRef.current([...dependenciesRef.current, newDep])
    }

    depMoveHandlerRef.current = onMove
    depUpHandlerRef.current   = onUp
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup",   onUp)
  }, [])

  /** Render dependency connection handles — clearly outside the block like Bryntum */
  const renderDepDots = useCallback((shift: Block, isVisible: boolean) => {
    if (!isVisible || !onDependenciesChange) return null
    return (
      <>
        {/* Start port — left edge */}
        <div
          data-dep-dot="left"
          onPointerDown={(e) => startDepDraw(e, shift, "left")}
          title="Drag to create start dependency"
          className="absolute -left-3.5 top-1/2 z-30 size-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-background bg-primary shadow-[0_0_0_2px_var(--primary)]"
        />
        {/* Finish port — right edge */}
        <div
          data-dep-dot="right"
          onPointerDown={(e) => startDepDraw(e, shift, "right")}
          title="Drag to create finish dependency"
          className="absolute -right-3.5 top-1/2 z-30 size-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-background bg-primary shadow-[0_0_0_2px_var(--primary)]"
        />
      </>
    )
  }, [onDependenciesChange, startDepDraw])

  const onBD = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, shift: Block): void => {
      if (e.button !== 0) return
      if (readOnly) return
      if (shift.draggable === false) return
      if ((e.target as HTMLElement).dataset.resize) return
      if (gridPointerIdsRef.current.size >= 2) return
      // Multi-select: shift+click selects without dragging
      if (e.shiftKey) {
        toggleBlockSelect(shift.id, true)
        return
      }

      const isTouch = e.pointerType === "touch"
      const blockEl = e.currentTarget as HTMLElement
      const cat = CATEGORIES.find((c) => c.id === shift.categoryId)
      const color = cat ? getColor(cat.colorIdx).bg : "var(--primary)"

      const startDrag = (captureEvent: React.PointerEvent<HTMLDivElement> | PointerEvent): void => {
        const el = blockEl
        el.setPointerCapture(
          "pointerId" in captureEvent ? captureEvent.pointerId : e.pointerId
        )
        const { x, y } = getGridXY(e.clientX, e.clientY)
        // Capture grab offset + grid rect ONCE here — avoids getBoundingClientRect on every pointermove
        const blockRect = blockEl ? blockEl.getBoundingClientRect() : null
        const gRect = scrollRef.current?.getBoundingClientRect() ?? null
        const grabOffsetX = blockRect ? e.clientX - blockRect.left : 0
        const grabOffsetY = blockRect ? e.clientY - blockRect.top : ghostBarH / 2
        const { srcTrack, srcCategoryKey } = getSrcTrack(shift)
        ds.current = {
          type: "move",
          id: shift.id,
          sx: x, sy: y,
          startH: shift.startH,
          endH: shift.endH,
          categoryId: shift.categoryId,
          empId: shift.employeeId,
          dur: shift.endH - shift.startH,
          blockEl,
          blockColor: color,
          grabOffsetX,
          grabOffsetY,
          gridRect: gRect,
          srcTrack,
          srcCategoryKey,
        }
        setDragId(shift.id)
        setActivatingBlockId(null)
        if (navigator.vibrate) navigator.vibrate(30)
      }

      if (!isTouch) {
        // Desktop: require ≥4px movement before committing to drag mode
        // This prevents accidental drags when the user just clicks a block
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        const downX = e.clientX
        const downY = e.clientY
        const DESKTOP_DRAG_THRESHOLD = 4

        const onMove = (mv: PointerEvent): void => {
          if (Math.hypot(mv.clientX - downX, mv.clientY - downY) >= DESKTOP_DRAG_THRESHOLD) {
            document.removeEventListener("pointermove", onMove, { capture: true })
            document.removeEventListener("pointerup", onUp, { capture: true })
            startDrag(mv as unknown as React.PointerEvent<HTMLDivElement>)
          }
        }
        const onUp = (): void => {
          document.removeEventListener("pointermove", onMove, { capture: true })
          document.removeEventListener("pointerup", onUp, { capture: true })
        }
        document.addEventListener("pointermove", onMove, { capture: true })
        document.addEventListener("pointerup", onUp, { capture: true })
        return
      }

      // Touch: start a long press timer — let scroll work until threshold
      e.stopPropagation()
      blockLongPressIdRef.current = shift.id
      const startX = e.clientX
      const startY = e.clientY

      // Show activating feedback at 200ms
      const activateTimer = setTimeout(() => setActivatingBlockId(shift.id), 200)

      blockLongPressTimerRef.current = setTimeout(() => {
        blockLongPressTimerRef.current = null
        clearTimeout(activateTimer)
        if (blockLongPressIdRef.current !== shift.id) return
        startDrag(e)
      }, LONG_PRESS_DELAY_MS)

      // Cancel long press if finger moves too much (user is scrolling)
      const onMove = (ev: PointerEvent): void => {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > LONG_PRESS_MOVE_THRESHOLD_PX) {
          clearTimeout(activateTimer)
          clearBlockLongPress()
          document.removeEventListener("pointermove", onMove, { capture: true })
          document.removeEventListener("pointerup", onUp, { capture: true })
        }
      }
      const onUp = (): void => {
        clearTimeout(activateTimer)
        clearBlockLongPress()
        document.removeEventListener("pointermove", onMove, { capture: true })
        document.removeEventListener("pointerup", onUp, { capture: true })
      }
      document.addEventListener("pointermove", onMove, { capture: true })
      document.addEventListener("pointerup", onUp, { capture: true })
    },
    [getGridXY, readOnly, toggleBlockSelect, CATEGORIES, getColor, clearBlockLongPress, getSrcTrack]
  )

  const onRRD = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, shift: Block): void => {
      if (e.button !== 0) return
      if (readOnly) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x } = getGridXY(e.clientX, e.clientY)
      const { srcTrack, srcCategoryKey } = getSrcTrack(shift)
      ds.current = {
        type: "resize-right",
        id: shift.id,
        sx: x,
        sy: 0,
        startH: shift.startH,
        endH: shift.endH,
        categoryId: shift.categoryId,
        empId: shift.employeeId,
        dur: 0,
        blockEl: null,
        blockColor: "",
        grabOffsetX: 0,
        grabOffsetY: 0,
        gridRect: scrollRef.current?.getBoundingClientRect() ?? null,
        srcTrack,
        srcCategoryKey,
      }
      setDragId(shift.id)
    },
    [getGridXY, readOnly, getSrcTrack]
  )

  const onRLD = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, shift: Block): void => {
      if (e.button !== 0) return
      if (readOnly) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x } = getGridXY(e.clientX, e.clientY)
      const { srcTrack, srcCategoryKey } = getSrcTrack(shift)
      ds.current = {
        type: "resize-left",
        id: shift.id,
        sx: x,
        sy: 0,
        startH: shift.startH,
        endH: shift.endH,
        categoryId: shift.categoryId,
        empId: shift.employeeId,
        dur: 0,
        blockEl: null,
        blockColor: "",
        grabOffsetX: 0,
        grabOffsetY: 0,
        gridRect: scrollRef.current?.getBoundingClientRect() ?? null,
        srcTrack,
        srcCategoryKey,
      }
      setDragId(shift.id)
    },
    [getGridXY, readOnly, getSrcTrack]
  )


  const onBlockKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, shift: Block, category: Resource): void => {
      if (e.key === "Tab") {
        const idx = orderedBlockIds.indexOf(shift.id)
        if (idx < 0) return
        const nextIdx = e.shiftKey ? idx - 1 : idx + 1
        const nextId = orderedBlockIds[nextIdx]
        if (nextId) {
          e.preventDefault()
          blockRefsRef.current[nextId]?.focus()
        }
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        if (!readOnly) onShiftClick(shift, category)
        return
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (readOnly) return
        e.preventDefault()
        if (onDeleteShift) setShiftToDeleteConfirm(shift)
        return
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (readOnly) return
        e.preventDefault()
        const dir = e.key === "ArrowRight" ? 1 : -1
        const newStart = snapLocal(clamp(shift.startH + dir * snapHours, 0, (allowOvernight ? 48 : 24) - (shift.endH - shift.startH)))
        const dur = shift.endH - shift.startH
        const newEnd = snapLocal(clamp(newStart + dur, 0, allowOvernight ? 48 : 24))
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shift.id ? { ...s, startH: newStart, endH: newEnd } : s
          )
        )
        onBlockMoved?.(shift, shift.date, newStart, newEnd)
        onBlockMove?.({ ...shift, startH: newStart, endH: newEnd })
        return
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (readOnly) return
        e.preventDefault()
        const catIdx = CATEGORIES.findIndex((c) => c.id === shift.categoryId)
        if (catIdx < 0) return
        const nextIdx = e.key === "ArrowUp" ? catIdx - 1 : catIdx + 1
        const nextCat = categories[nextIdx]
        if (!nextCat) return
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shift.id ? { ...s, categoryId: nextCat.id } : s
          )
        )
        onBlockMoved?.(shift, shift.date, shift.startH, shift.endH)
        onBlockMove?.({ ...shift, categoryId: nextCat.id })
        return
      }
    },
    [
      orderedBlockIds,
      onShiftClick,
      onDeleteShift,
      snapLocal,
      snapHours,
      setShifts,
      CATEGORIES,
      categories,
      onBlockMoved,
      readOnly,
      onBlockMove,
    ]
  )

  // ── Edge-scroll RAF loop ─────────────────────────────────────────────────
  // Runs independently of pointermove so scroll continues even if pointer stops moving.
  // Speed scales with proximity to edge: max 1.0 at the very edge, 0.0 at EDGE_SCROLL_ZONE.
  const EDGE_SCROLL_ZONE = 80
  const EDGE_SCROLL_MAX = 20   // px per frame at full speed

  const stopEdgeScroll = useCallback(() => {
    if (edgeRafRef.current !== null) {
      cancelAnimationFrame(edgeRafRef.current)
      edgeRafRef.current = null
    }
    edgeScrollRef.current = null
  }, [])

  const startEdgeScroll = useCallback((dirX: number, speedX: number, dirY: number, speedY: number) => {
    edgeScrollRef.current = { dirX, speedX, dirY, speedY }
    if (edgeRafRef.current !== null) return  // already running
    const tick = () => {
      const state = edgeScrollRef.current
      if (!state || !scrollRef.current || !ds.current) {
        stopEdgeScroll()
        return
      }
      if (state.dirX !== 0) {
        scrollRef.current.scrollLeft += state.dirX * state.speedX * EDGE_SCROLL_MAX
        
      }
      if (state.dirY !== 0) {
        scrollRef.current.scrollTop += state.dirY * state.speedY * EDGE_SCROLL_MAX
      }
      edgeRafRef.current = requestAnimationFrame(tick)
    }
    edgeRafRef.current = requestAnimationFrame(tick)
  }, [stopEdgeScroll])

  const onPM = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (longPressPointerIdRef.current === e.pointerId && longPressStartRef.current) {
        const dx = e.clientX - longPressStartRef.current.x
        const dy = e.clientY - longPressStartRef.current.y
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD_PX) clearLongPress()
      }
      if (pinchPointersRef.current.has(e.pointerId)) {
        pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pinchPointersRef.current.size === 2 && initialPinchDistRef.current !== null) {
          const [[, a], [, b]] = Array.from(pinchPointersRef.current)
          const dist = Math.hypot(b.x - a.x, b.y - a.y)
          if (dist > 0) {
            const scale = dist / initialPinchDistRef.current
            const newZoom = clamp(
              initialZoomRef.current * scale,
              ZOOM_LEVELS[0],
              ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
            )
            const nearest = ZOOM_LEVELS.reduce((prev, curr) =>
              Math.abs(curr - newZoom) < Math.abs(prev - newZoom) ? curr : prev
            )
            if (setZoom) setZoom(nearest)
            else onPinchZoom?.(nearest)
          }
        }
      }
      if (!ds.current) return
      const d = ds.current
      const { x, y } = getGridXY(e.clientX, e.clientY)
      const newCat = getCategoryAtY(y)
      const di = getDateIdx(x)

      // Auto-scroll when dragging near edges — both horizontal (week/multiday) and vertical (all views)
      if (d.type === "move" && scrollRef.current) {
        const sr = d.gridRect
        if (sr) {
          const px = e.clientX - sr.left
          const py = e.clientY - sr.top
          const vw = sr.width
          const vh = sr.height
          let dirX = 0, speedX = 0, dirY = 0, speedY = 0
          // Horizontal — only in week/multiday where days scroll sideways
          if (isWeekView || isDayViewMultiDay) {
            if (px < EDGE_SCROLL_ZONE && px >= 0) {
              dirX = -1; speedX = Math.max(0.1, 1 - px / EDGE_SCROLL_ZONE)
            } else if (px > vw - EDGE_SCROLL_ZONE && px <= vw) {
              dirX = 1; speedX = Math.max(0.1, 1 - (vw - px) / EDGE_SCROLL_ZONE)
            }
          }
          // Vertical — all views (reach rows that are off-screen above/below)
          if (py < EDGE_SCROLL_ZONE && py >= 0) {
            dirY = -1; speedY = Math.max(0.1, 1 - py / EDGE_SCROLL_ZONE)
          } else if (py > vh - EDGE_SCROLL_ZONE && py <= vh) {
            dirY = 1; speedY = Math.max(0.1, 1 - (vh - py) / EDGE_SCROLL_ZONE)
          }
          if (dirX !== 0 || dirY !== 0) {
            startEdgeScroll(dirX, speedX, dirY, speedY)
          } else {
            stopEdgeScroll()
          }
        }
      }

      let ns: number, ne: number, categoryId: string, dayDelta: number
      if (d.type === "move") {
        const dx = x - d.sx
        const di0 = isWeekView || isDayViewMultiDay ? getDateIdx(d.sx) : 0
        const di1 = getDateIdx(x)
        dayDelta = di1 - di0
        ns =
          dayDelta !== 0
            ? snapH(clamp(getHourAtX(x, di1), 0, 24 - d.dur))
            : (() => {
                const hourOffset = isWeekView ? snapH(dx / PX_WEEK) : snapH(dx / HOUR_W)
                return snapH(clamp(d.startH + hourOffset, 0, 24 - d.dur))
              })()
        ne = ns + d.dur
        categoryId = newCat.id
      } else if (d.type === "resize-right") {
        const pxPerH = isWeekView ? PX_WEEK : isDayViewMultiDay ? HOUR_W : HOUR_W
        ne = snapH(clamp(d.endH + (x - d.sx) / pxPerH, d.startH + SNAP, allowOvernight ? 48 : 24))
        ns = d.startH
        categoryId = d.categoryId
        dayDelta = 0
      } else {
        const pxPerH = isWeekView ? PX_WEEK : isDayViewMultiDay ? HOUR_W : HOUR_W
        ns = snapH(clamp(d.startH + (x - d.sx) / pxPerH, 0, d.endH - SNAP))
        ne = d.endH
        categoryId = d.categoryId
        dayDelta = 0
      }

      const lay = layoutRef.current
      const orig = lay.shifts.find((s) => s.id === d.id)
      const cat = lay.CATEGORIES.find((c) => c.id === categoryId)
      const ghostEl = ghostRef.current
      // Update hovered row highlight
      const newId = cat?.id ?? null
      if (newId !== hoveredCategoryId.current) {
        hoveredCategoryId.current = newId
        // Direct DOM update — no React re-render
        const el = rowHoverHighlightRef.current
        if (el) {
          if (!newId || !dragId) {
            el.style.display = 'none'
          } else {
            const top = categoryTops[newId] ?? 0
            const h = categoryHeights[newId] ?? 0
            const hovCat = SORTED_CATEGORIES.find(c => c.id === newId)
            const col = hovCat ? getColor(hovCat.colorIdx) : null
            if (col) {
              el.style.display = 'block'
              el.style.top = `${top}px`
              el.style.height = `${h}px`
              el.style.background = `${col.bg}12`
              el.style.borderTop = `2px solid ${col.bg}44`
              el.style.borderBottom = `2px solid ${col.bg}44`
            }
          }
        }
      }
      if (!orig || !cat || lay.collapsed.has(cat.id) || !ghostEl) {
        if (ghostEl) ghostEl.style.display = "none"
        return
      }

      // Find the flat row the cursor is currently over — this is where the ghost should render.
      // Previously used origShift.employeeId (source row) which locked the ghost to the origin row.
      const hoveredRow = lay.flatRows.find((row) => {
        const k = row.kind === "employee" && row.employee
          ? `emp:${row.employee.id}`
          : `cat:${row.category.id}`
        const t = lay.categoryTops[k] ?? 0
        const h = lay.categoryHeights[k] ?? 0
        return y >= t && y < t + h
      }) ?? null
      const ghostKey = hoveredRow
        ? hoveredRow.kind === "employee" && hoveredRow.employee
          ? `emp:${hoveredRow.employee.id}`
          : `cat:${hoveredRow.category.id}`
        : `cat:${cat.id}`
      const top = lay.categoryTops[ghostKey]
        ?? lay.categoryTops[`cat:${cat.id}`]
        ?? lay.categoryTops[cat.id]
        ?? 0
      const rowH = lay.categoryHeights[ghostKey]
        ?? lay.categoryHeights[`cat:${cat.id}`]
        ?? lay.categoryHeights[cat.id]
        ?? 40
      let left: number, width: number
      if (isWeekView) {
        const origDi = lay.dates.findIndex((dt) => sameDay(dt, orig.date))
        const newDi = clamp(origDi + dayDelta, 0, lay.dates.length - 1)
        left = newDi * COL_W_WEEK + (ns - settings.visibleFrom) * PX_WEEK
        width = Math.max((ne - ns) * PX_WEEK - 2, 8)
      } else if (isDayViewMultiDay) {
        const origDi = lay.dates.findIndex((dt) => sameDay(dt, orig.date))
        const newDi = clamp(origDi + dayDelta, 0, lay.dates.length - 1)
        const cs = Math.max(ns, settings.visibleFrom)
        const ce = Math.min(ne, settings.visibleTo)
        if (ce <= cs) {
          ghostEl.style.display = "none"
          return
        }
        left = newDi * DAY_WIDTH + (cs - settings.visibleFrom) * HOUR_W + 2
        width = Math.max((ce - cs) * HOUR_W - 4, 10)
      } else {
        const cs = Math.max(ns, settings.visibleFrom)
        const ce = Math.min(ne, settings.visibleTo)
        if (ce <= cs) {
          ghostEl.style.display = "none"
          return
        }
        left = (cs - settings.visibleFrom) * HOUR_W + 2
        width = Math.max((ce - cs) * HOUR_W - 4, 10)
      }
      const isEmployeeGhostRow = ghostKey.startsWith("emp:")
      // In individual/flat rows there is no category header above the lane content.
      // Adding ROLE_HDR there causes the drag ghost to sit too low in Day view.
      const headerOffset = !isEmployeeGhostRow && effectiveRowMode === "category" ? ROLE_HDR : 0
      const pixelTop =
        top +
        headerOffset +
        (ghostKey === d.srcCategoryKey ? d.srcTrack : 0) * laneH +
        (isSingleDayTimeline ? 2 : 3)
      const c = getColor(cat.colorIdx)

      // ── Snapped drop-zone ghost: real card appearance, no dashed border ──
      ghostEl.style.display = "flex"
      ghostEl.style.left = "0"
      ghostEl.style.top = "0"
      ghostEl.style.width = `${width}px`
      ghostEl.style.height = `${ghostBarH}px`
      ghostEl.style.transform = `translate(${left}px, ${pixelTop}px)`
      ghostEl.style.background = `${c.bg}22`
      ghostEl.style.border = `2px solid ${c.bg}88`
      ghostEl.style.borderRadius = "6px"
      ghostEl.style.boxShadow = `inset 0 0 0 1px ${c.bg}44`
      const label = ghostEl.querySelector("[data-ghost-label]") as HTMLElement | null
      if (label) {
        label.textContent = `${fmt12(ns)}–${fmt12(ne)}`
        label.style.color = c.bg
        label.style.background = "transparent"
        label.style.fontWeight = "700"
      }

      // ── Floating resize label near cursor — shows live time next to handle ──
      const resizeLabelEl = resizeLabelRef.current
      if (resizeLabelEl && (d.type === "resize-right" || d.type === "resize-left")) {
        const sr = d.gridRect
        if (sr) {
          // Position near cursor, offset slightly so it doesn't cover the handle
          const labelX = (scrollRef.current?.scrollLeft ?? 0) + (e.clientX - sr.left) + (d.type === "resize-right" ? 12 : -72)
          const labelY = (scrollRef.current?.scrollTop ?? 0) + (e.clientY - sr.top) - 24
          resizeLabelEl.style.display = "flex"
          resizeLabelEl.style.transform = `translate(${labelX}px, ${labelY}px)`
          resizeLabelEl.textContent = d.type === "resize-right" ? `→ ${fmt12(ne)}` : `${fmt12(ns)} ←`
          resizeLabelEl.style.background = c.bg
        }
      }

      // ── Real block follows cursor — lifted card feel ─────────────────────────
      // Write transform via RAF to decouple from React event timing.
      // dragPointerRef is updated every pointermove; RAF reads it once per frame.
      if (d.type === "move") {
        dragPointerRef.current = { clientX: e.clientX, clientY: e.clientY }
        if (dragRafRef.current === null) {
          const rafLoop = () => {
            const pos = dragPointerRef.current
            const drag = ds.current
            if (!pos || !drag || drag.type !== "move") { dragRafRef.current = null; return }
            const sr = drag.gridRect
            if (sr) {
              const cursorLeft = (scrollRef.current?.scrollLeft ?? 0) + (pos.clientX - sr.left) - drag.grabOffsetX
              const cursorTop  = (scrollRef.current?.scrollTop  ?? 0) + (pos.clientY - sr.top)  - drag.grabOffsetY
              const liftedEl = blockRefsRef.current[drag.id]
              if (liftedEl) liftedEl.style.transform = `translate(${cursorLeft}px, ${cursorTop}px)`
            }
            dragRafRef.current = requestAnimationFrame(rafLoop)
          }
          dragRafRef.current = requestAnimationFrame(rafLoop)
        }
      }
    },
    [getGridXY, getCategoryAtY, getDateIdx, isWeekView, isDayViewMultiDay, COL_W_WEEK, DAY_WIDTH, PX_WEEK, HOUR_W, clearLongPress, setZoom, onPinchZoom, settings.visibleFrom, settings.visibleTo, getColor]
  )


  const onPC = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      // Reset lifted block transform before nulling ds so we have the id
      if (ds.current?.type === "move") {
        const el = blockRefsRef.current[ds.current.id]
        if (el) el.style.transform = ""
      }
      if (dragRafRef.current !== null) { cancelAnimationFrame(dragRafRef.current); dragRafRef.current = null }
      dragPointerRef.current = null
      ds.current = null
      setDragId(null)
      hoveredCategoryId.current = null; if (rowHoverHighlightRef.current) rowHoverHighlightRef.current.style.display = "none"
      clearBlockLongPress()
      stopEdgeScroll()
      if (ghostRef.current) ghostRef.current.style.display = "none"
          if (resizeLabelRef.current) resizeLabelRef.current.style.display = "none"    },
    [clearBlockLongPress, stopEdgeScroll]

  )

  const onPU = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!ds.current) return
      const d = ds.current
      const { x, y } = getGridXY(e.clientX, e.clientY)
      const newCat = getCategoryAtY(y)
      if (d.type === "move") {
        // Guard: if the drop target is a collapsed category, treat as a cancel — don't commit
        if (collapsed.has(newCat.id)) {
          const el = blockRefsRef.current[d.id]
          if (el) el.style.transform = ""
          ds.current = null
          setDragId(null)
          hoveredCategoryId.current = null; if (rowHoverHighlightRef.current) rowHoverHighlightRef.current.style.display = "none"
          stopEdgeScroll()
          if (ghostRef.current) ghostRef.current.style.display = "none"
          if (resizeLabelRef.current) resizeLabelRef.current.style.display = "none"
          return
        }
        const di0 = isWeekView || isDayViewMultiDay ? getDateIdx(d.sx) : 0
        const di1 = getDateIdx(x)
        const dayDelta = di1 - di0
        const ns =
          dayDelta !== 0
            ? snapLocal(clamp(getHourAtX(x, di1), 0, 24 - d.dur))
            : snapLocal(
                clamp(
                  d.startH + (isWeekView ? snapLocal((x - d.sx) / PX_WEEK) : snapLocal((x - d.sx) / HOUR_W)),
                  0,
                  24 - d.dur
                )
              )
        const origShift = shifts.find((x) => x.id === d.id)
        const newDateIdx = origShift
          ? clamp(dates.findIndex((dt) => sameDay(dt, origShift.date)) + dayDelta, 0, dates.length - 1)
          : 0
        const newDate = isWeekView || isDayViewMultiDay
          ? toDateISO(dates[newDateIdx])
          : (() => {
              // Single-day view: dragging past the right edge → next day, past left edge → prev day
              // x is relative to the scroll container which includes the sidebar, so offset by sidebar width
              if (!origShift) return ""
              const origD = new Date(origShift.date + "T12:00:00")
              const effectiveSidebarW = sidebarCollapsed ? 0 : sidebarWidth
              if (x > effectiveSidebarW + DAY_WIDTH) {
                origD.setDate(origD.getDate() + 1)
              } else if (x < effectiveSidebarW) {
                origD.setDate(origD.getDate() - 1)
              }
              return toDateISO(origD)
            })()
        if (origShift && wouldConflictAt(shifts, d.id, { date: newDate, categoryId: newCat.id, startH: ns, endH: ns + d.dur })) {
          setDropConflictId(d.id)
          setTimeout(() => setDropConflictId(null), 800)
          const conflictEl = blockRefsRef.current[d.id]
          if (conflictEl) conflictEl.style.transform = ""
          ds.current = null
          setDragId(null)
          hoveredCategoryId.current = null; if (rowHoverHighlightRef.current) rowHoverHighlightRef.current.style.display = "none"
          stopEdgeScroll()
          if (ghostRef.current) ghostRef.current.style.display = "none"
          if (resizeLabelRef.current) resizeLabelRef.current.style.display = "none"
          return
        }
      }
      // Normal successful drop — reset transform before React re-renders position
      const droppedEl = blockRefsRef.current[d.id]
      if (droppedEl) droppedEl.style.transform = ""
      if (dragRafRef.current !== null) { cancelAnimationFrame(dragRafRef.current); dragRafRef.current = null }
      dragPointerRef.current = null
      ds.current = null
      setDragId(null)
      hoveredCategoryId.current = null; if (rowHoverHighlightRef.current) rowHoverHighlightRef.current.style.display = "none"
      stopEdgeScroll()
      if (ghostRef.current) ghostRef.current.style.display = "none"
          if (resizeLabelRef.current) resizeLabelRef.current.style.display = "none"
      // React guard: never call setState (setCategoryWarn) inside another setState updater.
      // We capture the warning payload while mapping, then commit it after setShifts finishes.
      let categoryWarnPayload: CategoryWarnState | null = null
      setShifts((prev) => {
        const next = prev.map((s) => {
          if (s.id !== d.id) return s
          const origEmp = ALL_EMPLOYEES.find((emp) => emp.id === s.employeeId)

          if (d.type === "move") {
            const di0 = isWeekView || isDayViewMultiDay ? getDateIdx(d.sx) : 0
            const di1 = getDateIdx(x)
            const dayDelta = di1 - di0
            const ns =
              dayDelta !== 0
                ? snapLocal(clamp(getHourAtX(x, di1), 0, 24 - d.dur))
                : snapLocal(
                    clamp(
                      d.startH + (isWeekView ? snapLocal((x - d.sx) / PX_WEEK) : snapLocal((x - d.sx) / HOUR_W)),
                      0,
                      24 - d.dur
                    )
                  )
            const origDateIdx = dates.findIndex((dt) => sameDay(dt, s.date))
            const newDateIdx = clamp(origDateIdx + dayDelta, 0, dates.length - 1)
            const newDate =
              isWeekView || isDayViewMultiDay ? toDateISO(dates[newDateIdx]) : s.date

            if (newCat.id !== s.categoryId && origEmp && origEmp.categoryId !== newCat.id) {
              categoryWarnPayload = { shift: s, newCategoryId: newCat.id, ns, ne: ns + d.dur, newDate }
              return s
            }
            const updated = { ...s, startH: ns, endH: ns + d.dur, categoryId: newCat.id, date: newDate }
            onBlockMove?.(updated)
            return updated
          } else if (d.type === "resize-right") {
            const ne = snapLocal(
              clamp(d.endH + (x - d.sx) / (isWeekView ? PX_WEEK : HOUR_W), d.startH + snapHours, allowOvernight ? 48 : 24)
            )
            const updated = { ...s, endH: ne }
            onBlockResize?.(updated)
            return updated
          } else {
            const ns = snapLocal(
              clamp(d.startH + (x - d.sx) / (isWeekView ? PX_WEEK : HOUR_W), 0, d.endH - snapHours)
            )
            const updated = { ...s, startH: ns }
            onBlockResize?.(updated)
            return updated
          }
        })
        if (d.type === "move") {
          const updated = next.find((x) => x.id === d.id)
          if (updated) onBlockMoved?.(updated, updated.date, updated.startH, updated.endH)
        }
        return next
      })

      // Commit the warning after state update evaluation to avoid "setState during render" warnings.
      if (categoryWarnPayload) setCategoryWarn(categoryWarnPayload)
    },
    [
      getGridXY,
      getCategoryAtY,
      getDateIdx,
      isWeekView,
      isDayViewMultiDay,
      COL_W_WEEK,
      DAY_WIDTH,
      PX_WEEK,
      HOUR_W,
      dates,
      shifts,
      setShifts,
      ALL_EMPLOYEES,
      snapLocal,
      snapHours,
      onBlockMoved,
      onBlockMove,
      onBlockResize,
      getHourAtX,
      collapsed,
      stopEdgeScroll,
      sidebarCollapsed,
      sidebarWidth,
    ]
  )

  // ── Rubber-band selection ────────────────────────────────────────────────
  const onRubberBandPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only start rubber-band on primary button, not on blocks/resize handles/empty-cell targets
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("[data-scheduler-block]") || target.closest("[data-resize]") || target.closest("[data-empty-cell]") || target.closest("[data-dep-dot]")) return
    if (ds.current) return // drag already active
    const el = scrollRef.current
    if (!el) return
    // NOTE: do NOT setPointerCapture here — capturing on every click routes
    // pointer events from Radix portals (context menu items) back to this element,
    // making context menu items unclickable. Only capture after the pointer has
    // moved enough to confirm this is actually a rubber-band drag, not a click.
    const downX = e.clientX
    const downY = e.clientY
    const pointerId = e.pointerId
    const RUBBER_BAND_THRESHOLD = 4
    const rect = el.getBoundingClientRect()
    const x0 = el.scrollLeft + e.clientX - rect.left
    const y0 = el.scrollTop  + e.clientY - rect.top
    selRectStartRef.current = { x: x0, y: y0, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }

    const onFirstMove = (mv: PointerEvent) => {
      if (Math.hypot(mv.clientX - downX, mv.clientY - downY) >= RUBBER_BAND_THRESHOLD) {
        document.removeEventListener("pointermove", onFirstMove, { capture: true })
        // Now we're sure it's a drag — capture the pointer
        const gridEl = gridRef.current
        if (gridEl) gridEl.setPointerCapture(pointerId)
        const r2 = el.getBoundingClientRect()
        const x1 = el.scrollLeft + mv.clientX - r2.left
        const y1 = el.scrollTop  + mv.clientY - r2.top
        setSelRect({ x0, y0, x1, y1 })
      }
    }
    const onCancel = () => {
      document.removeEventListener("pointermove", onFirstMove, { capture: true })
      document.removeEventListener("pointerup", onCancel, { capture: true })
      if (!selRect) selRectStartRef.current = null
    }
    document.addEventListener("pointermove", onFirstMove, { capture: true })
    document.addEventListener("pointerup", onCancel, { capture: true })
  }, [selRect])

  const onRubberBandPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!selRectStartRef.current) return
    const el = scrollRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x1 = el.scrollLeft + e.clientX - rect.left
    const y1 = el.scrollTop  + e.clientY - rect.top
    setSelRect({ x0: selRectStartRef.current.x, y0: selRectStartRef.current.y, x1, y1 })
  }, [])

  const onRubberBandPointerUp = useCallback(() => {
    if (!selRectStartRef.current || !selRect) { selRectStartRef.current = null; setSelRect(null); return }
    selRectStartRef.current = null
    // Compute normalised rect
    const minX = Math.min(selRect.x0, selRect.x1)
    const maxX = Math.max(selRect.x0, selRect.x1)
    const minY = Math.min(selRect.y0, selRect.y1)
    const maxY = Math.max(selRect.y0, selRect.y1)
    // Only activate if dragged at least 8px — prevents accidental selection on click
    if (maxX - minX < 8 && maxY - minY < 8) { setSelRect(null); return }
    // Find blocks whose DOM rects intersect the selection rect
    const newSelected = new Set<string>()
    for (const [id, el] of Object.entries(blockRefsRef.current)) {
      if (!el) continue
      const scrollEl = scrollRef.current
      if (!scrollEl) continue
      const scrollRect = scrollEl.getBoundingClientRect()
      const br = el.getBoundingClientRect()
      const bLeft  = scrollEl.scrollLeft + br.left  - scrollRect.left
      const bTop   = scrollEl.scrollTop  + br.top   - scrollRect.top
      const bRight = bLeft + br.width
      const bBot   = bTop  + br.height
      if (bRight > minX && bLeft < maxX && bBot > minY && bTop < maxY) {
        newSelected.add(id)
      }
    }
    if (newSelected.size > 0) setSelectedBlockIds(prev => new Set([...prev, ...newSelected]))
    setSelRect(null)
  }, [selRect])

  const onGridPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      gridPointerIdsRef.current.add(e.pointerId)
      const target = e.target as HTMLElement
      // Only primary button triggers swipe/long-press on empty cells.
      // Right-click (button=2) opens the context menu via onContextMenu — no timer needed.
      if (target.closest("[data-empty-cell]") && e.button === 0) {
        swipeStartRef.current = { x: e.clientX, y: e.clientY }
        longPressStartRef.current = { x: e.clientX, y: e.clientY }
        longPressPointerIdRef.current = e.pointerId
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null
          const start = longPressStartRef.current
          longPressStartRef.current = null
          longPressPointerIdRef.current = null
          if (!start || !gridRef.current) return
          const { x: gx, y: gy } = getGridXY(start.x, start.y)
          const cat = getCategoryAtY(gy)
          const di = getDateIdx(gx)
          const hour = getHourAtX(gx, di)
          const date = dates[di]
          if (date) setAddPrompt({ date, categoryId: cat.id, hour })
        }, LONG_PRESS_DELAY_MS)
      }
      pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinchPointersRef.current.size === 2) {
        const [[, a], [, b]] = Array.from(pinchPointersRef.current)
        initialPinchDistRef.current = Math.hypot(b.x - a.x, b.y - a.y)
        initialZoomRef.current = zoom
      }
    },
    [getGridXY, getCategoryAtY, getHourAtX, getDateIdx, dates, zoom]
  )

  const onGridPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      cleanupPointer(e.pointerId)
      if (!ds.current && swipeStartRef.current && onSwipeNavigate) {
        const dx = e.clientX - swipeStartRef.current.x
        const dy = e.clientY - swipeStartRef.current.y
        if (Math.abs(dx) > SWIPE_MIN_DELTA_X_PX && Math.abs(dy) < SWIPE_MAX_DELTA_Y_PX) {
          onSwipeNavigate(dx > 0 ? -1 : 1)
        }
        swipeStartRef.current = null
      }
      onPURef.current(e as unknown as React.PointerEvent<HTMLDivElement>)
    },
    [cleanupPointer, onSwipeNavigate]
  )

  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      const target = document.activeElement as HTMLElement | null
      if (target?.getAttribute?.("data-block-id")) return
      e.preventDefault()
      onNavigate?.(e.key === "ArrowRight" ? 1 : -1)
    },
    [onNavigate]
  )

  const cleanupPointerRef = useRef(cleanupPointer)
  cleanupPointerRef.current = cleanupPointer
  // Document-level listeners ensure we capture pointerup even when pointer leaves grid (enables drag-to-other-day)
  const onPMRef = useRef(onPM)
  const onPURef = useRef(onPU)
  const onPCRef = useRef(onPC)
  onPMRef.current = onPM
  onPURef.current = onPU
  onPCRef.current = onPC

  // Native passive scroll listener — zero-lag header sync (fires before paint, no React overhead)
  // The React onScroll prop fires after React's batching delay causing header to lag behind grid
  const onWeekScrollRef = useRef(onWeekScroll)
  const onDayScrollRef = useRef(onDayScroll)
  onWeekScrollRef.current = onWeekScroll
  onDayScrollRef.current = onDayScroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: Event) => {
      // Immediately sync header — no React batching delay
      const el = e.currentTarget as HTMLDivElement
      const sl = el.scrollLeft
      const st = el.scrollTop
      // Set --sx CSS var for day-view sticky date label translateX
      el.style.setProperty("--sx", `${sl}px`)
    }
    el.addEventListener("scroll", handler, { passive: true })
    return () => el.removeEventListener("scroll", handler)
  }, [])  // empty deps — refs are stable
  useEffect(() => {
    if (!dragId) return
    const pm = (e: PointerEvent) => onPMRef.current(e as unknown as React.PointerEvent<HTMLDivElement>)
    const pu = (e: PointerEvent) => {
      cleanupPointerRef.current((e as PointerEvent).pointerId)
      onPURef.current(e as unknown as React.PointerEvent<HTMLDivElement>)
    }
    const pc = (e: PointerEvent) => {
      cleanupPointerRef.current((e as PointerEvent).pointerId)
      onPCRef.current(e as unknown as React.PointerEvent<HTMLDivElement>)
    }
    document.addEventListener("pointermove", pm, { capture: true })
    document.addEventListener("pointerup", pu, { capture: true })
    document.addEventListener("pointercancel", pc, { capture: true })
    return () => {
      document.removeEventListener("pointermove", pm, { capture: true })
      document.removeEventListener("pointerup", pu, { capture: true })
      document.removeEventListener("pointercancel", pc, { capture: true })
      stopEdgeScroll()
    }
  }, [dragId, stopEdgeScroll])

  const [nowH, setNowH] = useState(
    () => new Date().getHours() + new Date().getMinutes() / 60
  )
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setNowH(d.getHours() + d.getMinutes() / 60)
    }, 60000)
    return () => clearInterval(t)
  }, [])

  const todayIdx = dates.findIndex((d) => isToday(d))
  const nowInVisibleRange = nowH >= settings.visibleFrom && nowH < settings.visibleTo
  // When today is in the grid but current time is outside visible hours, still scroll to
  // today's column start (rather than position 0 which jumps to the far-left edge).
  const nowPositionPx =
    todayIdx >= 0
      ? isWeekView
        ? todayIdx * COL_W_WEEK + (nowInVisibleRange ? (nowH - settings.visibleFrom) * PX_WEEK : 0)
        : isDayViewMultiDay
          ? todayIdx * DAY_WIDTH + (nowInVisibleRange ? (nowH - settings.visibleFrom) * HOUR_W : 0)
          : (nowInVisibleRange ? (nowH - settings.visibleFrom) * HOUR_W : 0)
      : 0
  const scrollToNow = useScrollToNow(scrollRef, nowPositionPx)
  useEffect(() => {
    if (scrollToNowRef) scrollToNowRef.current = scrollToNow
    return () => {
      if (scrollToNowRef) scrollToNowRef.current = null
    }
  }, [scrollToNow, scrollToNowRef])
  useEffect(() => {
    if (!initialScrollToNow || !scrollRef.current) return
    // Double-RAF: first frame commits layout, second frame has correct scrollWidth/clientWidth
    let id1: number, id2: number
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        scrollToNow()
      })
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [initialScrollToNow])

  const currentCategory = isMobileSingleResource && categories[mobileResourceIndex!]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobileSingleResource && currentCategory && (
        <div
          className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-muted"
        >
          <button
            type="button"
            onClick={() => onMobileResourceChange?.(-1)}
            disabled={mobileResourceIndex! <= 0}
            aria-label="Previous resource"
            className="px-2 py-1 border-none bg-transparent text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm font-bold text-foreground">
            {currentCategory.name}
          </span>
          <button
            type="button"
            onClick={() => onMobileResourceChange?.(1)}
            disabled={mobileResourceIndex! >= categories.length - 1}
            aria-label="Next resource"
            className="px-2 py-1 border-none bg-transparent text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={isWeekView ? onWeekScroll : onDayScroll}
        className="relative flex min-h-0 min-w-0 flex-1 items-start"
      >
        {/* Sidebar — sticky left so it doesn't scroll horizontally */}
        <div
          className="relative z-22 shrink-0 flex flex-col border-r bg-background"
          style={{
            width: sidebarCollapsed ? 0 : sidebarWidth,
            minWidth: sidebarCollapsed ? 0 : sidebarWidth,
            transition: "width 150ms ease, min-width 150ms ease",
          }}
        >
          <GridViewSidebar
            sidebarCollapsed={sidebarCollapsed}
            sidebarWidth={sidebarWidth}
            setSidebarWidth={setSidebarWidth}
            toggleSidebar={toggleSidebar}
            HOUR_HDR_H={HOUR_HDR_H}
            ROLE_HDR={ROLE_HDR}
            sortBy={sortBy}
            sortDir={sortDir}
            toggleSort={toggleSort}
            flatRows={flatRows}
            rowVirtualizer={rowVirtualizer}
            totalHVirtual={totalHVirtual}
            ALL_EMPLOYEES={ALL_EMPLOYEES}
            baseShifts={shifts}
            isWeekView={!!isWeekView}
            isDayViewMultiDay={!!isDayViewMultiDay}
            focusedDate={focusedDate}
            dates={dates}
            selEmps={selEmps}
            collapsed={collapsed}
            toggleCollapse={toggleCollapse}
            hoveredCategoryId={null}
            setStaffPanel={setStaffPanel}
            setAddPrompt={setAddPrompt}
            slots={slots}
            categoryHeights={categoryHeights}
            dayOverviewStaffRail={timelineFillActive}
          />
        </div>

        {/* Grid column (ref: fluid hour width for single-day overview) */}
        <div ref={gridTimelineColRef} className="flex min-w-0 min-h-0 flex-1 flex-col">
          <div
            className="flex"
            style={{
              width: isWeekView || isDayViewMultiDay ? TOTAL_W : hasDayScrollNav ? TOTAL_W : DAY_WIDTH,
              minWidth:
                isWeekView || isDayViewMultiDay ? TOTAL_W : hasDayScrollNav ? TOTAL_W : DAY_WIDTH,
            }}
          >
            {hasDayScrollNav && (
              <div
                className="shrink-0"
                style={{ width: DAY_SCROLL_BUFFER, minWidth: DAY_SCROLL_BUFFER }}
              />
            )}
            <div
              className="flex shrink-0 flex-col"
              style={{
                width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
              }}
            >
              {/* ── Date / hour strip — sticky to scrollRef so it stays visible when scrolling the roster ── */}
              <div
                className={cn(
                  "sticky top-[64px] z-25 shrink-0 border-b-2 border-border",
                  isWeekView || isDayViewMultiDay ? "bg-muted" : "bg-background",
                )}
                style={{
                  width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  const scrollEl = scrollRef.current
                  if (!scrollEl) return
                  const rect = scrollEl.getBoundingClientRect()
                  const x = scrollEl.scrollLeft + e.clientX - rect.left
                  const di = isWeekView
                    ? Math.floor(x / COL_W_WEEK)
                    : isDayViewMultiDay ? Math.floor(x / DAY_WIDTH) : 0
                  const clampedDi = Math.max(0, Math.min(dates.length - 1, di))
                  const offsetX = isWeekView
                    ? x - clampedDi * COL_W_WEEK
                    : isDayViewMultiDay ? x - clampedDi * DAY_WIDTH : x
                  const hour = Math.max(settings.visibleFrom, Math.min(settings.visibleTo,
                    settings.visibleFrom + offsetX / (isWeekView ? PX_WEEK : HOUR_W)
                  ))
                  const markerDate = dates[clampedDi]
                  if (!markerDate) return
                  setHeaderPopover({ clientX: e.clientX, clientY: e.clientY, date: toDateISO(markerDate), hour: Math.round(hour * 4) / 4 })
                }}
              >
              <div
                className="flex shrink-0 flex-col"
                style={{
                  width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
                }}
              >
                {isWeekView && (
                  <div className="relative flex" style={{ width: TOTAL_W }}>
                    {/* ── Background + border layer (day columns) ── */}
                    {dates.map((d, i) => {
                      const today = isToday(d)
                      const closed = settings.workingHours[d.getDay()] === null
                      const dow = d.getDay()
                      const isWeekend = dow === 0 || dow === 6
                      const colBg = today
                        ? "color-mix(in srgb, var(--primary) 8%, var(--background))"
                        : closed ? "var(--muted)"
                        : isWeekend ? "color-mix(in srgb, var(--muted) 40%, var(--background))"
                        : "var(--background)"
                      return (
                        <div
                          key={`col-${i}`}
                          onDoubleClick={() => onDateDoubleClick?.(d)}
                          title={onDateDoubleClick ? "Double-click to open day view" : undefined}
                          className={cn(
                            "relative flex shrink-0 flex-col border-b border-schedule-day-line",
                            onDateDoubleClick ? "cursor-pointer" : "cursor-default",
                            i < dates.length - 1 ? "border-r-2 border-schedule-day-line" : "border-r border-schedule-day-line",
                          )}
                          style={{
                            width: COL_W_WEEK,
                            height: HOUR_HDR_H,
                            background: colBg,
                          }}
                        >
                          {/* ── Sticky date label: overflow:clip container + sticky left:0 inner ── */}
                          {(() => {
                            const dateISO = toDateISO(d)
                            const dayShiftCount = shifts.filter((s) => s.date === dateISO).length
                            return (
                              <div className="relative flex-[0_0_38px] overflow-clip">
                                {/* Absolute full-width overlay — flex centres the sticky child when column fully visible */}
                                <div
                                  className="pointer-events-none absolute left-0 top-0 z-2 flex justify-center overflow-clip"
                                  style={{ width: COL_W_WEEK, height: "100%" }}
                                >
                                  <div
                                    className="pointer-events-auto flex w-max items-center gap-2 px-2.5"
                                    style={{
                                      position: "sticky",
                                      left: sidebarCollapsed ? 0 : sidebarWidth,
                                      height: "100%",
                                      background: colBg,
                                    }}
                                  >
                                    <div
                                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                                      style={{
                                        background: today ? "var(--primary)" : "transparent",
                                        color: today ? "var(--background)" : closed ? "var(--muted-foreground)" : "var(--foreground)",
                                      }}
                                    >
                                      {d.getDate()}
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                      <span
                                        className={cn(
                                          "whitespace-nowrap text-[11px] font-bold leading-tight",
                                          today && "text-primary",
                                          !today && closed && "text-muted-foreground",
                                          !today && !closed && "text-foreground",
                                        )}
                                      >
                                        {DOW_MON_FIRST[(d.getDay() + 6) % 7]} · {MONTHS_SHORT[d.getMonth()]}
                                      </span>
                                      <span
                                        className={cn(
                                          "whitespace-nowrap text-[9px] font-medium leading-tight",
                                          today ? "text-primary" : "text-muted-foreground",
                                        )}
                                      >
                                        {closed ? "Closed" : dayShiftCount > 0 ? `${dayShiftCount} shift${dayShiftCount !== 1 ? "s" : ""}` : "No shifts"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Time labels — sit below date label, fill remaining height */}
                          {!closed && (
                            <div className="flex w-full flex-1 items-end overflow-hidden pb-0.5">
                              {Array.from(
                                { length: Math.floor((settings.visibleTo - settings.visibleFrom) / weekTimeLabelGap) + 1 },
                                (_, k) => {
                                  const h = Math.min(settings.visibleFrom + k * weekTimeLabelGap, settings.visibleTo - 0.01)
                                  const isNowHour = today && Math.floor(nowH) === Math.floor(h)
                                  return (
                                    <span
                                      key={h}
                                      title={getTimeLabel(toDateISO(d), h)}
                                      className={cn(
                                        "min-w-0 flex-1 text-center text-[8px]",
                                        isNowHour ? "font-bold text-primary" : "font-medium text-muted-foreground",
                                      )}
                                    >
                                      {getTimeLabel(toDateISO(d), h)}
                                    </span>
                                  )
                                }
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {isDayViewMultiDay && (
                  <div
                    className="flex shrink-0 flex-col overflow-hidden bg-muted"
                    style={{
                      width: TOTAL_W,
                      height: HOUR_HDR_H,
                    }}
                  >
                    <div className="flex w-full py-1 pb-0.5">
                      {dates.map((d, i) => {
                        const colLeft = i * DAY_WIDTH
                        return (
                          <div
                            key={i}
                            className="relative shrink-0 overflow-hidden bg-background py-1"
                            style={{ width: DAY_WIDTH }}
                          >
                            {/* Sticky date label — translateX keeps it visible while scrolling through hour slots */}
                            <span
                              className={cn(
                                "inline-block pl-1.5 text-[9px] font-bold will-change-transform",
                                isToday(d) ? "text-primary" : "text-muted-foreground",
                              )}
                              style={{
                                transform: `translateX(clamp(0px, calc(var(--sx, 0px) - ${colLeft}px), ${Math.max(0, DAY_WIDTH - 120)}px))`,
                              }}
                            >
                              {MONTHS_SHORT[d.getMonth()]} {DOW_MON_FIRST[(d.getDay() + 6) % 7]} {d.getDate()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex w-full min-h-5">
                      {dates.map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex shrink-0",
                            isToday(d) ? "bg-accent" : "bg-transparent",
                          )}
                          style={{ width: DAY_WIDTH }}
                        >
                          {DAY_VISIBLE_SLOTS.map((h) => {
                            const dashed = isOutsideWorkingHours(h, settings, d.getDay())
                            return (
                              <div
                                key={String(h)}
                                title={getTimeLabel(toDateISO(d), h)}
                                className={cn(
                                  "flex shrink-0 items-end border-r border-border pb-1 pl-1.5 font-semibold",
                                  dayTimeStep < 1 ? "text-[9px]" : "text-[10px]",
                                  (dayTimeStep < 1 ? Math.abs(h - nowH) < 0.3 : h === Math.floor(nowH)) && isToday(d)
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                )}
                                style={{
                                  width: SLOT_W,
                                  background: dashed ? DASHED_BG : hourBg(h, settings, d.getDay()),
                                }}
                              >
                                {getTimeLabel(toDateISO(d), h)}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!isWeekView && !isDayViewMultiDay && (
                  <div
                    className="flex flex-col border-b border-border bg-background"
                    style={{
                      width: DAY_WIDTH,
                      height: HOUR_HDR_H,
                    }}
                  >
                    {/* Major hour labels row */}
                    <div className="flex flex-1">
                      {DAY_VISIBLE_SLOTS.filter((h) => Number.isInteger(h)).map((h) => {
                        const isNowHour = Math.floor(nowH) === h
                        const isWorking = !isOutsideWorkingHours(h, settings, dates[0]?.getDay() ?? 1)
                        return (
                          <div
                            key={String(h)}
                            title={getTimeLabel(toDateISO(dates[0]!), h)}
                            className={cn(
                              "relative flex h-full shrink-0 items-end border-r border-border pb-1.5 pl-2 text-[11px]",
                              isNowHour ? "font-bold text-primary" : isWorking ? "font-semibold text-foreground" : "font-semibold text-muted-foreground",
                              isWorking ? "bg-transparent" : "bg-muted"
                            )}
                            style={{ width: HOUR_W }}
                          >
                            {/* Now-hour accent */}
                            {isNowHour && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/40" />
                            )}
                            {getTimeLabel(toDateISO(dates[0]!), h)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              </div>
              <div
                ref={gridRef}
                className="relative min-h-full contain-[layout_style] transition-all duration-200"
                style={{
                  width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
                  height: totalHVirtual,
                  willChange: dragId ? "contents" : "auto",
                  overflowX: "hidden",
                }}
                tabIndex={0}
                onKeyDown={onGridKeyDown}
                onClick={() => { if (selectedDepId) setSelectedDepId(null) }}
                onPointerDown={(e) => { onRubberBandPointerDown(e); onGridPointerDown(e) }}
                onPointerMove={(e) => { onRubberBandPointerMove(e); onPM(e) }}
                onPointerUp={(e) => { onRubberBandPointerUp(); onGridPointerUp(e) }}
                onPointerCancel={(e) => { selRectStartRef.current = null; setSelRect(null); onPC(e) }}
              >
            {/* Drop-zone ghost: snapped, shows landing position — no dashed border */}
            <div
              ref={ghostRef}
              data-scheduler-ghost
              className="pointer-events-none absolute z-18 hidden items-center justify-center rounded-md"
            >
              <span
                data-ghost-label
                className="rounded-[3px] px-1.5 py-px text-[10px] font-bold"
              />
            </div>

            {/* Resize label: floats near cursor during resize showing live time */}
            <div
              ref={resizeLabelRef}
              className="pointer-events-none absolute left-0 top-0 z-[200] hidden items-center whitespace-nowrap rounded-md px-[7px] py-0.5 text-[10px] font-bold text-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.18)] will-change-transform"
            />

            {/* Rubber-band selection rect */}
            {selRect && (() => {
              const left   = Math.min(selRect.x0, selRect.x1)
              const top    = Math.min(selRect.y0, selRect.y1)
              const width  = Math.abs(selRect.x1 - selRect.x0)
              const height = Math.abs(selRect.y1 - selRect.y0)
              return (
                <div
                  className="pointer-events-none absolute z-50 rounded border-[1.5px] border-dashed border-primary bg-primary/10"
                  style={{ left, top, width, height }}
                />
              )
            })()}

            {/* Row hover highlight during drag — DOM-driven, zero re-renders */}
            <div
              ref={rowHoverHighlightRef}
              className="pointer-events-none absolute left-0 top-0 z-[6] hidden"
              style={{
                width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
                height: 0,
              }}
            />
            {/* Availability shading — per-employee unavailable time overlay */}
            {availability.length > 0 && rowVirtualizer.getVirtualItems().map((vr) => {
              const row = flatRows[vr.index]
              if (!row || row.kind === "category") return null
              const emp = row.employee!
              return dates.map((date, di) => {
                const unavailableSlots: number[] = []
                for (let h = settings.visibleFrom; h < settings.visibleTo; h++) {
                  if (isUnavailable(emp.id, date, h, availability)) unavailableSlots.push(h)
                }
                if (unavailableSlots.length === 0) return null
                return unavailableSlots.map((h) => {
                  const left = isWeekView
                    ? di * COL_W_WEEK + (h - settings.visibleFrom) * PX_WEEK
                    : isDayViewMultiDay
                      ? di * DAY_WIDTH + (h - settings.visibleFrom) * HOUR_W
                      : (h - settings.visibleFrom) * HOUR_W
                  const width = isWeekView ? PX_WEEK : HOUR_W
                  return (
                    <div
                      key={`avail-${emp.id}-${di}-${h}`}
                      title="Unavailable"
                      style={{
                        position: "absolute",
                        left,
                        top: vr.start,
                        width,
                        height: vr.size,
                        // Solid amber base + dense diagonal stripes = clearly visible
                        background: "color-mix(in oklch, var(--color-amber-500, #f59e0b) 18%, transparent)",
                        backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklch, var(--color-amber-500, #f59e0b) 40%, transparent) 0px, color-mix(in oklch, var(--color-amber-500, #f59e0b) 40%, transparent) 2px, transparent 2px, transparent 8px)",
                        borderRight: "1px solid color-mix(in oklch, var(--color-amber-500, #f59e0b) 25%, transparent)",
                        pointerEvents: "none",
                        zIndex: 4,
                      }}
                    />
                  )
                })
              })
            })}
            {rowVirtualizer.getVirtualItems().map((vr) => {
              const row = flatRows[vr.index]
              if (!row) return null
              const cat = row.category
              // Keep vrTopsRef in sync with actual virtualizer positions
              const rowTopsKey = row.kind === "employee" && row.employee
                ? `emp:${row.employee.id}` : `cat:${cat.id}`
              vrTopsRef.current[rowTopsKey] = vr.start
              const top = vr.start
              const rowH = vr.size
              // Individual mode: category header rows — solid tinted background, no hour cells
              if (row.kind === "category" && (effectiveRowMode === "individual" || effectiveRowMode === "flat")) {
                const c = getColor(cat.colorIdx)
                return (
                  <div
                    key={row.key}
                    style={{
                      position: "absolute",
                      left: 0,
                      top,
                      width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
                      height: rowH,
                      background: `${c.bg}08`,
                      borderBottom: `1px solid ${c.bg}30`,
                      pointerEvents: "none",
                      zIndex: 4,
                    }}
                  />
                )
              }
              // Category mode category rows + all employee rows → render hour-slot cells
              return dates.map((date, di) => {
                const closed = settings.workingHours[date.getDay()] === null
                const today = isToday(date)
                if (isDayViewMultiDay) {
                  return DAY_VISIBLE_SLOTS.map((h) => {
                    const dashed = isOutsideWorkingHours(h, settings, date.getDay())
                    return (
                      <div
                        key={`bg-${row.key}-${di}-${h}`}
                        data-empty-cell
                        role="gridcell"
                        className={cn(
                          "changeGrid-first border-r border-schedule-hour-line",
                          h === settings.visibleFrom && di > 0 && "border-l-2 border-schedule-day-line",
                        )}
                        style={{
                          position: "absolute",
                          left: di * DAY_WIDTH + (h - settings.visibleFrom) * HOUR_W,
                          top,
                          width: SLOT_W,
                          height: rowH,
                          background: dashed ? DASHED_BG : hourBg(h, settings, date.getDay()),
                        }}
                        onPointerEnter={() => {
                          if (!dragEmpId) return
                          dropHoverRef.current = { categoryId: cat.id, di, hour: h }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setGridContextMenu({ clientX: e.clientX, clientY: e.clientY, date, hour: h, categoryId: cat.id, employeeId: row.employee?.id })
                        }}
                        onDoubleClick={() => {
                          setAddPrompt({ date, categoryId: cat.id, hour: h, employeeId: row.employee?.id })
                        }}
                      />
                    )
                  })
                }
                if (isWeekView) {
                  const dow = date.getDay()
                  const isWeekend = dow === 0 || dow === 6
                  return (
                    <div
                      key={`bg-${row.key}-${di}`}
                      data-empty-cell
                      role="gridcell"
                      className={cn(
                        "changeGrid-second border-b border-schedule-row-line",
                        di < dates.length - 1 ? "border-r-2 border-schedule-day-line" : "border-r border-schedule-day-line",
                      )}
                      style={{
                        position: "absolute",
                        left: di * COL_W_WEEK,
                        top,
                        width: COL_W_WEEK,
                        height: rowH,
                        background: today
                          ? "color-mix(in srgb, var(--primary) 4%, var(--background))"
                          : closed
                            ? "var(--muted)"
                            : isWeekend
                              ? "color-mix(in srgb, var(--muted) 35%, var(--background))"
                              : "var(--background)",
                      }}
                      onPointerEnter={() => {
                        if (!dragEmpId) return
                        dropHoverRef.current = { categoryId: cat.id, di }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const r = scrollRef.current?.getBoundingClientRect()
                        if (!r) return
                        const x = (scrollRef.current?.scrollLeft ?? 0) + e.clientX - r.left
                        const localX = x - di * COL_W_WEEK
                        const hour = Math.max(settings.visibleFrom, Math.min(settings.visibleTo - 0.5,
                          settings.visibleFrom + localX / PX_WEEK))
                        setGridContextMenu({ clientX: e.clientX, clientY: e.clientY, date, hour: Math.round(hour * 4) / 4, categoryId: cat.id, employeeId: row.employee?.id })
                      }}
                      onDoubleClick={(e) => {
                        const r = scrollRef.current?.getBoundingClientRect()
                        if (!r) return
                        const x = (scrollRef.current?.scrollLeft ?? 0) + e.clientX - r.left
                        const localX = x - di * COL_W_WEEK
                        const hour = Math.max(settings.visibleFrom, Math.min(settings.visibleTo - 0.5,
                          settings.visibleFrom + localX / PX_WEEK))
                        setAddPrompt({ date, categoryId: cat.id, hour: Math.round(hour * 4) / 4, employeeId: row.employee?.id })
                      }}
                    >
                      {Array.from(
                        { length: settings.visibleTo - settings.visibleFrom + 1 },
                        (_, k) => {
                          const h = settings.visibleFrom + k
                          const outsideWorking = isOutsideWorkingHours(h, settings, date.getDay())
                          return (
                            <div
                              key={k}
                              className="pointer-events-none border-r border-schedule-hour-line"
                              style={{
                                position: "absolute",
                                left: k * PX_WEEK,
                                top: 0,
                                width: Math.max(PX_WEEK, 2),
                                height: "100%",
                                background: outsideWorking ? "color-mix(in srgb, var(--muted) 50%, transparent)" : "transparent",
                              }}
                            />
                          )
                        }
                      )}
                    </div>
                  )
                }
                return DAY_VISIBLE_SLOTS.map((h) => {
                  const outsideWorking = isOutsideWorkingHours(h, settings, date.getDay())
                  const isHourBoundary = Number.isInteger(h)
                  return (
                  <div
                    key={`bg-${row.key}-${h}`}
                    data-empty-cell
                    role="gridcell"
                    className={cn(
                      "changeGrid-third border-r",
                      isHourBoundary ? "border-schedule-hour-line" : "border-schedule-half-line",
                    )}
                    style={{
                      position: "absolute",
                      left: (h - settings.visibleFrom) * HOUR_W,
                      top,
                      width: SLOT_W,
                      height: rowH,
                      background: outsideWorking
                        ? "color-mix(in srgb, var(--muted) 70%, transparent)"
                        : "transparent",
                    }}
                    onPointerEnter={() => {
                      if (!dragEmpId) return
                      dropHoverRef.current = { categoryId: cat.id, hour: h }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setGridContextMenu({ clientX: e.clientX, clientY: e.clientY, date, hour: h, categoryId: cat.id, employeeId: row.employee?.id })
                    }}
                    onDoubleClick={() => {
                      setAddPrompt({ date, categoryId: cat.id, hour: h, employeeId: row.employee?.id })
                    }}
                  />
                )})
              })
            })}

            {rowVirtualizer.getVirtualItems().map((vr) => {
              const row = flatRows[vr.index]
              if (!row) return null
              // Category mode: separator after each category row
              // Individual mode: separator after each employee row (not category headers)
              const drawSep = effectiveRowMode === "category"
                ? row.kind === "category" && !collapsed.has(row.category.id)
                : row.kind === "employee"
              if (!drawSep) return null
              return (
                <div
                  key={`sep-${row.key}`}
                  className="pointer-events-none absolute left-0 z-[3] h-0.5 bg-schedule-fg-12"
                  style={{
                    top: vr.start + vr.size - 1,
                    width: isWeekView || isDayViewMultiDay ? TOTAL_W : DAY_WIDTH,
                  }}
                />
              )
            })}

            {(!isWeekView || isDayViewMultiDay) &&
              (isDayViewMultiDay
                ? dates.flatMap((_, di) =>
                    DAY_VISIBLE_SLOTS.map((h) => (
                      <div
                        key={`vl-${di}-${h}`}
                        className="pointer-events-none absolute top-0 z-[1] w-px bg-schedule-fg-12"
                        style={{
                          left: di * DAY_WIDTH + (h - settings.visibleFrom) * HOUR_W,
                          height: totalHVirtual,
                        }}
                      />
                    ))
                  )
                : DAY_VISIBLE_SLOTS.map((h) => (
                    <div
                      key={`vl-${h}`}
                      className="pointer-events-none absolute top-0 z-[1] w-px bg-schedule-fg-12"
                      style={{
                        left: (h - settings.visibleFrom) * HOUR_W,
                        height: totalHVirtual,
                      }}
                    />
                  )))}

            {dates.map((d, di) =>
              isToday(d) &&
              nowH >= settings.visibleFrom &&
              nowH < settings.visibleTo ? (
                <div
                  key={`now-${di}`}
                  data-scheduler-now-line
                  className="pointer-events-none absolute top-0 z-[15] w-0.5 bg-destructive shadow-[0_0_8px_color-mix(in_srgb,var(--destructive)_50%,transparent)]"
                  style={{
                    left: isWeekView
                      ? di * COL_W_WEEK + (nowH - settings.visibleFrom) * PX_WEEK
                      : isDayViewMultiDay
                        ? di * DAY_WIDTH + (nowH - settings.visibleFrom) * HOUR_W
                        : (nowH - settings.visibleFrom) * HOUR_W,
                    height: totalHVirtual,
                  }}
                >
                  {/* Pulsing dot at top */}
                  <div
                    data-scheduler-now-dot
                    className="absolute -left-[5px] -top-px size-3 rounded-full border-2 border-background bg-destructive"
                  />
                  {/* Time pill label */}
                  <div className="absolute top-0 left-2 whitespace-nowrap rounded bg-destructive px-[5px] py-px text-[9px] font-bold leading-snug text-destructive-foreground">
                    {fmt12(nowH)}
                  </div>
                </div>
              ) : null
            )}

            {/* Marker lines — vertical lines at specific date+hour positions */}
            {markers.map((marker) => {
              const markerDi = dates.findIndex((d) => sameDay(d, marker.date))
              if (markerDi < 0) return null
              const h = marker.hour ?? settings.visibleFrom
              if (h < settings.visibleFrom || h > settings.visibleTo) return null
              const left = isWeekView
                ? markerDi * COL_W_WEEK + (h - settings.visibleFrom) * PX_WEEK
                : isDayViewMultiDay
                  ? markerDi * DAY_WIDTH + (h - settings.visibleFrom) * HOUR_W
                  : (h - settings.visibleFrom) * HOUR_W
              const color = marker.color ?? "var(--destructive)"
              return (
                <div
                  key={marker.id}
                  data-scheduler-marker={marker.id}
                  className={cn(
                    "absolute top-0 z-[16] flex w-3.5 justify-center",
                    marker.draggable ? "cursor-ew-resize" : onMarkersChange ? "cursor-pointer" : "cursor-default"
                  )}
                  style={{
                    left: left - 6,
                    height: totalHVirtual,
                  }}
                  onContextMenu={onMarkersChange ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onMarkersChange(markers.filter((m) => m.id !== marker.id))
                  } : undefined}
                  onPointerDown={marker.draggable ? (e) => {
                    e.stopPropagation()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const el = scrollRef.current
                    if (!el || !onMarkersChange) return
                    const onMove = (me: PointerEvent) => {
                      const rect = el.getBoundingClientRect()
                      const x = el.scrollLeft + me.clientX - rect.left
                      const newDi = isWeekView
                        ? Math.floor(x / COL_W_WEEK)
                        : isDayViewMultiDay ? Math.floor(x / DAY_WIDTH) : 0
                      const clampedDi = Math.max(0, Math.min(dates.length - 1, newDi))
                      const offsetX = isWeekView ? x - clampedDi * COL_W_WEEK : isDayViewMultiDay ? x - clampedDi * DAY_WIDTH : x
                      const newH = Math.max(settings.visibleFrom, Math.min(settings.visibleTo, settings.visibleFrom + offsetX / (isWeekView ? PX_WEEK : HOUR_W)))
                      const newDate = dates[clampedDi]
                      if (!newDate) return
                      onMarkersChange(markers.map((m) => m.id === marker.id
                        ? { ...m, date: toDateISO(newDate), hour: Math.round(newH * 4) / 4 }
                        : m
                      ))
                    }
                    const onUp = () => {
                      document.removeEventListener("pointermove", onMove)
                      document.removeEventListener("pointerup", onUp)
                    }
                    document.addEventListener("pointermove", onMove)
                    document.addEventListener("pointerup", onUp)
                  } : undefined}
                >
                  {/* Visible 2px line centred in the hit area */}
                  <div className="pointer-events-none h-full w-0.5" style={{ background: color }} />
                  {marker.label && (
                    <span
                      className="pointer-events-none absolute top-1 left-2.5 rounded-sm bg-background px-0.5 text-[10px] font-semibold whitespace-nowrap"
                      style={{ color }}
                    >
                      {marker.label}
                    </span>
                  )}
                  {onMarkersChange && (
                    <span className="pointer-events-none absolute bottom-1 left-2.5 whitespace-nowrap text-[9px] text-muted-foreground">
                      right-click to remove
                    </span>
                  )}
                </div>
              )
            })}


            {/* SVG dependency arrows */}
            {(() => {
              // Content-space coordinates for each shift block
              const blockPos: Record<string, { startX: number; endX: number; centerY: number; label: string }> = {}
              for (const s of shifts) {
                const di = isWeekView || isDayViewMultiDay ? dates.findIndex((d) => sameDay(d, s.date)) : 0
                if (di < 0) continue
                const rowKey = (effectiveRowMode === "individual" || effectiveRowMode === "flat") ? `emp:${s.employeeId}` : `cat:${s.categoryId}`
                const rowTop = categoryTops[rowKey] ?? 0
                const rowH   = categoryHeights[rowKey] ?? ROLE_HDR
                const startX = isWeekView
                  ? di * COL_W_WEEK + (s.startH - settings.visibleFrom) * PX_WEEK
                  : isDayViewMultiDay ? di * DAY_WIDTH + (s.startH - settings.visibleFrom) * HOUR_W
                  : (s.startH - settings.visibleFrom) * HOUR_W
                const endX = isWeekView
                  ? di * COL_W_WEEK + (s.endH - settings.visibleFrom) * PX_WEEK
                  : isDayViewMultiDay ? di * DAY_WIDTH + (s.endH - settings.visibleFrom) * HOUR_W
                  : (s.endH - settings.visibleFrom) * HOUR_W
                blockPos[s.id] = { startX, endX, centerY: rowTop + rowH / 2, label: s.employee }
              }

              const depPath = (dep: ShiftDependency) => {
                const from = blockPos[dep.fromId]
                const to   = blockPos[dep.toId]
                if (!from || !to) return null
                const type = dep.type ?? "finish-to-start"
                const x1 = type === "start-to-start" || type === "start-to-finish" ? from.startX : from.endX
                const x2 = type === "finish-to-finish" || type === "start-to-finish" ? to.endX : to.startX
                const y1 = from.centerY
                const y2 = to.centerY
                const cp = Math.max(Math.abs(x2 - x1) * 0.5, 60)
                const mx = x1 + (x2 - x1) * 0.5
                const my = y1 + (y2 - y1) * 0.5
                return { d: `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`, x1, y1, x2, y2, mx, my }
              }

              const colors = Array.from(new Set(dependencies.map(d => d.color ?? "var(--primary)")))

              return (
                <>
                  {/* Visual SVG layer — pointerEvents none, colors driven by state */}
                  <svg
                    ref={depSvgRef}
                    className="pointer-events-none absolute left-0 top-0 z-[17] overflow-visible"
                    style={{ width: TOTAL_W, height: totalHVirtual }}
                  >
                    <defs>
                      <marker id="dep-preview-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="var(--primary)" opacity="0.8" />
                      </marker>
                      {colors.map((col, ci) => (
                        <marker key={`a-${ci}`} id={`dep-arr-${ci}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                          <polygon points="0 0, 8 4, 0 8" fill={col} />
                        </marker>
                      ))}
                      <marker id="dep-arr-selected" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="var(--destructive)" />
                      </marker>
                    </defs>
                    {dependencies.map((dep) => {
                      const p = depPath(dep)
                      if (!p) return null
                      const isHovered  = hoveredDepId  === dep.id
                      const isSelected = selectedDepId === dep.id
                      const type  = dep.type ?? "finish-to-start"
                      const color = isSelected ? "var(--destructive)" : (dep.color ?? "var(--primary)")
                      const ci    = colors.indexOf(dep.color ?? "var(--primary)")
                      const opacity = isHovered || isSelected ? 1 : 0.4
                      return (
                        <g key={dep.id}>
                          {(isHovered || isSelected) && (
                            <path d={p.d} fill="none" stroke={color} strokeWidth={8} opacity={0.15} />
                          )}
                          <path
                            d={p.d} fill="none"
                            stroke={color}
                            strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                            strokeDasharray={type !== "finish-to-start" ? "5 3" : undefined}
                            markerEnd={isSelected ? "url(#dep-arr-selected)" : `url(#dep-arr-${ci})`}
                            opacity={opacity}
                            className="transition-[opacity,stroke-width] duration-120"
                          />
                        </g>
                      )
                    })}
                  </svg>

                  {/* Hit-area layer — wide transparent stroke for hover/click/dblclick */}
                  {dependencies.length > 0 && (
                    <svg className="pointer-events-none absolute left-0 top-0 z-[18] overflow-visible" style={{ width: TOTAL_W, height: totalHVirtual }}>
                      {dependencies.map((dep) => {
                        const p = depPath(dep)
                        if (!p) return null
                        return (
                          <path
                            key={`hit-${dep.id}`}
                            d={p.d}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={20}
                            pointerEvents="visibleStroke"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredDepId(dep.id)}
                            onMouseLeave={(e) => {
                              const rel = e.relatedTarget as Element | null
                              if (rel?.closest?.(`[data-dep-ui="${dep.id}"]`)) return
                              setHoveredDepId(null)
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDepId(prev => prev === dep.id ? null : dep.id)
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingDep(dep)
                              setSelectedDepId(dep.id)
                            }}
                          />
                        )
                      })}
                    </svg>
                  )}

                  {/* Tooltip on hover */}
                  {hoveredDepId && !selectedDepId && (() => {
                    const dep = dependencies.find(d => d.id === hoveredDepId)
                    if (!dep) return null
                    const p = depPath(dep)
                    if (!p) return null
                    const from = blockPos[dep.fromId]
                    const to   = blockPos[dep.toId]
                    if (!from || !to) return null
                    const typeLabel: Record<string, string> = {
                      "finish-to-start": "Finish → Start",
                      "start-to-start": "Start → Start",
                      "finish-to-finish": "Finish → Finish",
                      "start-to-finish": "Start → Finish",
                    }
                    return (
                      <div
                        data-dep-ui={dep.id}
                        onMouseEnter={() => setHoveredDepId(dep.id)}
                        onMouseLeave={() => setHoveredDepId(null)}
                        className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        style={{ left: p.mx + 10, top: p.my - 12 }}
                      >
                        <div className="font-semibold">{from.label} → {to.label}</div>
                        <div className="mt-px text-muted-foreground">{typeLabel[dep.type ?? "finish-to-start"]}</div>
                        <div className="mt-px text-[10px] text-muted-foreground">Click to select · Double-click to edit</div>
                      </div>
                    )
                  })()}

                  {/* Selected dep: × delete button */}
                  {selectedDepId && onDependenciesChange && (() => {
                    const dep = dependencies.find(d => d.id === selectedDepId)
                    if (!dep) return null
                    const p = depPath(dep)
                    if (!p) return null
                    return (
                      <div
                        data-dep-ui={dep.id}
                        className="absolute z-50 flex gap-1"
                        style={{ left: p.mx - 10, top: p.my - 10 }}
                        onMouseEnter={() => setHoveredDepId(dep.id)}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDependenciesChange(dependencies.filter(dd => dd.id !== dep.id))
                            setSelectedDepId(null)
                            setHoveredDepId(null)
                          }}
                          className="flex size-[22px] cursor-pointer items-center justify-center rounded-full border-none bg-destructive text-[15px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
                          title="Delete dependency"
                        >×</button>
                      </div>
                    )
                  })()}

                  {/* Edit dialog */}
                  {editingDep && onDependenciesChange && createPortal((() => {
                    const TYPE_OPTIONS: { value: NonNullable<ShiftDependency["type"]>; label: string }[] = [
                      { value: "finish-to-start",  label: "Finish → Start"  },
                      { value: "start-to-start",   label: "Start → Start"   },
                      { value: "finish-to-finish", label: "Finish → Finish" },
                      { value: "start-to-finish",  label: "Start → Finish"  },
                    ]
                    const selectClass =
                      "w-full cursor-pointer appearance-auto rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
                    return (
                      <div
                        onClick={() => setEditingDep(null)}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
                      >
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex w-[360px] flex-col gap-4 rounded-xl border border-border bg-background p-6 shadow-[0_24px_64px_rgba(0,0,0,0.22)]"
                        >
                          <div className="text-[15px] font-bold text-foreground">Edit Dependency</div>

                          {/* From shift */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
                            <select
                              value={editingDep.fromId}
                              onChange={(e) => setEditingDep(prev => prev ? { ...prev, fromId: e.target.value } : null)}
                              className={selectClass}
                            >
                              {shifts.map(s => (
                                <option key={s.id} value={s.id} disabled={s.id === editingDep.toId}>
                                  {s.employee} — {s.date} {s.startH}:00–{s.endH}:00
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* To shift */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
                            <select
                              value={editingDep.toId}
                              onChange={(e) => setEditingDep(prev => prev ? { ...prev, toId: e.target.value } : null)}
                              className={selectClass}
                            >
                              {shifts.map(s => (
                                <option key={s.id} value={s.id} disabled={s.id === editingDep.fromId}>
                                  {s.employee} — {s.date} {s.startH}:00–{s.endH}:00
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Type */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</label>
                            <select
                              value={editingDep.type ?? "finish-to-start"}
                              onChange={(e) => setEditingDep(prev => prev ? { ...prev, type: e.target.value as NonNullable<ShiftDependency["type"]> } : null)}
                              className={selectClass}
                            >
                              {TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-1 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingDep(null)}
                              className="cursor-pointer rounded-lg border border-border bg-background px-4 py-1.5 text-xs text-foreground"
                            >Cancel</button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingDep) return
                                onDependenciesChange(dependencies.map(d => d.id === editingDep.id ? editingDep : d))
                                setEditingDep(null)
                                setSelectedDepId(null)
                              }}
                              className="cursor-pointer rounded-lg border-none bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                            >Save</button>
                          </div>
                        </div>
                      </div>
                    )
                  })(), document.body)}
                </>
              )
            })()}
            {false && dropHoverRef.current &&
              dragEmpId &&
              (() => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const cat = CATEGORIES.find((c) => c.id === dropHoverRef.current?.categoryId)!
                if (!cat || collapsed.has(cat.id)) return null
                const c = getColor(cat.colorIdx)
                // Use category header top + total height of all employee rows in this category
                const catHeaderTop = categoryTops[`cat:${cat.id}`] ?? 0
                const catEmps = ALL_EMPLOYEES.filter((e) => e.categoryId === cat.id)
                const empHeights = catEmps.reduce((sum, e) => sum + (categoryHeights[`emp:${e.id}`] ?? laneH), 0)
                const top = catHeaderTop
                const rowH = ROLE_HDR + empHeights
                const dropClass = "bg-primary/10 ring-1 ring-primary/30 rounded pointer-events-none z-10"
                if (isWeekView)
                  return (
                    <div
                      className={dropClass}
                      style={{
                        position: "absolute",
                        left: (dropHoverRef.current?.di ?? 0) * COL_W_WEEK,
                        top,
                        width: COL_W_WEEK,
                        height: rowH,
                      }}
                    />
                  )
                if (isDayViewMultiDay)
                  return (
                    <div
                      className={dropClass}
                      style={{
                        position: "absolute",
                        left:
                          (dropHoverRef.current?.di ?? 0) * DAY_WIDTH +
                          ((dropHoverRef.current?.hour ?? settings.visibleFrom) - settings.visibleFrom) * HOUR_W,
                        top,
                        width: HOUR_W * 2,
                        height: rowH,
                      }}
                    />
                  )
                return (
                  <div
                    className={dropClass}
                    style={{
                      position: "absolute",
                      left: ((dropHoverRef.current?.hour ?? settings.visibleFrom) - settings.visibleFrom) * HOUR_W,
                      top,
                      width: HOUR_W * 2,
                      height: rowH,
                    }}
                  />
                )
              })()}

            {rowVirtualizer.getVirtualItems().map((vr) => {
              const row = flatRows[vr.index]
              if (!row) return null
              const cat = row.category
              const c = getColor(cat.colorIdx)

              // ── Category mode: render all shifts for this category in the row ──
              if (row.kind === "category") {
                if (effectiveRowMode !== "category" || collapsed.has(cat.id)) return null
                const catTop = vr.start
                return dates.map((date, di) => {
                  const dayShifts = shiftIndex.get(`${cat.id}:${toDateISO(date)}`) ?? []
                  const trackMap = packedTracksIndex.get(`${cat.id}:${toDateISO(date)}`) ?? new Map()
                  const sorted = [...dayShifts].sort((a, b) => a.startH - b.startH)
                  return sorted.map((shift) => {
                    const track = trackMap.get(shift.id) ?? 0
                    const isDraft = shift.status === "draft"
                    const isDrag = dragId === shift.id
                    let left: number, width: number
                    if (isWeekView) {
                      const cs = Math.max(shift.startH, settings.visibleFrom)
                      const ce = Math.min(shift.endH, settings.visibleTo)
                      if (ce <= cs) return null
                      left = di * COL_W_WEEK + (cs - settings.visibleFrom) * PX_WEEK + 1
                      width = Math.max((ce - cs) * PX_WEEK - 2, 12)
                    } else if (isDayViewMultiDay) {
                      const cs = Math.max(shift.startH, settings.visibleFrom)
                      const ce = Math.min(shift.endH, settings.visibleTo)
                      if (ce <= cs) return null
                      left = di * DAY_WIDTH + (cs - settings.visibleFrom) * HOUR_W + 2
                      width = Math.max((ce - cs) * HOUR_W - 4, 18)
                    } else {
                      const cs = Math.max(shift.startH, settings.visibleFrom)
                      const ce = Math.min(shift.endH, settings.visibleTo)
                      if (ce <= cs) return null
                      left = (cs - settings.visibleFrom) * HOUR_W + 2
                      width = Math.max((ce - cs) * HOUR_W - 4, 18)
                    }
                    const clampedCat = isWeekView
                      ? clampShiftHoriz(left, width, di * COL_W_WEEK + COL_W_WEEK - 1, 12, di * COL_W_WEEK + 1)
                      : isDayViewMultiDay
                        ? clampShiftHoriz(left, width, di * DAY_WIDTH + DAY_WIDTH - 2, 18, di * DAY_WIDTH + 2)
                        : clampShiftHoriz(left, width, DAY_WIDTH - 2, 18, 2)
                    if (!clampedCat) return null
                    left = clampedCat.left
                    width = clampedCat.width
                    // Cast needed: TypeScript narrows effectiveRowMode to "category" here via control flow
                    const rowModeForRender = effectiveRowMode as string
                    const top = rowModeForRender === "flat"
                      ? catTop + 4 + track * (ROLE_HDR - 4)
                      : catTop + ROLE_HDR + track * laneH + (isSingleDayTimeline ? 2 : 4)
                    const rawVariant = settings.badgeVariant ?? "both"
                    // Day view: keep drag, disable resize (requested). Treat "none" as drag-only visual.
                    const variant = !isWeekView && !isDayViewMultiDay ? "drag" : rawVariant
                    const canDrag = (variant === "none" || variant === "drag" || variant === "both") && shift.draggable !== false
                    const showResize =
                      !readOnly &&
                      !(!isWeekView && !isDayViewMultiDay) &&
                      (variant === "resize" || variant === "both") &&
                      width >= 48 &&
                      shift.resizable !== false
                    const isDeleting = deletingIds.has(shift.id)
                    const isNew = newlyAddedIds.has(shift.id)
                    const isDropConflict = dropConflictId === shift.id
                    const isSelected = selectedBlockIds.has(shift.id)
                    const isActivating = activatingBlockId === shift.id
                    const hasConflict = conflictIds.has(shift.id)
                    const isPast = shift.date < toDateISO(new Date()) || (sameDay(shift.date, new Date()) && shift.endH < nowH)
                    const isLive = sameDay(shift.date, new Date()) && nowH >= shift.startH && nowH < shift.endH
                    const blockH = rowModeForRender === "flat" ? ROLE_HDR - 8 : blockBarInnerH
                    const blockStyle: React.CSSProperties = {
                      position: "absolute", left, top, width,
                      height: blockH, borderRadius: 8,
                      cursor: canDrag ? (isDrag ? "grabbing" : isTouchDevice ? "default" : "grab") : "default",
                      userSelect: "none",
                      touchAction: isDrag ? "none" : isTouchDevice ? "pan-y" : "none",
                      opacity: isDrag ? 0.88 : isDeleting ? 0 : isPast ? 0.55 : 1,
                      zIndex: isDrag ? 50 : isSelected ? 12 : isActivating ? 15 : 8,
                      overflow: "hidden", display: "flex", alignItems: "stretch",
                      background: isDraft ? `${c.bg}15` : c.bg,
                      border: isDraft
                        ? `1.5px solid ${c.bg}80`
                        : hasConflict || isDropConflict
                          ? `2px solid var(--destructive)`
                          : isSelected
                            ? `2px solid ${c.bg}`
                            : `1px solid ${c.bg}55`,
                      boxShadow: isDrag
                        ? `0 20px 40px -8px ${c.bg}60, 0 8px 16px -4px rgba(0,0,0,0.25)`
                        : isActivating
                          ? `0 8px 24px -4px ${c.bg}80, 0 0 0 3px ${c.bg}33`
                          : isSelected
                            ? `0 0 0 3px ${c.bg}44, 0 2px 8px ${c.bg}44`
                            : isLive
                              ? `0 0 0 2px ${c.bg}55, 0 2px 8px ${c.bg}55`
                              : isDraft
                                ? `0 1px 4px ${c.bg}20`
                                : `0 2px 8px ${c.bg}44`,
                      transition: isDrag ? "none" : isDeleting ? "opacity 150ms ease-out" : "box-shadow 150ms ease-out, transform 150ms ease-out",
                      contain: "layout style", willChange: isDrag ? "transform" : "auto",
                    }
                    if (isDrag) {
                      blockStyle.left = 0
                      blockStyle.top = 0
                      blockStyle.zIndex = 200
                      blockStyle.pointerEvents = "none"
                      blockStyle.boxShadow = `0 24px 48px -8px ${c.bg}70, 0 8px 24px -4px rgba(0,0,0,0.3)`
                    }
                    return (
                      <ContextMenu key={shift.id}>
                        <ContextMenuTrigger asChild>
                      <div
                        ref={(el) => { blockRefsRef.current[shift.id] = el }}
                        role="button" tabIndex={0}
                        aria-label={`${shift.employee}, ${getTimeLabel(shift.date, shift.startH)} to ${getTimeLabel(shift.date, shift.endH)}, ${cat.name}`}
                        data-scheduler-block
                        onPointerEnter={() => { if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = setTimeout(() => setTooltipBlockId(shift.id), TOOLTIP_HOVER_MS) }}
                        onPointerLeave={() => { if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; if (tooltipLeaveTimerRef.current) clearTimeout(tooltipLeaveTimerRef.current); tooltipLeaveTimerRef.current = setTimeout(() => setTooltipBlockId(null), TOOLTIP_LEAVE_MS) }}
                        onPointerDown={canDrag ? (e: React.PointerEvent<HTMLDivElement>) => onBD(e, shift) : undefined}
                        onContextMenu={() => { setTooltipBlockId(null); if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current) }}
                        onDoubleClick={(e) => { e.stopPropagation(); if (!dragId) onShiftClick(shift, cat) }}
                        onKeyDown={(e) => onBlockKeyDown(e, shift, cat)}
                        className={cn("group/block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", isNew && "animate-[scaleIn_120ms_ease-out]")}
                        style={blockStyle}
                      >
                        {/* Left accent strip — darker overlay on left edge */}
                        <div className="w-1 shrink-0 rounded-l-lg bg-black/18" />

                        {/* Main content */}
                        {isSingleDayTimeline ? (
                          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-2">
                            {hasConflict && (
                              <AlertTriangle
                                size={9}
                                className={cn("shrink-0", isDraft ? "text-destructive" : "text-white/90")}
                              />
                            )}
                            <span
                              className={cn(
                                "truncate text-[11px] font-semibold leading-none",
                                isDraft ? "text-[var(--blk-time)]" : "text-white/90"
                              )}
                              style={isDraft ? { ['--blk-time' as string]: c.bg } : undefined}
                            >
                              {getTimeLabel(shift.date, shift.startH)}–{getTimeLabel(shift.date, shift.endH)}
                              {shift.breakStartH !== undefined && shift.breakEndH !== undefined && (
                                <>
                                  {" "}
                                  · ☕ {Math.round((shift.breakEndH - shift.breakStartH) * 60)}m
                                </>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden px-2">
                            <div className="flex min-w-0 items-center gap-0.5">
                              {hasConflict && (
                                <AlertTriangle
                                  size={9}
                                  className={cn("shrink-0", isDraft ? "text-destructive" : "text-white/90")}
                                />
                              )}
                              <span
                                className={cn(
                                  "truncate text-xs font-bold leading-snug",
                                  isDraft ? "text-[var(--blk-name)]" : "text-white/[0.97]"
                                )}
                                style={isDraft ? { ['--blk-name' as string]: c.text } : undefined}
                              >
                                {shift.employee}
                              </span>
                            </div>
                            <div className="flex min-w-0 items-center gap-1">
                              <span
                                className={cn(
                                  "truncate text-[10px] font-normal leading-snug",
                                  isDraft ? "text-[var(--blk-time)]" : "text-white/75"
                                )}
                                style={isDraft ? { ['--blk-time' as string]: c.bg } : undefined}
                              >
                                {getTimeLabel(shift.date, shift.startH)}–{getTimeLabel(shift.date, shift.endH)}
                              </span>
                              {/* Break indicator inline */}
                              {shift.breakStartH !== undefined && shift.breakEndH !== undefined && width >= 80 && (
                                <span
                                  className={cn(
                                    "flex shrink-0 items-center gap-0.5 text-[9px]",
                                    isDraft ? "text-[var(--blk-brk)]" : "text-white/65"
                                  )}
                                  style={isDraft ? { ['--blk-brk' as string]: c.bg } : undefined}
                                >
                                  ☕ {Math.round((shift.breakEndH - shift.breakStartH) * 60)}m
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status badge — top right */}
                        {width >= 72 && (
                          <div
                            className={cn(
                              "pointer-events-none absolute top-1 rounded-[10px] px-[5px] py-0.5 text-[8px] font-bold leading-none whitespace-nowrap text-white/95",
                              showResize ? "right-3.5" : "right-1.5",
                              hasConflict && "bg-red-500/85",
                              !hasConflict && isDraft && "bg-black/25",
                              !hasConflict && !isDraft && "bg-white/22"
                            )}
                          >
                            {hasConflict ? "Conflict" : isDraft ? "Draft" : isLive ? "Live" : ""}
                          </div>
                        )}

                        {/* Break gap background overlay */}
                        {shift.breakStartH !== undefined && shift.breakEndH !== undefined && (() => {
                          const dur = shift.endH - shift.startH
                          if (dur <= 0) return null
                          const breakLeft = ((shift.breakStartH - shift.startH) / dur) * 100
                          const breakWidth = ((shift.breakEndH - shift.breakStartH) / dur) * 100
                          return (
                            <div
                              className="pointer-events-none absolute top-0 z-[2] h-full border-l border-r border-dashed border-white/35 bg-black/15"
                              style={{ left: `${breakLeft}%`, width: `${Math.max(breakWidth, 2)}%` }}
                              title={`Break ${getTimeLabel(shift.date, shift.breakStartH!)}–${getTimeLabel(shift.date, shift.breakEndH!)}`}
                            />
                          )
                        })()}

                        {showResize && (
                          <div
                            data-resize="left"
                            onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => onRLD(e, shift)}
                            className="absolute left-0 top-0 z-[3] flex h-full cursor-ew-resize items-center justify-start pl-2"
                            style={{ width: isTouchDevice ? RESIZE_HANDLE_MIN_TOUCH_PX : 14 }}
                          >
                            <div className="pointer-events-none h-[55%] min-h-2.5 w-0.5 rounded-sm bg-white/65" />
                          </div>
                        )}
                        {showResize && (
                          <div
                            data-resize="right"
                            onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => onRRD(e, shift)}
                            className="absolute right-0 top-0 z-[3] flex h-full cursor-ew-resize items-center justify-end pr-2"
                            style={{ width: isTouchDevice ? RESIZE_HANDLE_MIN_TOUCH_PX : 14 }}
                          >
                            <div className="pointer-events-none h-[55%] min-h-2.5 w-0.5 rounded-sm bg-white/65" />
                          </div>
                        )}
                        {/* Dep-draw dots — 4 connection points, visible on hover */}
                        {renderDepDots(shift, tooltipBlockId === shift.id || depHoveredBlockId === shift.id)}
                      </div>
                        </ContextMenuTrigger>

                      <ContextMenuContent>
                        <ContextMenuLabel className="text-[var(--gv-emp)]" style={{ ['--gv-emp' as string]: c.bg }}>{shift.employee}</ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => onShiftClick(shift, cat)}
                          className="gap-2"
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                          Edit shift
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => setCopiedShift?.(shift)}
                          className="gap-2"
                        >
                          <Copy size={14} className="text-muted-foreground" />
                          Copy shift
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            setCopiedShift?.(shift)
                            if (onDeleteShift) {
                              // Cut = copy to buffer + immediately remove from grid
                              setShifts((prev) => prev.filter((s) => s.id !== shift.id))
                              onBlockDelete?.(shift)
                            }
                          }}
                          className="gap-2"
                        >
                          <Scissors size={14} className="text-muted-foreground" />
                          Cut shift
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {onDeleteShift && (
                          <ContextMenuItem
                            onClick={() => setShiftToDeleteConfirm(shift)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 size={14} />
                            Delete shift
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                      </ContextMenu>
                    )
                  })
                })
              }

              // ── Individual mode: render this employee's shifts only ──
              const emp = row.employee!
              if (collapsed.has(cat.id)) return null
              const catTop = vr.start
              return dates.map((date, di) => {
                // Only render shifts belonging to this specific employee
                const allDayShifts = shiftIndex.get(`${cat.id}:${toDateISO(date)}`) ?? []
                const dayShifts = allDayShifts.filter((s) => s.employeeId === emp.id)
                // In individual mode each employee has their own row, so pack only
                // this employee's shifts (not all category shifts). Using the
                // category-level packedTracksIndex would assign track > 0 to shifts
                // that overlap with *other* employees, pushing them out of their row.
                const sorted = [...dayShifts].sort((a, b) => a.startH - b.startH)
                const empTrackNums = packShifts(sorted)
                const trackMap = new Map<string, number>()
                sorted.forEach((s, i) => trackMap.set(s.id, empTrackNums[i] ?? 0))
                return sorted.map((shift) => {
                  if (isLoading) {
                    const track = trackMap.get(shift.id) ?? 0
                    let left: number, width: number
                    if (isWeekView) {
                      const cs = Math.max(shift.startH, settings.visibleFrom)
                      const ce = Math.min(shift.endH, settings.visibleTo)
                      left = di * COL_W_WEEK + (cs - settings.visibleFrom) * PX_WEEK + 1
                      width = Math.max((ce - cs) * PX_WEEK - 2, 12)
                    } else if (isDayViewMultiDay) {
                      const cs = Math.max(shift.startH, settings.visibleFrom)
                      const ce = Math.min(shift.endH, settings.visibleTo)
                      left = di * DAY_WIDTH + (cs - settings.visibleFrom) * HOUR_W + 2
                      width = Math.max((ce - cs) * HOUR_W - 4, 18)
                    } else {
                      const cs = Math.max(shift.startH, settings.visibleFrom)
                      const ce = Math.min(shift.endH, settings.visibleTo)
                      left = (cs - settings.visibleFrom) * HOUR_W + 2
                      width = Math.max((ce - cs) * HOUR_W - 4, 18)
                    }
                    const clampedSkel = isWeekView
                      ? clampShiftHoriz(left, width, di * COL_W_WEEK + COL_W_WEEK - 1, 12, di * COL_W_WEEK + 1)
                      : isDayViewMultiDay
                        ? clampShiftHoriz(left, width, di * DAY_WIDTH + DAY_WIDTH - 2, 18, di * DAY_WIDTH + 2)
                        : clampShiftHoriz(left, width, DAY_WIDTH - 2, 18, 2)
                    if (!clampedSkel) return null
                    left = clampedSkel.left
                    width = clampedSkel.width
                    const top = catTop + track * laneH + (isSingleDayTimeline ? 2 : 3)
                    return (
                      <div
                        key={shift.id}
                        className="animate-pulse rounded-md bg-muted"
                        style={{ position: "absolute", left, top, width, height: ghostBarH }}
                      />
                    )
                  }
                  const track = trackMap.get(shift.id) ?? 0
                  const isDraft = shift.status === "draft"
                  const isDrag = dragId === shift.id
                  const top = catTop + track * laneH + (isSingleDayTimeline ? 2 : 4)
                  let left: number, width: number
                  if (isWeekView) {
                    const cs = Math.max(shift.startH, settings.visibleFrom)
                    const ce = Math.min(shift.endH, settings.visibleTo)
                    if (ce <= cs) return null
                    left = di * COL_W_WEEK + (cs - settings.visibleFrom) * PX_WEEK + 1
                    width = Math.max((ce - cs) * PX_WEEK - 2, 12)
                  } else if (isDayViewMultiDay) {
                    const cs = Math.max(shift.startH, settings.visibleFrom)
                    const ce = Math.min(shift.endH, settings.visibleTo)
                    if (ce <= cs) return null
                    left = di * DAY_WIDTH + (cs - settings.visibleFrom) * HOUR_W + 2
                    width = Math.max((ce - cs) * HOUR_W - 4, 18)
                  } else {
                    const cs = Math.max(shift.startH, settings.visibleFrom)
                    const ce = Math.min(shift.endH, settings.visibleTo)
                    if (ce <= cs) return null
                    left = (cs - settings.visibleFrom) * HOUR_W + 2
                    width = Math.max((ce - cs) * HOUR_W - 4, 18)
                  }
                  const clampedInd = isWeekView
                    ? clampShiftHoriz(left, width, di * COL_W_WEEK + COL_W_WEEK - 1, 12, di * COL_W_WEEK + 1)
                    : isDayViewMultiDay
                      ? clampShiftHoriz(left, width, di * DAY_WIDTH + DAY_WIDTH - 2, 18, di * DAY_WIDTH + 2)
                      : clampShiftHoriz(left, width, DAY_WIDTH - 2, 18, 2)
                  if (!clampedInd) return null
                  left = clampedInd.left
                  width = clampedInd.width
                  const rawVariant = settings.badgeVariant ?? "both"
                  // Day view: keep drag, disable resize (requested). Treat "none" as drag-only visual.
                  const variant = !isWeekView && !isDayViewMultiDay ? "drag" : rawVariant
                  const canDrag = (variant === "none" || variant === "drag" || variant === "both") && shift.draggable !== false
                  const showResize =
                    !readOnly &&
                    !(!isWeekView && !isDayViewMultiDay) &&
                    (variant === "resize" || variant === "both") &&
                    width >= 48 &&
                    shift.resizable !== false
                  const isLive = sameDay(shift.date, new Date()) && nowH >= shift.startH && nowH < shift.endH
                  const isPast = shift.date < toDateISO(new Date()) || (sameDay(shift.date, new Date()) && shift.endH < nowH)
                  const isDeleting = deletingIds.has(shift.id)
                  const isNew = newlyAddedIds.has(shift.id)
                  const isDropConflict = dropConflictId === shift.id
                  const isSelected = selectedBlockIds.has(shift.id)
                  const isActivating = activatingBlockId === shift.id
                  const hasConflict = conflictIds.has(shift.id)
                  const blockH = blockBarInnerH
                  const blockStyle: React.CSSProperties = {
                    position: "absolute", left, top, width,
                    height: blockH, borderRadius: 8,
                    cursor: canDrag ? (isDrag ? "grabbing" : isTouchDevice ? "default" : "grab") : "default",
                    userSelect: "none",
                    touchAction: isDrag ? "none" : isTouchDevice ? "pan-y" : "none",
                    opacity: isDrag ? 0.88 : isDeleting ? 0 : isPast ? 0.55 : 1,
                    zIndex: isDrag ? 50 : isSelected ? 12 : isActivating ? 15 : 8,
                    overflow: "hidden", display: "flex", alignItems: "stretch",
                    background: isDraft ? `${c.bg}15` : c.bg,
                    border: isDraft
                      ? `1.5px solid ${c.bg}80`
                      : hasConflict || isDropConflict
                        ? `2px solid var(--destructive)`
                        : isSelected
                          ? `2px solid ${c.bg}`
                          : `1px solid ${c.bg}55`,
                    boxShadow: isDrag
                      ? `0 20px 40px -8px ${c.bg}60, 0 8px 16px -4px rgba(0,0,0,0.25)`
                      : isActivating
                        ? `0 8px 24px -4px ${c.bg}80, 0 0 0 3px ${c.bg}33`
                        : isSelected
                          ? `0 0 0 3px ${c.bg}44, 0 2px 8px ${c.bg}44`
                          : isLive
                            ? `0 0 0 2px ${c.bg}55, 0 2px 8px ${c.bg}55`
                            : isDraft
                              ? `0 1px 4px ${c.bg}20`
                              : `0 2px 8px ${c.bg}44`,
                    transition: isDrag
                      ? "none"
                      : isActivating
                        ? "transform 200ms ease-out, box-shadow 200ms ease-out"
                        : isDeleting
                          ? "opacity 150ms ease-out"
                          : "box-shadow 150ms ease-out, transform 150ms ease-out",
                    contain: "layout style",
                    willChange: isDrag ? "transform" : "auto",
                  }
                  if (isDrag) {
                    blockStyle.left = 0
                    blockStyle.top = 0
                    blockStyle.zIndex = 200
                    blockStyle.pointerEvents = "none"
                    blockStyle.boxShadow = `0 24px 48px -8px ${c.bg}70, 0 8px 24px -4px rgba(0,0,0,0.3)`
                  }
                  const conflictCount = getConflictCount(shifts, shift.id)
                  const blockSlotProps = {
                    block: shift, resource: cat, isDraft, isDragging: isDrag,
                    hasConflict, widthPx: width, onDoubleClick: () => onShiftClick(shift, cat),
                  }
                  return (
                    <ContextMenu key={shift.id}>
                      <ContextMenuTrigger asChild>
                    <div
                      ref={(el) => { blockRefsRef.current[shift.id] = el }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${shift.employee}, ${getTimeLabel(shift.date, shift.startH)} to ${getTimeLabel(shift.date, shift.endH)}, ${cat.name}`}
                      data-scheduler-block
                      onPointerEnter={() => {
                        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
                        tooltipTimerRef.current = setTimeout(() => setTooltipBlockId(shift.id), TOOLTIP_HOVER_MS)
                      }}
                      onPointerLeave={() => {
                        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
                        tooltipTimerRef.current = null
                        if (tooltipLeaveTimerRef.current) clearTimeout(tooltipLeaveTimerRef.current)
                        tooltipLeaveTimerRef.current = setTimeout(() => setTooltipBlockId(null), TOOLTIP_LEAVE_MS)
                      }}
                      onPointerDown={canDrag ? (e: React.PointerEvent<HTMLDivElement>) => onBD(e, shift) : undefined}
                      onContextMenu={() => { setTooltipBlockId(null); if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current) }}
                      onDoubleClick={(e) => { e.stopPropagation(); if (!dragId) onShiftClick(shift, cat) }}
                      onKeyDown={(e) => onBlockKeyDown(e, shift, cat)}
                      className={cn(
                        "group/block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isNew && "animate-[scaleIn_120ms_ease-out]",
                      )}
                      style={blockStyle}
                    >
                      {slots.block ? slots.block(blockSlotProps) : (
                        <>
                          {/* Left accent strip */}
                          <div className="w-1 shrink-0 rounded-l-lg bg-black/18" />

                          {/* Main content */}
                          {isSingleDayTimeline ? (
                            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-2">
                              {hasConflict && (
                                <AlertTriangle
                                  size={9}
                                  className={cn("shrink-0", isDraft ? "text-destructive" : "text-white/90")}
                                />
                              )}
                              <span
                                className={cn(
                                  "truncate text-[11px] font-semibold leading-none",
                                  isDraft ? "text-[var(--blk-time)]" : "text-white/90"
                                )}
                                style={isDraft ? { ['--blk-time' as string]: c.bg } : undefined}
                              >
                                {getTimeLabel(shift.date, shift.startH)}–{getTimeLabel(shift.date, shift.endH)}
                                {shift.breakStartH !== undefined && shift.breakEndH !== undefined && (
                                  <>
                                    {" "}
                                    · ☕ {Math.round((shift.breakEndH - shift.breakStartH) * 60)}m
                                  </>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden px-2">
                              <div className="flex min-w-0 items-center gap-0.5">
                                {hasConflict && (
                                  <AlertTriangle
                                    size={9}
                                    className={cn("shrink-0", isDraft ? "text-destructive" : "text-white/90")}
                                  />
                                )}
                                <span
                                  className={cn(
                                    "truncate text-xs font-bold leading-snug",
                                    isDraft ? "text-[var(--blk-name)]" : "text-white/[0.97]"
                                  )}
                                  style={isDraft ? { ['--blk-name' as string]: c.text } : undefined}
                                >
                                  {shift.employee}
                                </span>
                              </div>
                              <div className="flex min-w-0 items-center gap-1">
                                <span
                                  className={cn(
                                    "truncate text-[10px] font-normal leading-snug",
                                    isDraft ? "text-[var(--blk-time)]" : "text-white/75"
                                  )}
                                  style={isDraft ? { ['--blk-time' as string]: c.bg } : undefined}
                                >
                                  {getTimeLabel(shift.date, shift.startH)}–{getTimeLabel(shift.date, shift.endH)}
                                </span>
                                {shift.breakStartH !== undefined && shift.breakEndH !== undefined && width >= 80 && (
                                  <span
                                    className={cn(
                                      "shrink-0 text-[9px]",
                                      isDraft ? "text-[var(--blk-brk)]" : "text-white/65"
                                    )}
                                    style={isDraft ? { ['--blk-brk' as string]: c.bg } : undefined}
                                  >
                                    ☕ {Math.round((shift.breakEndH - shift.breakStartH) * 60)}m
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Status badge */}
                          {width >= 72 && (hasConflict || isDraft || isLive) && (
                            <div
                              className={cn(
                                "pointer-events-none absolute top-1 rounded-[10px] px-[5px] py-0.5 text-[8px] font-bold leading-none whitespace-nowrap text-white/95",
                                showResize ? "right-3.5" : "right-1.5",
                                hasConflict && "bg-red-500/85",
                                !hasConflict && isDraft && "bg-black/25",
                                !hasConflict && !isDraft && "bg-white/25"
                              )}
                            >
                              {hasConflict ? "Conflict" : isDraft ? "Draft" : "Live"}
                            </div>
                          )}

                          {/* Break gap overlay */}
                          {shift.breakStartH !== undefined && shift.breakEndH !== undefined && (() => {
                            const dur = shift.endH - shift.startH
                            if (dur <= 0) return null
                            const breakLeft = ((shift.breakStartH - shift.startH) / dur) * 100
                            const breakWidth = ((shift.breakEndH - shift.breakStartH) / dur) * 100
                            return (
                              <div
                                className="pointer-events-none absolute top-0 z-[2] h-full border-l border-r border-dashed border-white/35 bg-black/15"
                                style={{ left: `${breakLeft}%`, width: `${Math.max(breakWidth, 2)}%` }}
                                title={`Break ${getTimeLabel(shift.date, shift.breakStartH!)}–${getTimeLabel(shift.date, shift.breakEndH!)}`}
                              />
                            )
                          })()}

                          {showResize && (
                            <div
                              data-resize="left"
                              onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => onRLD(e, shift)}
                              className="absolute left-0 top-0 z-[3] flex h-full cursor-ew-resize items-center justify-start pl-2"
                              style={{ width: isTouchDevice ? RESIZE_HANDLE_MIN_TOUCH_PX : 14 }}
                            >
                              <div className="pointer-events-none h-[55%] min-h-2.5 w-0.5 rounded-sm bg-white/65" />
                            </div>
                          )}
                          {showResize && (
                            <div
                              data-resize="right"
                              onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => onRRD(e, shift)}
                              className="absolute right-0 top-0 z-[3] flex h-full cursor-ew-resize items-center justify-end pr-2"
                              style={{ width: isTouchDevice ? RESIZE_HANDLE_MIN_TOUCH_PX : 14 }}
                            >
                              <div className="pointer-events-none h-[55%] min-h-2.5 w-0.5 rounded-sm bg-white/65" />
                            </div>
                          )}
                          {/* Dep-draw dots — 4 connection points, visible on hover */}
                          {renderDepDots(shift, tooltipBlockId === shift.id || depHoveredBlockId === shift.id)}
                        </>
                      )}
                    </div>
                      </ContextMenuTrigger>

                    <ContextMenuContent>
                      <ContextMenuLabel className="text-[var(--gv-emp)]" style={{ ['--gv-emp' as string]: c.bg }}>{shift.employee}</ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                          onClick={() => onShiftClick(shift, cat)}
                          className="gap-2"
                        >
                      <Pencil size={14} className="text-muted-foreground" />
                          Edit shift
                      </ContextMenuItem>
                      <ContextMenuItem
                          onClick={() => setCopiedShift?.(shift)}
                          className="gap-2"
                        >
                      <Copy size={14} className="text-muted-foreground" />
                          Copy shift
                      </ContextMenuItem>
                      <ContextMenuItem
                          onClick={() => {
                            setCopiedShift?.(shift)
                            if (onDeleteShift) {
                              setShifts((prev) => prev.filter((s) => s.id !== shift.id))
                              onBlockDelete?.(shift)
                            }
                          }}
                          className="gap-2"
                        >
                      <Scissors size={14} className="text-muted-foreground" />
                          Cut shift
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                        {onDeleteShift && (
                      <ContextMenuItem
                            onClick={() => setShiftToDeleteConfirm(shift)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                        <Trash2 size={14} />
                            Delete shift
                      </ContextMenuItem>
                        )}
                    </ContextMenuContent>
                    </ContextMenu>
                  )
                })
              })
            })}


              </div>
            </div>
            {hasDayScrollNav && (
              <div style={{ width: DAY_SCROLL_BUFFER, flexShrink: 0, minWidth: DAY_SCROLL_BUFFER }} />
            )}
          </div>
        </div>
      </div>

      {/* Hover popover — rendered via portal so it escapes all scroll/overflow/contain clipping */}
      {tooltipBlockId && (() => {
        const shift = shifts.find((s) => s.id === tooltipBlockId)
        if (!shift) return null
        const blockEl = blockRefsRef.current[tooltipBlockId]
        const r = blockEl?.getBoundingClientRect()
        if (!r) return null
        const cat = CATEGORIES.find((c) => c.id === shift.categoryId)
        if (!cat) return null
        const c = getColor(cat.colorIdx)
        const dur = shift.endH - shift.startH
        const hrs = dur % 1 === 0 ? `${dur}h` : `${dur.toFixed(1)}h`
        const hasConflict = conflictIds.has(shift.id)
        const isDraft = shift.status === "draft"
        const showBelow = r.top < 140
        const popTop = showBelow ? r.bottom + 8 : r.top - 8
        const popLeft = Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120)
        return createPortal(
          <div
            onPointerEnter={() => { if (tooltipLeaveTimerRef.current) clearTimeout(tooltipLeaveTimerRef.current) }}
            onPointerLeave={() => { tooltipLeaveTimerRef.current = setTimeout(() => setTooltipBlockId(null), TOOLTIP_LEAVE_MS) }}
            className={cn(
              "pointer-events-auto fixed z-[99999] -translate-x-1/2 overflow-hidden rounded-[10px] border border-border bg-popover text-popover-foreground shadow-[0_8px_32px_rgba(0,0,0,0.18)]",
              !slots.tooltip && "min-w-[190px] max-w-[280px] px-[14px] py-[10px]",
            )}
            style={{
              top: showBelow ? popTop : undefined,
              bottom: showBelow ? undefined : window.innerHeight - popTop,
              left: popLeft,
            }}
          >
            {slots.tooltip ? slots.tooltip(shift, cat) : (
              <>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <div className="size-2 shrink-0 rounded-full" style={{ background: c.bg }} />
                  <span className="text-[13px] font-bold text-foreground">{shift.employee}</span>
                </div>
                <div className="mb-1.5 text-[11px] font-semibold" style={{ color: c.bg }}>{cat.name}</div>
                <div className="text-[11px] font-semibold text-foreground">
                  {getTimeLabel(shift.date, shift.startH)} – {getTimeLabel(shift.date, shift.endH)}
                  <span className="ml-1.5 font-normal text-muted-foreground">{hrs}</span>
                </div>
                {shift.breakStartH !== undefined && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    Break: {getTimeLabel(shift.date, shift.breakStartH!)}–{getTimeLabel(shift.date, shift.breakEndH!)}
                  </div>
                )}
                {hasConflict && (
                  <div className="mt-1.5 flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-[10px] font-semibold text-destructive-foreground">
                    <AlertTriangle size={10} />
                    Shift conflict — cannot publish
                  </div>
                )}
                {isDraft && !hasConflict && (
                  <div className="mt-1.5 text-[10px] text-muted-foreground">Draft — not published</div>
                )}
              </>
            )}
          </div>,
          document.body
        )
      })()}

      {/* Marker label input — shown immediately after placing a marker */}
      {pendingMarker && onMarkersChange && createPortal(
        <div
          className="fixed z-[999999] flex min-w-[180px] flex-col gap-1.5 rounded-lg border border-border bg-popover p-2.5 shadow-lg"
          style={{
            top: pendingMarker.clientY + 12,
            left: pendingMarker.clientX,
          }}
        >
          <span className="text-[11px] font-semibold text-muted-foreground">
            Label this marker (optional)
          </span>
          <input
            autoFocus
            placeholder="e.g. Deadline, Sprint start…"
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                const label = (e.target as HTMLInputElement).value.trim()
                if (label) {
                  onMarkersChange(markers.map((m) =>
                    m.id === pendingMarker.id ? { ...m, label } : m
                  ))
                }
                setPendingMarker(null)
              }
            }}
            onBlur={(e) => {
              const label = e.target.value.trim()
              if (label) {
                onMarkersChange(markers.map((m) =>
                  m.id === pendingMarker.id ? { ...m, label } : m
                ))
              }
              setPendingMarker(null)
            }}
          />
          <span className="text-[10px] text-muted-foreground">
            Press Enter to confirm · Esc or click away to skip
          </span>
        </div>,
        document.body
      )}

      {/* Grid right-click context menu — right-click on any empty cell */}
      {gridContextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[999998]" onPointerDown={() => setGridContextMenu(null)} />
          <div
            className="fixed z-[999999] min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
            style={{
              top: gridContextMenu.clientY + 4,
              left: gridContextMenu.clientX,
            }}
          >
            {/* Add shift — always shown, uses customisable label */}
            {!readOnly && (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-accent"
                onClick={() => {
                  setAddPrompt({ date: gridContextMenu.date, categoryId: gridContextMenu.categoryId, hour: gridContextMenu.hour, employeeId: gridContextMenu.employeeId })
                  setGridContextMenu(null)
                }}
              >
                <Plus size={14} className="shrink-0 text-primary" />
                {labels.addShift}
              </button>
            )}
            {/* Divider — only shown when both items are visible */}
            {!readOnly && copiedShift && (
              <div className="my-1 h-px bg-border" />
            )}
            {/* Paste — only shown when there is a copied/cut shift */}
            {copiedShift && (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-accent"
                onClick={() => {
                  const newShift: Block = {
                    ...copiedShift,
                    id: nextUid(),
                    date: toDateISO(gridContextMenu.date),
                    categoryId: gridContextMenu.categoryId,
                    employeeId: gridContextMenu.employeeId ?? copiedShift.employeeId,
                    employee: (() => {
                      const e = employees.find(e => e.id === (gridContextMenu.employeeId ?? copiedShift.employeeId))
                      return e?.name ?? copiedShift.employee
                    })(),
                    startH: gridContextMenu.hour,
                    endH: gridContextMenu.hour + (copiedShift.endH - copiedShift.startH),
                  }
                  setShifts((prev) => [...prev, newShift])
                  setCopiedShift?.(null)
                  setGridContextMenu(null)
                }}
              >
                <ClipboardPaste size={14} className="shrink-0 text-primary" />
                Paste shift here
              </button>
            )}
          </div>
        </>,
        document.body
      )}
      {headerPopover && createPortal(
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-[999998]"
            onPointerDown={() => setHeaderPopover(null)}
          />
          <div
            className="fixed z-[999999] min-w-[200px] overflow-hidden rounded-[10px] border border-border bg-popover py-1 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
            style={{
              top: headerPopover.clientY + 4,
              left: headerPopover.clientX,
            }}
          >
            {/* Add Marker */}
            {onMarkersChange && (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-accent"
                onClick={() => {
                  const newId = `marker-${Date.now()}`
                  onMarkersChange([...markers, {
                    id: newId,
                    date: headerPopover.date,
                    hour: headerPopover.hour,
                    label: "",
                    color: "var(--primary)",
                    draggable: true,
                  }])
                  setPendingMarker({ id: newId, clientX: headerPopover.clientX, clientY: headerPopover.clientY })
                  setHeaderPopover(null)
                }}
              >
                <MapPin size={14} className="shrink-0 text-primary" />
                Add marker here
              </button>
            )}

            {/* Divider */}
            <div className="my-0.5 h-px bg-border" />

            {/* Zoom controls */}
            <div className="px-3.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Zoom
            </div>
            <div className="flex items-center gap-2 px-3.5 pb-2 pt-1">
              <ZoomOut
                size={13}
                className={cn(
                  "shrink-0 text-foreground",
                  zoom <= 0.5 ? "cursor-default opacity-35" : "cursor-pointer opacity-70",
                )}
                onClick={() => { if (setZoom && zoom > 0.5) setZoom((z) => Math.max(0.5, z - 0.25)) }}
              />
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={[0.5, 0.75, 1, 1.25, 1.5, 2].indexOf(zoom) >= 0 ? [0.5, 0.75, 1, 1.25, 1.5, 2].indexOf(zoom) : Math.round((zoom - 0.5) / 0.25)}
                onChange={(e) => {
                  const levels = [0.5, 0.75, 1, 1.25, 1.5, 2]
                  const level = levels[Number(e.target.value)]
                  if (level !== undefined && setZoom) setZoom(level)
                }}
                className="h-1 flex-1 cursor-pointer accent-primary"
              />
              <ZoomIn
                size={13}
                className={cn(
                  "shrink-0 text-foreground",
                  zoom >= 2 ? "cursor-default opacity-35" : "cursor-pointer opacity-70",
                )}
                onClick={() => { if (setZoom && zoom < 2) setZoom((z) => Math.min(2, z + 0.25)) }}
              />
              <span className="min-w-[28px] text-right text-[11px] font-semibold text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Divider */}
            <div className="my-0.5 h-px bg-border" />

            {/* Dependencies toggle */}
            {onDependenciesChange && (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-accent"
                onClick={() => {
                  // Toggle: clear all deps or restore — for now just close (deps are always on)
                  setHeaderPopover(null)
                }}
              >
                <Link2 size={14} className={cn("shrink-0", dependencies.length > 0 ? "text-primary" : "text-muted-foreground")} />
                Dependencies
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {dependencies.length} link{dependencies.length !== 1 ? "s" : ""}
                </span>
              </button>
            )}
          </div>
        </>,
        document.body
      )}
      {selectedBlockIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-200 flex -translate-x-1/2 transform items-center gap-2 rounded-[10px] border border-border bg-background px-4 py-2 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
          <span className="font-semibold text-foreground">
            {selectedBlockIds.size} selected
          </span>
          <button
            type="button"
            onClick={() => {
              setShifts((prev) => prev.map((s) =>
                selectedBlockIds.has(s.id) ? { ...s, status: "published" as const } : s
              ))
              setSelectedBlockIds(new Set())
            }}
            className="cursor-pointer rounded-md border-none bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={deleteSelectedBlocks}
            className="cursor-pointer rounded-md border-none bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => moveSelectedBlocks(-1)}
            title="Move selected back 1 day"
            className="cursor-pointer rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
          >
            ← Day
          </button>
          <button
            type="button"
            onClick={() => moveSelectedBlocks(1)}
            title="Move selected forward 1 day"
            className="cursor-pointer rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
          >
            Day →
          </button>
          <button
            type="button"
            onClick={() => setSelectedBlockIds(new Set())}
            className="cursor-pointer rounded-md border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {staffPanel &&
        (() => {
          const cat = CATEGORIES.find((c) => c.id === staffPanel.categoryId)
          const date = dates[isWeekView || isDayViewMultiDay ? Math.floor(dates.length / 2) : 0]
          const dayShifts = shifts.filter((s) => sameDay(s.date, date))
          return cat ? (
            <StaffPanel
              category={cat}
              date={date}
              dayShifts={dayShifts}
              anchorRect={isTablet ? null : staffPanel.anchorRect}
              variant={isTablet ? "drawer" : "popover"}
              onDragStaff={({ empId, categoryId, empName, pointerId }) => {
                staffDragRef.current = { empId, fromCategoryId: categoryId, empName, pointerId }
                setDragEmpId(empId)
                setIsStaffDragging(true)
              }}
              onClose={() => setStaffPanel(null)}
            />
          ) : null
        })()}

      {shiftToDeleteConfirm && onDeleteShift && (
        <div
          className="fixed inset-0 z-10000 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
          onClick={() => setShiftToDeleteConfirm(null)}
        >
          <div
            className="max-w-[340px] rounded-xl border border-border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-base font-bold text-foreground">
              Delete shift?
            </div>
            <div className="mb-4 text-[13px] text-muted-foreground">
              This shift will be removed. This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShiftToDeleteConfirm(null)}
                className="cursor-pointer rounded-lg border-none bg-muted px-4 py-2 text-[13px] font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = shiftToDeleteConfirm.id
                  onBlockDelete?.(shiftToDeleteConfirm)
                  setShiftToDeleteConfirm(null)
                  setDeletingIds((prev) => new Set([...prev, id]))
                  setTimeout(() => {
                    onDeleteShift?.(id)
                    setDeletingIds((prev) => {
                      const n = new Set(prev)
                      n.delete(id)
                      return n
                    })
                  }, 150)
                }}
                className="cursor-pointer rounded-lg border-none bg-destructive px-4 py-2 text-[13px] font-semibold text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}


      {categoryWarn &&
        (() => {
          if (categoryWarn.onConfirmAction) {
            const emp = ALL_EMPLOYEES.find((e) => e.name === categoryWarn.empName)
            return categoryWarn.fromCategory && categoryWarn.toCategory ? (
              <RoleWarningModal
                emp={emp || null}
                fromCategory={categoryWarn.fromCategory}
                toCategory={categoryWarn.toCategory}
                onConfirm={() => {
                  categoryWarn.onConfirmAction?.()
                  setCategoryWarn(null)
                }}
                onCancel={() => setCategoryWarn(null)}
              />
            ) : null
          }
          const { shift, newCategoryId, ns, ne, newDate } = categoryWarn
          if (!shift || !newCategoryId || ns === undefined || ne === undefined || !newDate)
            return null
          const emp = ALL_EMPLOYEES.find((e) => e.id === shift.employeeId)
          const fromCategory = CATEGORIES.find((c) => c.id === emp?.categoryId)
          const toCategory = CATEGORIES.find((c) => c.id === newCategoryId)
          return fromCategory && toCategory ? (
            <RoleWarningModal
              emp={emp || null}
              fromCategory={fromCategory}
              toCategory={toCategory}
              onConfirm={() => {
                setShifts((prev) =>
                  prev.map((s) =>
                    s.id === shift.id
                      ? { ...s, startH: ns, endH: ne, categoryId: newCategoryId, date: newDate }
                      : s
                  )
                )
                setCategoryWarn(null)
              }}
              onCancel={() => setCategoryWarn(null)}
            />
          ) : null
        })()}

      {addPrompt && (
        <AddShiftModal
          date={addPrompt.date}
          categoryId={addPrompt.categoryId}
          employeeId={addPrompt.employeeId}
          prefillStartH={addPrompt.hour}
          onAdd={(shift) => setShifts((prev) => [...prev, shift])}
          onClose={() => setAddPrompt(null)}
        />
      )}
    </div>
  )
}

export const GridView = React.memo(GridViewInner)
