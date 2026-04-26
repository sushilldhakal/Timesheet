"use client"

import { AlertCircle, Check, CheckCircle2, Coffee, Loader2, LogIn, LogOut, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export type PunchType = "in" | "break" | "endBreak" | "out"

export type TodayPunches = {
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

type ActionPanelProps = {
  nextAction: PunchType | null
  punches: TodayPunches
  loading: boolean
  success: boolean
  message: { type: "success" | "error"; text: string } | null
  faceReady: boolean
  onAction: (type: PunchType) => void
}

const actionConfig: Record<PunchType, { label: string; helper: string; icon: typeof LogIn; classes: string }> = {
  in: {
    label: "Clock In",
    helper: "Start your shift",
    icon: LogIn,
    classes: "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_10px_30px_-10px] shadow-emerald-500/60",
  },
  break: {
    label: "Start Break",
    helper: "Take a moment to recharge",
    icon: Coffee,
    classes: "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_10px_30px_-10px] shadow-amber-500/60",
  },
  endBreak: {
    label: "End Break",
    helper: "Welcome back — let's go",
    icon: Play,
    classes: "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_10px_30px_-10px] shadow-amber-500/60",
  },
  out: {
    label: "Clock Out",
    helper: "End your shift",
    icon: LogOut,
    classes: "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_10px_30px_-10px] shadow-rose-500/60",
  },
}

export function ActionPanel({ nextAction, punches, loading, success, message, faceReady, onAction }: ActionPanelProps) {
  if (!nextAction) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">Shift complete</h3>
        <p className="mt-1 text-sm text-slate-400">You&apos;re all clocked out for today. Have a great rest!</p>
      </div>
    )
  }

  const cfg = actionConfig[nextAction]
  const Icon = cfg.icon
  const showClockOutSecondary = nextAction === "break" && !!punches.clockIn && !punches.clockOut

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Up next</p>
          <h3 className="text-lg font-semibold text-slate-100">{cfg.label}</h3>
        </div>
        <p className="text-right text-xs text-slate-400">{cfg.helper}</p>
      </div>

      <Button
        onClick={() => onAction(nextAction)}
        disabled={loading || success}
        className={[
          "group h-20 w-full rounded-2xl text-xl font-semibold transition-all duration-300",
          cfg.classes,
          loading || success ? "opacity-90" : "",
        ].join(" ")}
      >
        {loading ? (
          <><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Processing…</span></>
        ) : success ? (
          <><Check className="h-6 w-6" /><span className="ml-2">Done</span></>
        ) : (
          <><Icon className="h-6 w-6 transition-transform group-hover:scale-110" /><span className="ml-2">{cfg.label}</span></>
        )}
      </Button>

      {showClockOutSecondary && (
        <Button
          variant="ghost"
          onClick={() => onAction("out")}
          disabled={loading || success}
          className="mt-2 h-12 w-full rounded-xl border border-slate-800 bg-transparent text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-1.5 font-medium">Clock out instead</span>
        </Button>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <span className={["h-1.5 w-1.5 rounded-full", faceReady ? "bg-emerald-400" : "bg-slate-600"].join(" ")} />
        {faceReady ? "Photo will be captured automatically" : "Photo capture optional · ready to punch"}
      </div>

      {message && (
        <div
          role="status"
          className={[
            "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            message.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300",
          ].join(" ")}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}
    </div>
  )
}
