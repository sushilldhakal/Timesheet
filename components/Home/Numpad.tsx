"use client"

import { Delete } from "lucide-react"
import { cn } from "@/lib/utils"

interface NumpadProps {
  onKeyPress: (key: string) => void
  onDelete: () => void
  disabled?: boolean
}

const keys = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "delete"],
]

export function Numpad({ onKeyPress, onDelete, disabled = false }: NumpadProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {keys.flat().map((key, i) => {
        if (key === "") {
          return <div key={i} />
        }

        if (key === "delete") {
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={onDelete}
              className={cn(
                "flex h-24 min-h-24 items-center justify-center rounded-2xl text-white/70 transition-all duration-150",
                "shadow-[0_4px_0_0_rgba(0,0,0,0.2),0_6px_12px_rgba(0,0,0,0.15)]",
                "hover:bg-white/15 active:scale-[0.98] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] active:translate-y-0.5",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
              aria-label="Delete"
            >
              <Delete className="h-8 w-8" />
            </button>
          )
        }

        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress(key)}
            className={cn(
              "flex h-24 min-h-24 items-center justify-center rounded-2xl bg-white/10 text-3xl font-medium text-white transition-all duration-150",
              "border border-white/20",
              "shadow-[0_4px_0_0_rgba(0,0,0,0.2),0_6px_12px_rgba(0,0,0,0.15)]",
              "hover:bg-white/15 active:scale-[0.98] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] active:translate-y-0.5",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}
