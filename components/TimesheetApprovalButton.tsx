"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialogShell } from "@/components/shared/forms"

export function TimesheetApprovalButton({
  approved,
  approving,
  canApprove = true,
  onApprove,
  size = "sm",
}: {
  approved: boolean
  approving: boolean
  canApprove?: boolean
  onApprove: () => void | Promise<void>
  size?: "sm" | "default" | "lg" | "icon"
}) {
  const [open, setOpen] = useState(false)

  if (approved) {
    return (
      <Button variant="secondary" size={size} disabled className="gap-1.5">
        <CheckCircle2 className="h-4 w-4" />
        Approved
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="default"
        size={size}
        onClick={() => setOpen(true)}
        disabled={approving || !canApprove}
        className="gap-1.5"
        title={!canApprove ? "You don't have permission to approve shifts" : undefined}
      >
        {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Approve
      </Button>

      <ConfirmDialogShell
        open={open}
        onOpenChange={setOpen}
        title="Approve this shift?"
        description="This marks the shift as approved for payroll review."
        onConfirm={async () => {
          setOpen(false)
          await onApprove()
        }}
        confirmLabel="Approve"
        loading={approving}
      />
    </>
  )
}

