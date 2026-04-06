import React from "react"
import { createPortal } from "react-dom"
import type { Resource } from '@shadcn-scheduler/core'
import { useSchedulerContext } from '@shadcn-scheduler/shell'
import { AlertTriangle } from "lucide-react"

interface CategoryWarningModalProps {
  emp: Resource | null
  fromCategory: Resource
  toCategory: Resource
  onConfirm: () => void
  onCancel: () => void
}

export function RoleWarningModal({
  emp,
  fromCategory,
  toCategory,
  onConfirm,
  onCancel,
}: CategoryWarningModalProps): React.ReactElement | null {
  const { getColor, labels } = useSchedulerContext()
  if (!emp) return null

  const fc = getColor(fromCategory.colorIdx)
  const tc = getColor(toCategory.colorIdx)

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onCancel()
  }

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation()
  }

  const content = (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-10000 flex items-center justify-center bg-black/45 backdrop-blur-xs"
    >
      <div
        onClick={handleModalClick}
        className="max-w-[360px] rounded-[14px] border-t-4 border-primary bg-background px-6 py-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent">
            <AlertTriangle size={16} />
          </div>
          <span className="text-sm font-extrabold text-foreground">
            {labels.category} Mismatch
          </span>
        </div>

        <p className="mb-1.5 text-[13px] leading-snug text-muted-foreground">
          <strong>{emp.name}</strong> is assigned to{" "}
          <span className="font-bold" style={{ color: fc.bg }}>{fromCategory.name}</span>. You&apos;re
          moving this shift to{" "}
          <span className="font-bold" style={{ color: tc.bg }}>{toCategory.name}</span>.
        </p>
        <p className="mb-[18px] text-xs text-muted-foreground">
          This is allowed as fill-in cover. The shift {labels.category.toLowerCase()} will be
          updated.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-[9px] border-none bg-primary py-2.5 text-[13px] font-bold text-primary-foreground"
          >
            Move Anyway
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-[9px] border-none bg-border px-3.5 py-2.5 text-[13px] text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== "undefined" ? createPortal(content, document.body) : content
}
