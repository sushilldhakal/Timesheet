"use client"

import { cn } from "@/lib/utils/cn"

interface PinDisplayProps {
  value: string
  maxLength: number
  status: "idle" | "verifying" | "error" | "success"
}

export function PinDisplay({ value, maxLength, status }: PinDisplayProps) {
  return (
    <div
      className={cn(
        "grid gap-3 mt-[-20px]",
        status === "error" && "animate-shake",
      )}
      style={{
        gridTemplateColumns: `repeat(${maxLength}, var(--pin-key, 80px))`,
        width: "var(--pin-display-w, auto)",
      }}
      role="status"
      aria-label={`PIN, ${value.length} of ${maxLength} digits entered`}
    >
      {Array.from({ length: maxLength }).map((_, i) => {
        const digit = value[i]
        const isFilled = i < value.length
        const isActive = i === value.length && status === "idle"

        return (
          <div
            key={i}
            className={cn(
              "relative flex items-end justify-center pb-2 transition-all duration-200",
              "border-b-2",
              status === "idle" && !isFilled && !isActive && "border-white/20",
              status === "idle" && isActive && "border-white",
              status === "idle" && isFilled && "border-cyan-400/70",
              status === "verifying" && "border-white/30",
              status === "error" && "border-red-400",
              status === "success" && "border-emerald-400",
            )}
            style={{ height: "calc(var(--pin-key, 80px) * 0.75)" }}
          >
            {/* Pulsing active bar */}
            {isActive && (
              <span className="pin-bar-pulse absolute bottom-[-2px] left-1/4 right-1/4 h-[2px] bg-white rounded-full" />
            )}

            {/* Digit */}
            {isFilled && (
              <span
                key={digit + i}
                className={cn(
                  "pin-digit-enter font-mono font-medium tabular-nums leading-none",
                  "text-[clamp(1.5rem,4.6vmin,2.75rem)]",
                  status === "error" && "text-red-400",
                  status === "success" && "text-emerald-400",
                  (status === "idle" || status === "verifying") && "text-white",
                )}
              >
                {digit}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}