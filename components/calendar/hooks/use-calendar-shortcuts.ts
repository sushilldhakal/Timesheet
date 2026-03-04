import { useEffect, useCallback } from "react"

export interface ShortcutCommand {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
}

export interface ShortcutHandlers {
  onDelete?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onEdit?: () => void
  onNew?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onNextDay?: () => void
  onPrevDay?: () => void
  onNextWeek?: () => void
  onPrevWeek?: () => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onToggleDragMode?: () => void
}

export const CALENDAR_SHORTCUTS: ShortcutCommand[] = [
  // Shift management
  {
    key: "d",
    description: "Delete selected shift",
  },
  {
    key: "c",
    description: "Copy selected shift",
  },
  {
    key: "v",
    description: "Paste shift",
  },
  {
    key: "e",
    description: "Edit selected shift",
  },
  {
    key: "n",
    description: "New shift",
  },

  // Navigation
  {
    key: "ArrowRight",
    description: "Next day",
  },
  {
    key: "ArrowLeft",
    description: "Previous day",
  },
  {
    key: "ArrowDown",
    description: "Next week",
  },
  {
    key: "ArrowUp",
    description: "Previous week",
  },

  // Selection
  {
    key: "a",
    ctrl: true,
    description: "Select all shifts",
  },
  {
    key: "Escape",
    description: "Deselect all",
  },

  // Undo/Redo
  {
    key: "z",
    ctrl: true,
    description: "Undo",
  },
  {
    key: "y",
    ctrl: true,
    description: "Redo",
  },

  // View toggle
  {
    key: "t",
    description: "Toggle drag mode",
  },
]

export function useCalendarShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return
      }

      const key = e.key.toLowerCase()
      const ctrlKey = e.ctrlKey || e.metaKey // Support both Ctrl and Cmd
      const shiftKey = e.shiftKey
      const altKey = e.altKey

      // Shift management
      if (key === "d" && !ctrlKey && !shiftKey && !altKey) {
        e.preventDefault()
        handlers.onDelete?.()
      }

      if (key === "c" && ctrlKey && !shiftKey) {
        e.preventDefault()
        handlers.onCopy?.()
      }

      if (key === "v" && ctrlKey && !shiftKey) {
        e.preventDefault()
        handlers.onPaste?.()
      }

      if (key === "e" && !ctrlKey && !shiftKey && !altKey) {
        e.preventDefault()
        handlers.onEdit?.()
      }

      if (key === "n" && !ctrlKey && !shiftKey && !altKey) {
        e.preventDefault()
        handlers.onNew?.()
      }

      // Navigation
      if (e.key === "ArrowRight") {
        e.preventDefault()
        handlers.onNextDay?.()
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        handlers.onPrevDay?.()
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        handlers.onNextWeek?.()
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        handlers.onPrevWeek?.()
      }

      // Selection
      if (key === "a" && ctrlKey) {
        e.preventDefault()
        handlers.onSelectAll?.()
      }

      if (e.key === "Escape") {
        e.preventDefault()
        handlers.onDeselectAll?.()
      }

      // Undo/Redo
      if (key === "z" && ctrlKey && !shiftKey) {
        e.preventDefault()
        handlers.onUndo?.()
      }

      if ((key === "y" && ctrlKey) || (key === "z" && ctrlKey && shiftKey)) {
        e.preventDefault()
        handlers.onRedo?.()
      }

      // Toggle
      if (key === "t" && !ctrlKey && !shiftKey && !altKey) {
        e.preventDefault()
        handlers.onToggleDragMode?.()
      }
    },
    [handlers]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Show keyboard shortcuts help
 */
export function getShortcutHelp(): string {
  return `
Keyboard Shortcuts:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIFT MANAGEMENT:
  D             Delete selected shift
  C             Copy selected shift
  V             Paste shift
  E             Edit selected shift
  N             New shift

NAVIGATION:
  ← / →         Previous / Next day
  ↑ / ↓         Previous / Next week
  Ctrl + Z      Undo
  Ctrl + Y      Redo

SELECTION:
  Ctrl + A      Select all shifts
  Escape        Deselect all

VIEW:
  T             Toggle drag mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
}
