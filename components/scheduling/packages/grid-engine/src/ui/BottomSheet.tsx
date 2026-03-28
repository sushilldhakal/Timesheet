import React, { useEffect } from "react"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Optional title or handle bar area */
  title?: React.ReactNode
}

/**
 * Bottom sheet for mobile: slides up from bottom with backdrop.
 * Use for block detail on viewports < 768px.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  title,
}: BottomSheetProps): React.ReactElement | null {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-9999 flex items-end justify-center bg-black/40 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[420px] flex-col overflow-hidden rounded-t-2xl bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.2)]"
      >
        {title !== undefined && (
          <div className="shrink-0 border-b border-border px-4 py-3">
            {title}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
