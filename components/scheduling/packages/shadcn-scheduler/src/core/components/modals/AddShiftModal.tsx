import React, { useState, useEffect } from "react"
import type { Block } from "../../types"
import { useSchedulerContext } from "../../context"
import { HOURS, fmtHourOpt, toDateISO } from "../../constants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const LBL = "mb-1 block text-[11px] font-semibold text-muted-foreground"
const SEL =
  "w-full min-w-0 cursor-pointer rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"

interface AddShiftModalProps {
  date: Date
  categoryId?: string
  employeeId?: string
  prefillStartH?: number
  onAdd: (block: Block) => void
  onClose: () => void
}

const LBL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "var(--muted-foreground)", marginBottom: 4,
}
const SEL: React.CSSProperties = {
  width: "100%", padding: "6px 8px", border: "1px solid var(--border)",
  borderRadius: 7, fontSize: 12, color: "var(--foreground)",
  background: "var(--background)", cursor: "pointer", outline: "none",
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

export function AddShiftModal({
  date: initialDate, categoryId, employeeId, prefillStartH, onAdd, onClose,
}: AddShiftModalProps): React.ReactElement {
  const { categories, employees, nextUid, getColor, labels } = useSchedulerContext()

  const [date, setDate] = useState<Date>(initialDate)
  const [dateOpen, setDateOpen] = useState(false)
  const [category, setCategory] = useState(categoryId || categories[0]?.id || "")
  const [emp, setEmp] = useState(
    employeeId ||
    employees.find((e) => e.categoryId === (categoryId || categories[0]?.id))?.id ||
    employees[0]?.id || ""
  )
  const [startH, setSH] = useState(prefillStartH !== undefined ? prefillStartH : 9)
  const [endH, setEH] = useState(prefillStartH !== undefined ? Math.min(prefillStartH + 4, 23) : 17)

  // Break state
  const [hasBreak, setHasBreak] = useState(false)
  const [splitShift, setSplitShift] = useState(false)
  const [breakStartH, setBreakSH] = useState(12)
  const [breakEndH, setBreakEH] = useState(13)
  const [breakDurMin, setBreakDurMin] = useState(30)

  const cr = categories.find((r) => r.id === category)
  const c = cr ? getColor(cr.colorIdx) : getColor(0)

  useEffect(() => {
    const e = employees.find((e) => e.categoryId === category)
    if (e) setEmp(e.id)
  }, [category, employees])

  const categoryEmployees = employees.filter((e) => e.categoryId === category)

  const totalHours = endH - startH
  const breakHours = hasBreak ? (splitShift ? breakEndH - breakStartH : breakDurMin / 60) : 0
  const workedHours = Math.max(0, totalHours - breakHours)

  const timeDisplay = (): string => {
    const s = fmtHourOpt(startH)
    const e = fmtHourOpt(endH)
    if (!hasBreak) return `${s} – ${e}`
    if (splitShift) return `${s} – ${fmtHourOpt(breakStartH)} / ${fmtHourOpt(breakEndH)} – ${e}`
    return `${s} – ${e} (${breakDurMin}m break)`
  }

  const submit = () => {
    const e = employees.find((x) => x.id === emp)
    const block: Block = {
      id: nextUid(),
      categoryId: category,
      employeeId: emp,
      date: toDateISO(date),
      startH,
      endH,
      employee: e?.name || "?",
      status: "draft",
    }
    if (hasBreak) {
      if (splitShift) {
        block.breakStartH = breakStartH
        block.breakEndH = breakEndH
      } else {
        const mid = startH + (endH - startH) / 2
        const durH = breakDurMin / 60
        block.breakStartH = parseFloat((mid - durH / 2).toFixed(2))
        block.breakEndH = parseFloat((mid + durH / 2).toFixed(2))
      }
    }
    onAdd(block)
    onClose()
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-[340px] overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
        style={{ borderTop: `4px solid ${c.bg}` }}
      >
        {/* Title */}
        <div className="mb-1 text-[15px] font-extrabold text-foreground">{labels.addShift}</div>

        <div className="flex flex-col gap-3">

          {/* Date picker */}
          <div>
            <label className={LBL}>{"Date"}</label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-[7px] text-left text-[13px] text-foreground">
                  <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
                  {fmtDate(date)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setDateOpen(false) } }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
          <div>
            <label className={LBL}>{labels.category}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={SEL}>
              {categories.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className={LBL}>{labels.employee}</label>
            <select value={emp} onChange={(e) => setEmp(e.target.value)} className={SEL}>
              {categoryEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className={LBL}>Time</label>
            <div className="flex gap-2">
              <select value={startH} onChange={(e) => setSH(+e.target.value)} className={cn(SEL, "flex-1")}>
                {HOURS.map((h) => <option key={h} value={h}>{fmtHourOpt(h)}</option>)}
              </select>
              <span className="flex shrink-0 items-center text-xs text-muted-foreground">to</span>
              <select value={endH} onChange={(e) => setEH(+e.target.value)} className={cn(SEL, "flex-1")}>
                {HOURS.filter((h) => h > startH).map((h) => <option key={h} value={h}>{fmtHourOpt(h)}</option>)}
              </select>
            </div>
          </div>

          {/* Break section */}
          <div className="border-t border-border pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-foreground">
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
                      <select value={breakStartH} onChange={(e) => setBreakSH(+e.target.value)} className={SEL}>
                        {HOURS.filter((h) => h > startH && h < endH).map((h) => (
                          <option key={h} value={h}>{fmtHourOpt(h)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className={LBL}>Break end</label>
                      <select value={breakEndH} onChange={(e) => setBreakEH(+e.target.value)} className={SEL}>
                        {HOURS.filter((h) => h > breakStartH && h < endH).map((h) => (
                          <option key={h} value={h}>{fmtHourOpt(h)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ ...LBL, marginBottom: 0 }}>Break duration</label>
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

          {/* Summary */}
          <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 text-xs">
            <Clock size={14} className="shrink-0 text-muted-foreground" />
            <span className="font-semibold text-foreground">{timeDisplay()}</span>
            <span className="ml-auto shrink-0 font-medium text-muted-foreground">
              {workedHours.toFixed(1)}h
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="flex-1 cursor-pointer rounded-lg border-none py-2 text-[13px] font-bold text-white/95"
              style={{ background: c.bg }}
            >
              {labels.addShift}
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg border-none bg-muted px-3.5 py-2 text-[13px] text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
