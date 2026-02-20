"use client"

import { cn } from "@/lib/utils"

interface PinDisplayProps {
  value: string
  maxLength: number
  status: "idle" | "verifying" | "error" | "success"
}

export function PinDisplay({ value, maxLength, status }: PinDisplayProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {Array.from({ length: maxLength }).map((_, i) => {
        const isFilled = i < value.length
        const isActive = i === value.length && status === "idle"

        // Get success color from CSS variable
        const successBg = status === "success" && isFilled 
          ? { 
              backgroundColor: 'rgba(26, 135, 84, 0.2)', // rgb(var(--success)) with 20% opacity
              borderColor: 'rgb(26, 135, 84)' // rgb(var(--success))
            }
          : {}

        const successText = status === "success" 
          ? { color: 'rgb(26, 135, 84)' } // rgb(var(--success))
          : {}

        return (
          <div
            key={i}
            className={cn(
              "relative flex h-24 w-20 items-center justify-center rounded-xl border-2 text-3xl font-semibold transition-all duration-200",
              // Error state
              status === "error" && "animate-shake border-red-400 bg-red-400/10",
              // Success state - will be overridden by inline styles
              status === "success" && isFilled && "border-emerald-500 bg-emerald-500/20",
              // Verifying state
              status === "verifying" && "border-white/50 bg-white/5",
              // Idle states
              status === "idle" && isActive && "border-white bg-white/10 ring-2 ring-white/20",
              status === "idle" && !isActive && !isFilled && "border-white/30 bg-white/5",
              status === "idle" && isFilled && "border-white/50 bg-white/10 pin-filled"
            )}
            style={successBg}
          >
            {isFilled && (
              <span
                className={cn(
                  "text-white transition-all duration-150",
                  status === "error" && "text-red-400",
                  status === "success" && "text-emerald-500"
                )}
                style={successText}
              >
                {value[i]}
              </span>
            )}
            {isActive && !isFilled && (
              <div className="h-8 w-0.5 animate-pulse rounded-full bg-white" />
            )}
          </div>
        )
      })}
    </div>
  )
}
