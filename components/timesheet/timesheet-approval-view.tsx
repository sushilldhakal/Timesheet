"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Lock,
  Loader2,
  FileText,
  Clock,
  DollarSign,
  CalendarDays,
  User,
  AlertTriangle,
  Coffee,
} from "lucide-react"
import { format } from "date-fns"
import {
  getTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  lockTimesheet,
  type TimesheetDetail,
  type ShiftDetail,
} from "@/lib/api/timesheets"



interface TimesheetApprovalViewProps {
  timesheetId: string
  onBack: () => void
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  locked: "bg-amber-100 text-amber-700 border-amber-200",
}

const shiftStatusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-indigo-50 text-indigo-700",
  approved: "bg-green-50 text-green-700",
  locked: "bg-amber-50 text-amber-700",
  processed: "bg-purple-50 text-purple-700",
  exported: "bg-gray-50 text-gray-700",
  rejected: "bg-red-50 text-red-700",
}

export function TimesheetApprovalView({ timesheetId, onBack }: TimesheetApprovalViewProps) {
  const [timesheet, setTimesheet] = useState<TimesheetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [submissionNotes, setSubmissionNotes] = useState("")
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const fetchTimesheet = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTimesheet(timesheetId)
      if (data.timesheet) {
        setTimesheet(data.timesheet)
      }
    } catch (err) {
      console.error("Failed to fetch timesheet:", err)
    } finally {
      setLoading(false)
    }
  }, [timesheetId])

  useEffect(() => {
    fetchTimesheet()
  }, [fetchTimesheet])

  const handleAction = async (
    action: "submit" | "approve" | "reject" | "lock",
    extraBody?: Record<string, string>
  ) => {
    setActionLoading(true)
    try {
      const body: Record<string, string> = { ...(extraBody || {}) }
      if (action === "submit" && submissionNotes.trim()) {
        body.submissionNotes = submissionNotes.trim()
      }

      switch (action) {
        case "submit":
          await submitTimesheet(timesheetId, body)
          break
        case "approve":
          await approveTimesheet(timesheetId, body)
          break
        case "reject":
          await rejectTimesheet(timesheetId, body)
          break
        case "lock":
          await lockTimesheet(timesheetId, body)
          break
      }

      fetchTimesheet()
      if (action === "reject") {
        setRejectDialogOpen(false)
        setRejectionReason("")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} timesheet`
      alert(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDateShort = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy")
    } catch {
      return dateStr
    }
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "—"
    try {
      return format(new Date(dateStr), "HH:mm")
    } catch {
      return "—"
    }
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!timesheet) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">Timesheet not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ts = timesheet

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to list
        </Button>
        <div className="flex items-center gap-2">
          {ts.status === "draft" && (
            <Button
              size="sm"
              onClick={() => handleAction("submit")}
              disabled={actionLoading}
              className="gap-1"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Timesheet
            </Button>
          )}
          {ts.status === "submitted" && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={actionLoading}
                className="gap-1"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {ts.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const payRunId = prompt("Enter PayRun ID to lock this timesheet:")
                if (payRunId) handleAction("lock", { payRunId })
              }}
              disabled={actionLoading}
              className="gap-1"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Lock for Payrun
            </Button>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {typeof ts.employeeId === 'object' ? ts.employeeId?.name : "Unknown Employee"}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateShort(ts.payPeriodStart)} – {formatDateShort(ts.payPeriodEnd)}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`px-3 py-1 text-sm font-semibold ${statusColors[ts.status] || ""}`}
            >
              {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Total Shifts
              </div>
              <p className="mt-1 text-2xl font-bold">{ts.totalShifts}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Total Hours
              </div>
              <p className="mt-1 text-2xl font-bold">{ts.totalHours.toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Total Cost
              </div>
              <p className="mt-1 text-2xl font-bold">${ts.totalCost.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Coffee className="h-3.5 w-3.5" />
                Total Breaks
              </div>
              <p className="mt-1 text-2xl font-bold">{ts.totalBreakMinutes} min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejection reason banner */}
      {ts.status === "rejected" && ts.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Timesheet Rejected</p>
              <p className="mt-1 text-sm text-red-700">{ts.rejectionReason}</p>
              <p className="mt-2 text-xs text-red-500">
                Rejected by {typeof ts.rejectedBy === "object" ? ts.rejectedBy?.email : "—"}{" "}
                on {ts.rejectedAt ? formatDateShort(ts.rejectedAt) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission notes (for draft) */}
      {ts.status === "draft" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Submission Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Optional notes to accompany the submission..."
              rows={2}
            />
          </CardContent>
        </Card>
      )}

      {/* Shifts table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Shifts ({ts.shifts?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!ts.shifts || ts.shifts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No shifts linked to this timesheet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Awards</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ts.shifts.map((shift) => (
                    <TableRow key={shift._id}>
                      <TableCell className="font-medium">
                        {formatDateShort(shift.date)}
                      </TableCell>
                      <TableCell>{formatTime(shift.clockIn?.time)}</TableCell>
                      <TableCell>{formatTime(shift.clockOut?.time)}</TableCell>
                      <TableCell>
                        {shift.totalWorkingHours?.toFixed(1) ?? "—"}h
                      </TableCell>
                      <TableCell>{shift.totalBreakMinutes ?? 0} min</TableCell>
                      <TableCell>
                        ${shift.computed?.totalCost?.toFixed(2) ?? "0.00"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {shift.awardTags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(!shift.awardTags || shift.awardTags.length === 0) && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${shiftStatusColors[shift.status] || ""}`}
                        >
                          {shift.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes / audit section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ts.submissionNotes && (
            <div>
              <p className="font-medium text-muted-foreground">Submission Notes</p>
              <p>{ts.submissionNotes}</p>
            </div>
          )}
          {ts.submittedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Send className="h-3.5 w-3.5" />
              Submitted by{" "}
              {typeof ts.submittedBy === "object" ? ts.submittedBy?.email : "—"} on{" "}
              {formatDateShort(ts.submittedAt)}
            </div>
          )}
          {ts.approvedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Approved by{" "}
              {typeof ts.approvedBy === "object" ? ts.approvedBy?.email : "—"} on{" "}
              {formatDateShort(ts.approvedAt)}
            </div>
          )}
          {ts.rejectedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              Rejected by{" "}
              {typeof ts.rejectedBy === "object" ? ts.rejectedBy?.email : "—"} on{" "}
              {formatDateShort(ts.rejectedAt)}
            </div>
          )}
          {ts.lockedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              Locked by{" "}
              {typeof ts.lockedBy === "object" ? ts.lockedBy?.email : "—"} on{" "}
              {formatDateShort(ts.lockedAt)}
              {ts.payRunId && <span> (PayRun: {ts.payRunId})</span>}
            </div>
          )}
          {ts.notes && (
            <div>
              <p className="font-medium text-muted-foreground">Admin Notes</p>
              <p>{ts.notes}</p>
            </div>
          )}
          {!ts.submittedAt &&
            !ts.approvedAt &&
            !ts.rejectedAt &&
            !ts.lockedAt &&
            !ts.notes &&
            !ts.submissionNotes && (
              <p className="text-muted-foreground">No activity yet.</p>
            )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this timesheet. The employee will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Missing clock-out for Tuesday shift"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                handleAction("reject", { rejectionReason: rejectionReason.trim() })
              }
              disabled={!rejectionReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
