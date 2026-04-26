"use client"

import { Check, Coffee, LogIn, LogOut, Play } from "lucide-react"

export type TodayPunches = {
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

function fmt(iso: string) {
  if (!iso) return "—"
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)$/i.test(iso)) return iso.replace(/:\d{2}\s*(AM|PM)$/i, ' $1').trim()
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

export function DayTimeline({ punches }: { punches: TodayPunches }) {
  const steps = [
    { key: "in",       label: "Clock In",    icon: LogIn,  time: punches.clockIn,  done: !!punches.clockIn,  accent: "emerald" },
    { key: "break",    label: "Break Start", icon: Coffee, time: punches.breakIn,  done: !!punches.breakIn,  accent: "amber" },
    { key: "endBreak", label: "Resume",      icon: Play,   time: punches.breakOut, done: !!punches.breakOut, accent: "amber" },
    { key: "out",      label: "Clock Out",   icon: LogOut, time: punches.clockOut, done: !!punches.clockOut, accent: "rose" },
  ] as const

  const doneCount = steps.filter((s) => s.done).length
  const activeIndex = steps.findIndex((s) => !s.done)
  const progressPct = doneCount === 0 ? 0 : ((doneCount - 1) / (steps.length - 1)) * 75

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Today&apos;s timeline</h2>
        <span className="text-xs text-slate-500">{doneCount} / {steps.length} steps</span>
      </div>

      <ol className="relative grid grid-cols-4 gap-2">
        {/* Track */}
        <div aria-hidden className="absolute left-0 right-0 top-5 mx-[12.5%] h-0.5 rounded-full bg-slate-800" />
        <div
          aria-hidden
          className="absolute left-0 top-5 mx-[12.5%] h-0.5 rounded-full bg-emerald-500/70 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = step.done
          const isActive = idx === activeIndex
          const Icon = step.icon

          const dotClass = isDone
            ? step.accent === "emerald" ? "bg-emerald-500 text-white ring-emerald-500/30"
            : step.accent === "amber"   ? "bg-amber-500 text-white ring-amber-500/30"
            :                             "bg-rose-500 text-white ring-rose-500/30"
            : isActive
              ? "bg-slate-900 text-slate-100 ring-2 ring-emerald-400 animate-pulse"
              : "bg-slate-900 text-slate-500 ring-1 ring-slate-700"

          return (
            <li key={step.key} className="relative flex flex-col items-center text-center">
              <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 transition-colors ${dotClass}`}>
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <p className="mt-2 text-[11px] font-medium text-slate-300 sm:text-xs">{step.label}</p>
              <p className="font-mono text-[11px] tabular-nums text-slate-500 sm:text-xs">{fmt(step.time)}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
