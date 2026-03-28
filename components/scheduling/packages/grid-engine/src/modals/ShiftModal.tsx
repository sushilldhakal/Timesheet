import React, { useMemo, useState } from "react"
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
      style={{
        background: "var(--background)",
        borderRadius: variant === "sheet" ? 0 : 14,
        padding: "20px 22px",
        boxShadow: variant === "modal" ? "0 24px 64px rgba(0,0,0,0.22)" : undefined,
        width: variant === "modal" ? 340 : undefined,
        borderTop: `4px solid ${c.bg}`,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.bg, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: c.bg, textTransform: "uppercase", letterSpacing: 1 }}>
              {category.name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: isDraft ? "var(--muted)" : `${c.bg}18`, borderRadius: 20, padding: "3px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isDraft ? "var(--muted-foreground)" : c.bg }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: isDraft ? "var(--muted-foreground)" : c.bg }}>
              {isDraft ? labels.draft : labels.published}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>
          {draft.employee}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
          {getTimeLabel(draft.date, draft.startH)} – {getTimeLabel(draft.date, draft.endH)}
          {" · "}{(() => { const d = draft.endH - draft.startH; return d % 1 === 0 ? `${d}h` : `${d.toFixed(1)}h` })()}
        </div>
      </div>

      {shift.recurringMasterId && (
        <div style={{ margin: "0 0 10px", padding: "8px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔁</span>
          <span><strong style={{ color: "var(--foreground)" }}>Recurring occurrence</strong> — saving changes will detach this date from the series.</span>
        </div>
      )}

      {hasConflict && (
        <div style={{ margin: "10px 0", padding: 10, borderRadius: 8, border: "1px solid var(--destructive)", fontSize: 12, color: "var(--destructive)" }}>
          ⚠ Overlaps with {overlaps.length} other shift{overlaps.length !== 1 ? "s" : ""}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>

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
          <label style={LBL}>Time</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={draft.startH}
              onChange={(e) => {
                const v = Number(e.target.value)
                const next = { ...draft, startH: v, endH: Math.max(v + SNAP, draft.endH) }
                setDraft(next); validate(next)
              }}
              style={{ ...SEL, flex: 1 }}
            >
              {hourOptions.map((h) => <option key={h} value={h}>{getTimeLabel(draft.date, h)}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }}>to</span>
            <select
              value={draft.endH}
              onChange={(e) => {
                const v = Number(e.target.value)
                setDraft({ ...draft, endH: v }); validate({ ...draft, endH: v })
              }}
              style={{ ...SEL, flex: 1 }}
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
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: c.bg }}
            />
            Add break
          </label>

          {hasBreak && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox" checked={splitShift}
                  onChange={(e) => setSplitShift(e.target.checked)}
                  style={{ width: 13, height: 13, cursor: "pointer", accentColor: c.bg }}
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
                  <div style={{ flex: 1 }}>
                    <label style={LBL}>Break end</label>
                    <select value={breakEndH} onChange={(e) => setBreakEndH(Number(e.target.value))} style={SEL}>
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.bg }}>
                      {breakDurMin >= 60 ? `${(breakDurMin / 60).toFixed(breakDurMin % 60 === 0 ? 0 : 1)}h` : `${breakDurMin}m`}
                    </span>
                  </div>
                  <input
                    type="range" min={15} max={120} step={15} value={breakDurMin}
                    onChange={(e) => setBreakDurMin(Number(e.target.value))}
                    style={{ width: "100%", accentColor: c.bg, cursor: "pointer" }}
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: `${c.bg}18`, color: c.bg, fontWeight: 700 }}>
            {getTimeLabel(draft.date, draft.startH)} – {getTimeLabel(draft.date, draft.endH)}
          </span>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", fontWeight: 600 }}>
            {workedHours.toFixed(1)}h worked
          </span>
          {hasBreak && (
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", fontWeight: 600 }}>
              {splitShift
                ? `Break ${getTimeLabel(draft.date, breakStartH)}–${getTimeLabel(draft.date, breakEndH)}`
                : `${breakDurMin}m break`}
            </span>
          )}
        </div>

      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {isDraft ? (
          <button
            onClick={() => { if (!hasConflict) { onPublish(draft.id); onClose() } }}
            disabled={hasConflict}
            style={{
              flex: 1, minWidth: 80, padding: "9px", borderRadius: 9, border: "none",
              fontSize: 13, fontWeight: 700, cursor: hasConflict ? "not-allowed" : "pointer",
              background: hasConflict ? "var(--muted)" : "var(--primary)",
              color: hasConflict ? "var(--muted-foreground)" : "var(--primary-foreground)",
            }}
          >
            ✓ {labels.publish}
          </button>
        ) : (
          <button
            onClick={() => { onUnpublish(draft.id); onClose() }}
            style={{ flex: 1, minWidth: 80, padding: "9px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "var(--muted)", color: "var(--foreground)" }}
          >
            Revert to {labels.draft}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => { onDelete(shift.id); onClose() }}
            style={{ padding: "9px 12px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "var(--destructive)", color: "var(--destructive-foreground)", display: "flex", alignItems: "center", gap: 5 }}
          >
            <Trash2 size={13} />
          </button>
        )}
        <button
          onClick={handleSave}
          style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "var(--background)", color: "var(--foreground)" }}
        >
          Save
        </button>
      </div>
    </div>
  )

  if (variant === "sheet") return content

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
    >
      {content}
    </div>
  )
}
