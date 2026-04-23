"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface OnboardingActionsCardProps {
  employeeId: string
  employeeName: string
  workflowStatus: string
  onboardingCompleted: boolean
  passwordSetupExpiry?: string | null
  onSuccess: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started:      { label: 'Not Started',      className: 'text-muted-foreground border-muted' },
  in_progress:      { label: 'In Progress',       className: 'text-blue-600 border-blue-200 bg-blue-50' },
  completed:        { label: 'Completed',          className: 'text-teal-600 border-teal-200 bg-teal-50' },
  pending_review:   { label: 'Pending Review',    className: 'text-amber-600 border-amber-200 bg-amber-50' },
  manually_verified:{ label: 'Manually Verified', className: 'text-purple-600 border-purple-200 bg-purple-50' },
  approved:         { label: 'Approved',          className: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  action_required:  { label: 'Action Required',   className: 'text-red-600 border-red-200 bg-red-50' },
}

export function OnboardingActionsCard({
  employeeId,
  employeeName,
  workflowStatus,
  onboardingCompleted,
  passwordSetupExpiry,
  onSuccess,
}: OnboardingActionsCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [flagDialogOpen, setFlagDialogOpen] = useState(false)
  const [flagNote, setFlagNote] = useState("")

  const inviteExpired =
    !onboardingCompleted &&
    passwordSetupExpiry &&
    new Date(passwordSetupExpiry) < new Date()

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/employees/${employeeId}/onboarding-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      toast.success(
        action === 'resend_invite' ? 'Invite resent successfully' :
        action === 'approve'       ? 'Employee approved and activated' :
        action === 'mark_verified' ? 'Marked as verified' :
        'Action completed'
      )
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  const handleFlag = async () => {
    if (!flagNote.trim()) {
      toast.error('Please enter a note for the employee')
      return
    }
    await doAction('flag_action_required', { note: flagNote })
    setFlagDialogOpen(false)
    setFlagNote("")
  }

  const statusConfig = STATUS_CONFIG[workflowStatus] ?? STATUS_CONFIG.not_started

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Workflow Status:</span>
        <Badge variant="outline" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Expired invite banner */}
      {inviteExpired && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-900 dark:text-amber-100">
              Setup invite expired — staff cannot log in
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={loading === 'resend_invite'}
            onClick={() => doAction('resend_invite')}
            className="w-full sm:w-auto shrink-0"
          >
            {loading === 'resend_invite' ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Resend Invite
          </Button>
        </div>
      )}

      {/* HR action buttons — shown when completed, pending_review or manually_verified */}
      {(workflowStatus === 'completed' || workflowStatus === 'pending_review' || workflowStatus === 'manually_verified') && (
        <div className="space-y-3">
          {(workflowStatus === 'completed' || workflowStatus === 'pending_review') && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!loading}
              onClick={() => doAction('mark_verified')}
              className="w-full sm:w-auto"
            >
              {loading === 'mark_verified' ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
              )}
              Mark as Verified
            </Button>
          )}

          {workflowStatus === 'manually_verified' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                disabled={!!loading}
                onClick={() => doAction('approve')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading === 'approve' ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                )}
                Approve
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!!loading}
                onClick={() => setFlagDialogOpen(true)}
                className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-3.5 w-3.5" />
                Flag Action Required
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Flag dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flag Action Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Describe what {employeeName} needs to fix or provide. This note will be emailed to them.
            </p>
            <div className="space-y-2">
              <Label htmlFor="flag-note">Note for employee *</Label>
              <Textarea
                id="flag-note"
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="e.g. Please re-upload your passport — the image was unclear."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setFlagDialogOpen(false); setFlagNote("") }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlag}
              disabled={loading === 'flag_action_required' || !flagNote.trim()}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {loading === 'flag_action_required' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Send & Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
