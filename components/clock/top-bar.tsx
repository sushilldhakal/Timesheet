"use client"

import { format } from "date-fns"
import { Wifi, WifiOff } from "lucide-react"
import { CircularLogoutButton } from "@/components/clock/circular-logout-button"
import { OfflineStatus } from "@/components/clock/offline-status"

type TopBarProps = {
  now: Date
  isOnline: boolean
  employeeName: string
  idleCountdown: number | null
  pendingCount: number
  hasOfflineData: boolean
  onLogout: () => void
  onSyncNow: () => void
}

export function TopBar({
  now,
  isOnline,
  employeeName,
  idleCountdown,
  pendingCount,
  hasOfflineData,
  onLogout,
  onSyncNow,
}: TopBarProps) {
  const time = format(now, "h:mm")
  const ampm = format(now, "a")
  const date = format(now, "EEEE, MMMM d")
  const firstName = employeeName.split(" ")[0]

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          {time}
          <span className="ml-2 text-base font-medium text-slate-400 sm:text-lg">{ampm}</span>
        </h1>
        <span className="hidden text-sm text-slate-400 sm:inline">{date}</span>
      </div>

      <div className="flex items-center gap-2">
        <p className="hidden text-sm text-slate-300 md:block">
          Hi, <span className="font-medium text-slate-100">{firstName}</span>
        </p>

        <div
          className={[
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            isOnline
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300",
          ].join(" ")}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </div>

        {(!isOnline || hasOfflineData) && idleCountdown === null && (
          <OfflineStatus
            isOnline={isOnline}
            pendingCount={pendingCount}
            hasOfflineData={hasOfflineData}
            onSyncNow={onSyncNow}
          />
        )}

        <CircularLogoutButton countdown={idleCountdown} onLogout={onLogout} />
      </div>
    </header>
  )
}
