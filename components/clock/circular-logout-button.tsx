"use client"

import { X } from "lucide-react"

export function CircularLogoutButton({
  countdown,
  onLogout,
}: {
  countdown: number | null
  onLogout: () => void
}) {
  if (countdown === null) return null

  const progress = ((30 - countdown) / 30) * 100
  const circumference = 2 * Math.PI * 18
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <button
      onClick={onLogout}
      className="relative h-12 w-12 rounded-full bg-red-500/10 transition-colors duration-200 hover:bg-red-500/20 group"
      title={`Logging out in ${countdown}s — click to logout now`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20" cy="20" r="18"
          fill="none"
          stroke="rgb(239,68,68)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <X className="absolute inset-0 m-auto h-5 w-5 text-red-400 transition-colors group-hover:text-red-300" />
    </button>
  )
}
