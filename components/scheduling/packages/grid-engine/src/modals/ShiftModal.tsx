import React, { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import type { Block, Resource } from '@shadcn-scheduler/core'
import { useSchedulerContext } from '@shadcn-scheduler/shell'
import { HOURS, SNAP, toDateISO, parseBlockDate } from '@shadcn-scheduler/core'
import { findConflicts } from '@shadcn-scheduler/core'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const LBL = "mb-1 block text-[11px] font-semibold text-muted-foreground"
const SEL =
  "w-full min-w-0 cursor-pointer rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"

interface ShiftModalProps {
  shift: Block | null
  category: Resource | null
  onClose: () => void
  onPublish: (shiftId: string) => void
  onUnpublish: (shiftId: string) => void
  onDelete?: (shiftId: string) => void
  variant?: "modal" | "sheet"
  allShifts?: Block[]
  onUpdate?: (updated: Block) => void
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

export function ShiftModal({
  shift, category, onClose, onPublish, onUnpublish, onDelete,
  variant = "modal", allShifts, onUpdate,
}: ShiftModalProps): React.ReactElement | null {
  if (!shift || !category) return null
  const { getColor, labels, categories, settings, getTimeLabel } = useSchedulerContext()
  const c = getColor(category.colorIdx)
  const isDraft = shift.status === "draft"

  const [draft, setDraft] = useState<Block>(shift)
  const [errors, setErrors] = useState<{ date?: string; startH?: string; endH?: string }>({})
  const [dateOpen, setDateOpen] = useState(false)
  const [hasBreak, setHasBreak] = useState(!!shift.breakStartH)
  const [splitShift, setSplitShift] = useState(!!shift.breakStartH)
  const [breakStartH, setBreakStartH] = useState(
    shift.breakStartH ?? Math.floor((shift.startH + shift.endH) / 2)
  )
  const [breakEndH, setBreakEndH] = useState(
    shift.breakEndH ?? Math.ceil((shift.startH + shift.endH) / 2)
  )
  const [breakDurMin, setBreakDurMin] = useState(
    shift.breakStartH && shift.breakEndH ? (shift.breakEndH - shift.breakStartH) * 60 : 30
  )

  const hourOptions = useMemo(() => {
    const { visibleFrom: from, visibleTo: to } = settings
    const step = SNAP || 0.5
    const out: number[] = []
    for (let i = 0; i <= Math.round((to - from) / step); i++) {
      const h = from + i * step
      if (h >= from && h <= to) out.push(Number(h.toFixed(2)))
    }
    return out
  }, [settings.visibleFrom, settings.visibleTo])

  const overlaps = useMemo(() => {
    if (!allShifts) return []
    const next = allShifts.map((b) => (b.id === draft.id ? draft : b))
    const conflictIds = findConflicts(next)
    if (!conflictIds.has(draft.id)) return []
    return next.filter(
      (b) => b.id !== draft.id && b.employeeId === draft.employeeId &&
        b.date === draft.date && b.startH < draft.endH && b.endH > draft.startH
    )
  }, [allShifts, draft])

  const hasConflict = overlaps.length > 0

  const validate = (next: Block): boolean => {
    const errs: typeof errors = {}
    if (!next.date) errs.date = "Date is required."
    if (!(next.startH < next.endH)) {
      errs.startH = "Start must be before end."
      errs.endH = "End must be after start."
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!onUpdate) { onClose(); return }
    if (!validate(draft)) return
    const updated: Block = { ...draft }
    if (hasBreak) {
      if (splitShift) {
        updated.breakStartH = breakStartH
        updated.breakEndH = breakEndH
      } else {
        const mid = draft.startH + (draft.endH - draft.startH) / 2
        const durH = breakDurMin / 60
        updated.breakStartH = parseFloat((mid - durH / 2).toFixed(2))
        updated.breakEndH = parseFloat((mid + durH / 2).toFixed(2))
      }
    } else {
      delete updated.breakStartH
      delete updated.breakEndH
    }
    onUpdate(updated)
    onClose()
  }

  const totalHours = draft.endH - draft.startH
  const breakHours = hasBreak ? (splitShift ? breakEndH - breakStartH : breakDurMin / 60) : 0
  const workedHours = Math.max(0, totalHours - breakHours)

  const content = (
    <div
      onClick={variant === "modal" ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "bg-background px-[22px] py-5",
        variant === "sheet" ? "rounded-none" : "rounded-[14px]",
        variant === "modal" && "w-[340px] shadow-[0_24px_64px_rgba(0,0,0,0.22)]",
        "border-t-4 border-t-(--cat-bg)",
      )}
      style={{ ["--cat-bg" as string]: c.bg }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 shrink-0 rounded-full bg-(--cat-bg)" />
            <span className="text-[11px] font-bold uppercase tracking-[1px] text-(--cat-bg)">
              {category.name}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-[3px]",
                isDraft ? "bg-muted" : "[background:color-mix(in_srgb,var(--cat-bg)_14%,transparent)]",
            )}
          >
            <div
              className={cn(
                "size-1.5 rounded-full",
                isDraft ? "bg-muted-foreground" : "bg-(--cat-bg)",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-bold",
                isDraft ? "text-muted-foreground" : "text-(--cat-bg)",
              )}
            >
              {isDraft ? labels.draft : labels.published}
            </span>
          </div>
        </div>
        <div className="text-xl font-extrabold leading-[1.2] text-foreground">
          {draft.employee}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {getTimeLabel(draft.date, draft.startH)} – {getTimeLabel(draft.date, draft.endH)}
          {" · "}{(() => { const d = draft.endH - draft.startH; return d % 1 === 0 ? `${d}h` : `${d.toFixed(1)}h` })()}
        </div>
      </div>

      {shift.recurringMasterId && (
        <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-2 text-[11px] text-muted-foreground">
          <span>🔁</span>
          <span><strong className="text-foreground">Recurring occurrence</strong> — saving changes will detach this date from the series.</span>
        </div>
      )}

      {hasConflict && (
        <div className="my-2.5 rounded-lg border border-destructive p-2.5 text-xs text-destructive">
          ⚠ Overlaps with {overlaps.length} other shift{overlaps.length !== 1 ? "s" : ""}
        </div>
      )}

      <div className="mt-3.5 flex flex-col gap-3">

        {/* Date — popover picker, not inline calendar */}
        <div>
          <label className={LBL}>Date</label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-[7px] text-left text-[13px] text-foreground">
                <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
                {fmtDate(parseBlockDate({ date: draft.date }))}
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Calendar
                mode="single"
                selected={parseBlockDate({ date: draft.date })}
                onSelect={(d) => {
                  if (!d) return
                  const next = { ...draft, date: toDateISO(d) }
                  setDraft(next); validate(next); setDateOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
          {errors.date && <div className="mt-1 text-[11px] text-destructive">{errors.date}</div>}
        </div>

        {/* Category — moved here so order is: Date → Category → Time → Break */}
        <div>
          <label className={LBL}>Category</label>
          <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={SEL}>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        {/* Start / End time */}
        <div>
          <label className={LBL}>Time</label>
          <div className="flex items-center gap-2">
            <select
              value={draft.startH}
              onChange={(e) => {
                const v = Number(e.target.value)
                const next = { ...draft, startH: v, endH: Math.max(v + SNAP, draft.endH) }
                setDraft(next); validate(next)
              }}
              className={cn(SEL, "min-w-0 flex-1")}
            >
              {hourOptions.map((h) => <option key={h} value={h}>{getTimeLabel(draft.date, h)}</option>)}
            </select>
            <span className="shrink-0 text-xs text-muted-foreground">to</span>
            <select
              value={draft.endH}
              onChange={(e) => {
                const v = Number(e.target.value)
                setDraft({ ...draft, endH: v }); validate({ ...draft, endH: v })
              }}
              className={cn(SEL, "min-w-0 flex-1")}
            >
              {hourOptions.filter((h) => h > draft.startH).map((h) => (
                <option key={h} value={h}>{getTimeLabel(draft.date, h)}</option>
              ))}
            </select>
          </div>
          {(errors.startH || errors.endH) && (
            <div className="mt-1 text-[11px] text-destructive">{errors.startH || errors.endH}</div>
          )}
        </div>

        {/* Break section */}
        <div className="border-t border-border pt-3">
          <label className="mb-0 flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-foreground">
            <input
              type="checkbox" checked={hasBreak}
              onChange={(e) => setHasBreak(e.target.checked)}
                  className="size-3.5 cursor-pointer accent-(--cat-bg)"
            />
            Add break
          </label>

          {hasBreak && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox" checked={splitShift}
                  onChange={(e) => setSplitShift(e.target.checked)}
                  className="size-3 cursor-pointer accent-(--cat-bg)"
                />
                Split shift — set exact break times
              </label>

              {splitShift ? (
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <label className={LBL}>Break start</label>
                    <select value={breakStartH} onChange={(e) => setBreakStartH(Number(e.target.value))} className={SEL}>
                      {hourOptions.filter((h) => h > draft.startH && h < draft.endH).map((h) => (
                        <option key={h} value={h}>{getTimeLabel(draft.date, h)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className={LBL}>Break end</label>
                    <select value={breakEndH} onChange={(e) => setBreakEndH(Number(e.target.value))} className={SEL}>
                      {hourOptions.filter((h) => h > breakStartH && h < draft.endH).map((h) => (
                        <option key={h} value={h}>{getTimeLabel(draft.date, h)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className={cn(LBL, "mb-0")}>Break duration</label>
                    <span className="text-xs font-bold text-(--cat-bg)">
                      {breakDurMin >= 60 ? `${(breakDurMin / 60).toFixed(breakDurMin % 60 === 0 ? 0 : 1)}h` : `${breakDurMin}m`}
                    </span>
                  </div>
                  <input
                    type="range" min={15} max={120} step={15} value={breakDurMin}
                    onChange={(e) => setBreakDurMin(Number(e.target.value))}
                    className="w-full cursor-pointer accent-(--cat-bg)"
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    {["15m", "30m", "45m", "1h", "1.5h", "2h"].map((l) => <span key={l}>{l}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full px-2 py-[3px] text-[11px] font-bold text-(--cat-bg) [background:color-mix(in_srgb,var(--cat-bg)_14%,transparent)]">
            {getTimeLabel(draft.date, draft.startH)} – {getTimeLabel(draft.date, draft.endH)}
          </span>
          <span className="rounded-full bg-muted px-2 py-[3px] text-[11px] font-semibold text-muted-foreground">
            {workedHours.toFixed(1)}h worked
          </span>
          {hasBreak && (
            <span className="rounded-full bg-muted px-2 py-[3px] text-[11px] font-semibold text-muted-foreground">
              {splitShift
                ? `Break ${getTimeLabel(draft.date, breakStartH)}–${getTimeLabel(draft.date, breakEndH)}`
                : `${breakDurMin}m break`}
            </span>
          )}
        </div>

      </div>

      {/* Buttons */}
      <div className="mt-4.5 flex flex-wrap gap-2">
        {isDraft ? (
          <button
            onClick={() => { if (!hasConflict) { onPublish(draft.id); onClose() } }}
            disabled={hasConflict}
            className={cn(
              "min-w-20 flex-1 rounded-[9px] px-3 py-2.5 text-[13px] font-bold",
              hasConflict
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "cursor-pointer bg-primary text-primary-foreground",
            )}
          >
            ✓ {labels.publish}
          </button>
        ) : (
          <button
            onClick={() => { onUnpublish(draft.id); onClose() }}
            className="min-w-20 flex-1 cursor-pointer rounded-[9px] bg-muted px-3 py-2.5 text-[13px] font-semibold text-foreground"
          >
            Revert to {labels.draft}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => { onDelete(shift.id); onClose() }}
            className="flex cursor-pointer items-center gap-1.5 rounded-[9px] bg-destructive px-3 py-2.5 text-[13px] font-semibold text-destructive-foreground"
          >
            <Trash2 size={13} />
          </button>
        )}
        <button
          onClick={handleSave}
          className="cursor-pointer rounded-[9px] border border-border bg-background px-4 py-2.5 text-[13px] font-semibold text-foreground"
        >
          Save
        </button>
      </div>
    </div>
  )

  if (variant === "sheet") return content

  const overlay = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
    >
      {content}
    </div>
  )

  return typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay
}
