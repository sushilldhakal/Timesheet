import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import type { Block, Resource } from "../types"
import { useSchedulerContext } from "../context"
import {
  SIDEBAR_W,
  SHIFT_H,
  ROLE_HDR,
  HOUR_HDR_H,
  snapH,
  clamp,
  sameDay,
  isToday,
  fmt12,
  hourBg,
  getWeekDates,
  toDateISO,
} from "../constants"
import { packShifts, getCategoryRowHeight } from "../utils/packing"
import { StaffPanel } from "./StaffPanel"
import { Plus } from "lucide-react"

interface GridViewProps {
  dates: Date[]
  shifts: Block[]
  setShifts: React.Dispatch<React.SetStateAction<Block[]>>
  selEmps: Set<string>
  onShiftClick: (block: Block, resource: Resource) => void
  onAddShift: (date: Date, categoryId?: string, empId?: string) => void
  isWeekView?: boolean
  setDate?: React.Dispatch<React.SetStateAction<Date>>
  isDayViewMultiDay?: boolean
  focusedDate?: Date
  copiedShift?: Block | null
  setCopiedShift?: React.Dispatch<React.SetStateAction<Block | null>>
  zoom?: number
  onDateDoubleClick?: (date: Date) => void
  onVisibleCenterChange?: (date: Date) => void
  onVisibleRangeChange?: (visibleStartDate: Date, visibleEndDate: Date) => void
  prefetchThreshold?: number
  onDeleteShift?: (shiftId: string) => void
  scrollToNowRef?: React.MutableRefObject<(() => void) | null>
  initialScrollToNow?: boolean
  isLoading?: boolean
  onSwipeNavigate?: (dir: number) => void
  onPinchZoom?: (zoom: number) => void
  setZoom?: React.Dispatch<React.SetStateAction<number>>
  mobileResourceIndex?: number
  onMobileResourceChange?: (dir: number) => void
  onNavigate?: (dir: number) => void
  onBlockMoved?: (block: Block, newDate: string, newStartH: number, newEndH: number) => void
  onFocusedBlockChange?: (blockId: string | null) => void
  readOnly?: boolean
}

interface StaffPanelState {
  categoryId: string
  anchorRect: DOMRect
}

function GridViewInner({
  dates,
  shifts,
  setShifts,
  selEmps,
  onShiftClick,
  onAddShift,
  isWeekView = false,
  zoom = 1,
  readOnly = false,
}: GridViewProps): React.ReactElement {
  const { categories, employees, getColor, labels, settings } = useSchedulerContext()
  const [staffPanel, setStaffPanel] = useState<StaffPanelState | null>(null)

  const HOUR_W = 88 * zoom
  const COL_W_WEEK = isWeekView ? Math.max((settings.visibleTo - settings.visibleFrom) * 18, 160) * zoom : HOUR_W
  const DAY_WIDTH = (settings.visibleTo - settings.visibleFrom) * HOUR_W

  const displayShifts = useMemo(
    () => shifts.filter((s) => selEmps.has(s.employeeId)),
    [shifts, selEmps]
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

  const categoryHeights = useMemo((): Record<string, number> => {
    const map: Record<string, number> = {}
    categories.forEach((cat) => {
      let maxH = ROLE_HDR + SHIFT_H
      dates.forEach((date) => {
        const dayShifts = shiftIndex.get(`${cat.id}:${toDateISO(date)}`) ?? []
        const h = getCategoryRowHeight(cat.id, dayShifts)
        if (h > maxH) maxH = h
      })
      map[cat.id] = maxH
    })
    return map
  }, [shiftIndex, dates, categories])

  const categoryTops = useMemo((): Record<string, number> => {
    const map: Record<string, number> = {}
    let acc = 0
    categories.forEach((c) => {
      map[c.id] = acc
      acc += categoryHeights[c.id]
    })
    return map
  }, [categoryHeights, categories])

  const totalH = useMemo(
    (): number => categories.reduce((s, c) => s + categoryHeights[c.id], 0),
    [categoryHeights, categories]
  )

  const TOTAL_W = isWeekView ? dates.length * COL_W_WEEK : DAY_WIDTH

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          borderBottom: "2px solid var(--border)",
          background: "var(--muted)",
        }}
      >
        <div
          style={{
            width: SIDEBAR_W,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-end",
            padding: "0 12px 6px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {labels.categories}
          </span>
        </div>
        <div style={{ flex: 1, overflowX: "hidden" }}>
          <div style={{ display: "flex", width: TOTAL_W, minWidth: TOTAL_W }}>
            {dates.map((d, i) => {
              const today = isToday(d)
              return (
                <div
                  key={i}
                  style={{
                    width: isWeekView ? COL_W_WEEK : DAY_WIDTH,
                    flexShrink: 0,
                    textAlign: "center",
                    padding: "8px 4px 6px",
                    borderRight: "1px solid var(--border)",
                    background: today ? "var(--accent)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: today ? "var(--primary)" : "var(--foreground)",
                    }}
                  >
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Sidebar */}
        <div
          style={{
            width: SIDEBAR_W,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            overflowY: "hidden",
            background: "var(--muted)",
          }}
        >
          {categories.map((cat) => {
            const c = getColor(cat.colorIdx)
            const h = categoryHeights[cat.id]
            return (
              <div
                key={cat.id}
                style={{
                  height: h,
                  borderBottom: "1px solid var(--border)",
                  background: "var(--muted)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: ROLE_HDR,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.bg,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.name}
                  </span>
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setStaffPanel((p) =>
                        p?.categoryId === cat.id ? null : { categoryId: cat.id, anchorRect: rect }
                      )
                    }}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: c.text,
                      background: c.light,
                      border: `1px solid ${c.border}`,
                      borderRadius: 5,
                      padding: "2px 6px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {labels.staff}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
          <div
            style={{
              position: "relative",
              width: TOTAL_W,
              height: totalH,
              minHeight: "100%",
            }}
          >
            {/* Background cells */}
            {categories.map((cat) => {
              const top = categoryTops[cat.id]
              const rowH = categoryHeights[cat.id]
              return dates.map((date, di) => (
                <div
                  key={`bg-${cat.id}-${di}`}
                  style={{
                    position: "absolute",
                    left: isWeekView ? di * COL_W_WEEK : 0,
                    top,
                    width: isWeekView ? COL_W_WEEK : DAY_WIDTH,
                    height: rowH,
                    background: isToday(date) ? "var(--accent)" : "var(--background)",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                  }}
                />
              ))
            })}

            {/* Shift blocks */}
            {categories.map((cat) => {
              const catTop = categoryTops[cat.id]
              return dates.map((date, di) => {
                const dayShifts = shiftIndex.get(`${cat.id}:${toDateISO(date)}`) ?? []
                const sorted = [...dayShifts].sort((a, b) => a.startH - b.startH)
                const trackNums = packShifts(sorted)
                const c = getColor(cat.colorIdx)

                return sorted.map((shift, si) => {
                  const track = trackNums[si]
                  const isDraft = shift.status === "draft"
                  const top = catTop + ROLE_HDR + track * SHIFT_H + 3
                  let left: number, width: number

                  if (isWeekView) {
                    const cs = Math.max(shift.startH, settings.visibleFrom)
                    const ce = Math.min(shift.endH, settings.visibleTo)
                    if (ce <= cs) return null
                    const pxPerH = COL_W_WEEK / Math.max(settings.visibleTo - settings.visibleFrom, 1)
                    left = di * COL_W_WEEK + (cs - settings.visibleFrom) * pxPerH + 1
                    width = Math.max((ce - cs) * pxPerH - 2, 12)
                  } else {
                    const cs = Math.max(shift.startH, settings.visibleFrom)
                    const ce = Math.min(shift.endH, settings.visibleTo)
                    if (ce <= cs) return null
                    left = (cs - settings.visibleFrom) * HOUR_W + 2
                    width = Math.max((ce - cs) * HOUR_W - 4, 18)
                  }

                  return (
                    <div
                      key={shift.id}
                      onClick={() => onShiftClick(shift, cat)}
                      style={{
                        position: "absolute",
                        left,
                        top,
                        width,
                        height: SHIFT_H - 6,
                        borderRadius: 5,
                        cursor: "pointer",
                        userSelect: "none",
                        display: "flex",
                        alignItems: "center",
                        background: isDraft
                          ? "transparent"
                          : `linear-gradient(135deg,${c.bg},${c.bg}cc)`,
                        border: isDraft ? `1.5px dashed ${c.bg}` : `1px solid ${c.bg}88`,
                        boxShadow: isDraft ? "none" : `0 2px 6px ${c.bg}44`,
                        padding: "0 6px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          minWidth: 0,
                        }}
                      >
                        {width >= 60 && (
                          <div
                            style={{
                              color: isDraft ? c.bg : "var(--background)",
                              fontSize: 10,
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {shift.employee.split(" ")[0]}
                          </div>
                        )}
                        {width > 52 && (
                          <div
                            style={{
                              color: isDraft ? c.text : "var(--background)",
                              fontSize: 9,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmt12(shift.startH)}–{fmt12(shift.endH)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              })
            })}

            {/* Add buttons */}
            {categories.map((cat) => {
              const top = categoryTops[cat.id]
              const rowH = categoryHeights[cat.id]
              const addBtnTop = top + rowH - 32 + (32 - 20) / 2
              
              if (isWeekView) {
                return dates.map((date, di) => (
                  <div 
                    key={`add-${cat.id}-${di}`} 
                    style={{ 
                      position: "absolute", 
                      left: di * COL_W_WEEK + COL_W_WEEK / 2 - 10, 
                      top: addBtnTop, 
                      zIndex: 25 
                    }}
                  >
                    <button
                      onClick={() => onAddShift(date, cat.id)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "1.5px dashed var(--muted-foreground)",
                        background: "var(--background)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--muted-foreground)",
                        padding: 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                      title="Add Shift"
                    >
                      <Plus size={9} />
                    </button>
                  </div>
                ))
              }
              
              return (
                <div 
                  key={`add-${cat.id}`} 
                  style={{ 
                    position: "absolute", 
                    left: DAY_WIDTH / 2 - 10, 
                    top: addBtnTop, 
                    zIndex: 25 
                  }}
                >
                  <button
                    onClick={() => onAddShift(dates[0] ?? new Date(), cat.id)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "1.5px dashed var(--muted-foreground)",
                      background: "var(--background)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted-foreground)",
                      padding: 0,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                    title="Add Shift"
                  >
                    <Plus size={9} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Staff Panel */}
      {staffPanel && (
        <StaffPanel
          category={categories.find((c) => c.id === staffPanel.categoryId)!}
          date={dates[0] ?? new Date()}
          dayShifts={shifts.filter((s) => s.categoryId === staffPanel.categoryId)}
          onDragStaff={() => {}}
          onPointerDragStart={() => {}}
          anchorRect={staffPanel.anchorRect}
          onClose={() => setStaffPanel(null)}
        />
      )}
    </div>
  )
}

export const GridView = React.memo(GridViewInner)