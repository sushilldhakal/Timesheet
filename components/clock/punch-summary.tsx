"use client"

import { Coffee, LogIn, LogOut, Play } from "lucide-react"

export type TodayPunches = {
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

function fmt(iso: string) {
  if (!iso) return "—"
  // Already a formatted time string (e.g. "12:30:57 AM") — return as-is
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)$/i.test(iso)) return iso.replace(/:\d{2}\s*(AM|PM)$/i, ' $1').trim()
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso // fallback: show whatever came back
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function toMs(val: string): number | null {
  if (!val) return null
  // ISO timestamp
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d.getTime()
  // Bare time string like "12:30:57 AM" — use today's date
  const today = new Date().toDateString()
  const d2 = new Date(`${today} ${val}`)
  return isNaN(d2.getTime()) ? null : d2.getTime()
}

function breakDuration(breakIn?: string, breakOut?: string) {
  if (!breakIn || !breakOut) return "—"
  const a = toMs(breakIn), b = toMs(breakOut)
  if (a === null || b === null || b <= a) return "—"
  const diff = b - a
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

function workedDuration(punches: TodayPunches) {
  if (!punches.clockIn) return "—"
  const start = toMs(punches.clockIn)
  if (start === null) return "—"
  const end = punches.clockOut ? toMs(punches.clockOut) ?? Date.now() : Date.now()
  let diff = end - start
  if (punches.breakIn && punches.breakOut) {
    const a = toMs(punches.breakIn), b = toMs(punches.breakOut)
    if (a !== null && b !== null) diff -= b - a
  }
  if (diff <= 0) return "—"
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export function PunchSummary({ punches }: { punches: TodayPunches }) {
  const items = [
    { label: "Clock in",    value: fmt(punches.clockIn),  icon: LogIn,  tint: "text-emerald-300" },
    { label: "Break start", value: fmt(punches.breakIn),  icon: Coffee, tint: "text-amber-300" },
    { label: "Resume",      value: fmt(punches.breakOut), icon: Play,   tint: "text-amber-300" },
    { label: "Clock out",   value: fmt(punches.clockOut), icon: LogOut, tint: "text-rose-300" },
  ]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Today&apos;s punches</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            Break: <span className="font-mono tabular-nums text-slate-200">{breakDuration(punches.breakIn, punches.breakOut)}</span>
          </span>
          <span className="text-slate-500">
            Worked: <span className="font-mono tabular-nums text-slate-200">{workedDuration(punches)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          const empty = item.value === "—"
          return (
            <div
              key={item.label}
              className={[
                "rounded-xl border p-3 transition-colors",
                empty ? "border-slate-800 bg-slate-900/40" : "border-slate-700/60 bg-slate-800/40",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${empty ? "text-slate-600" : item.tint}`} />
                <p className="text-[11px] uppercase tracking-wider text-slate-500">{item.label}</p>
              </div>
              <p className={["font-mono text-lg font-semibold tabular-nums", empty ? "text-slate-600" : "text-slate-100"].join(" ")}>
                {item.value}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
