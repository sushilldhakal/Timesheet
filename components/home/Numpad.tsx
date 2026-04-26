"use client"

import { Delete } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { useCallback, useEffect, useState } from "react"

interface NumpadProps {
  onKeyPress: (key: string) => void
  onDelete: () => void
  onClear?: () => void
  disabled?: boolean
}

type Ripple = { id: number; x: number; y: number }

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "delete"]

export function Numpad({ onKeyPress, onDelete, onClear, disabled = false }: NumpadProps) {
  const [ripples, setRipples] = useState<Record<string, Ripple[]>>({})

  const addRipple = useCallback((keyId: string, x: number, y: number) => {
    const id = Date.now() + Math.random()
    setRipples((prev) => ({ ...prev, [keyId]: [...(prev[keyId] ?? []), { id, x, y }] }))
    setTimeout(() => {
      setRipples((prev) => ({
        ...prev,
        [keyId]: (prev[keyId] ?? []).filter((r) => r.id !== id),
      }))
    }, 650)
  }, [])

  // Hardware keyboard support
  useEffect(() => {
    if (disabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        addRipple(e.key, 30, 30)
        onKeyPress(e.key)
      } else if (e.key === "Backspace") {
        addRipple("delete", 30, 30)
        onDelete()
      } else if (e.key === "Escape" || e.key === "Delete" || e.key.toLowerCase() === "c") {
        addRipple("clear", 30, 30)
        onClear?.()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onKeyPress, onDelete, onClear, disabled, addRipple])

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    keyId: string,
    action: () => void,
  ) => {
    if (disabled) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    addRipple(keyId, e.clientX - rect.left, e.clientY - rect.top)
    action()
  }

  return (
    <div
      className="grid grid-cols-3"
      style={{ gap: "12px", width: "var(--pin-display-w, auto)" }}
      role="group"
      aria-label="PIN keypad"
    >
      {KEYS.map((key) => {
        const isAction = key === "clear" || key === "delete"
        const keyRipples = ripples[key] ?? []

        let action: () => void
        let content: React.ReactNode
        let ariaLabel: string

        if (key === "clear") {
          action = () => onClear?.()
          ariaLabel = "Clear"
          content = <span className="text-[clamp(1.25rem,3vmin,1.75rem)] font-medium">C</span>
        } else if (key === "delete") {
          action = onDelete
          ariaLabel = "Delete last digit"
          content = <Delete style={{ width: "40%", height: "40%" }} />
        } else {
          action = () => onKeyPress(key)
          ariaLabel = `Digit ${key}`
          content = <span className="text-[clamp(1.375rem,4vmin,2.25rem)] font-normal tabular-nums">{key}</span>
        }

        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "relative overflow-hidden rounded-2xl border transition-all duration-150",
              "flex items-center justify-center",
              "active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed",
              isAction
                ? "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white"
                : "border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
              "shadow-[0_4px_0_0_rgba(0,0,0,0.25),0_6px_16px_rgba(0,0,0,0.2)]",
              "active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)] active:translate-y-0.5",
            )}
            style={{ width: "var(--pin-key, 96px)", height: "var(--pin-key, 96px)" }}
            onPointerDown={(e) => handlePointerDown(e, key, action)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="relative z-10 flex items-center justify-center w-full h-full">
              {content}
            </span>

            {/* Ripples */}
            <span className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
              {keyRipples.map((r) => (
                <span
                  key={r.id}
                  className="pin-ripple-anim absolute rounded-full bg-cyan-400/35 w-3 h-3"
                  style={{ left: r.x, top: r.y, marginLeft: -6, marginTop: -6 }}
                />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}