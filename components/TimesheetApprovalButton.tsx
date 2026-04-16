"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
    <AlertDialog open={open} onOpenChange={setOpen}>
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

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve this shift?</AlertDialogTitle>
          <AlertDialogDescription>
            This marks the shift as approved for payroll review.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={approving}
            onClick={(e) => {
              e.preventDefault()
              setOpen(false)
              void onApprove()
            }}
          >
            Approve
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

