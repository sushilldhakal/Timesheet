"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Plane, MessageCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toast } from "@/lib/utils/toast"
import { createEmployeeAbsence } from "@/lib/api/absences"
import { cn } from "@/lib/utils/cn"

const LEAVE_TYPE_OPTIONS = ["ANNUAL", "SICK", "UNPAID", "PUBLIC_HOLIDAY"] as const
type LeaveType = (typeof LEAVE_TYPE_OPTIONS)[number]

const DURATION_OPTIONS = ["Full day", "Part day", "Multiple days"] as const
type Duration = (typeof DURATION_OPTIONS)[number]

// ─── Add Leave Dialog ─────────────────────────────────────────────────────────

interface AddLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  employeeName: string
  date: string // yyyy-MM-dd
}

export function AddLeaveDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  date,
}: AddLeaveDialogProps) {
  const initialDate = date ? new Date(date + "T00:00:00") : new Date()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialDate,
    to: initialDate,
  })
  const [leaveType, setLeaveType] = useState<LeaveType>("ANNUAL")
  const [duration, setDuration] = useState<Duration>("Full day")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Select a date range")
      return
    }
    setSubmitting(true)
    try {
      await createEmployeeAbsence(employeeId, {
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        leaveType,
        notes: notes.trim() || undefined,
      })
      toast.success("Leave request created")
      onOpenChange(false)
      setNotes("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create leave")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add leave</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Who */}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Who is taking leave?</p>
            <p className="text-sm font-semibold">{employeeName}</p>
          </div>

          {/* When */}
          <div className="space-y-1.5">
            <Label className="text-xs">When does the leave start?</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder="Select dates"
            />
          </div>

          {/* Leave type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Leave Type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
              <SelectTrigger>
                <SelectValue placeholder="Please make a selection" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                    duration === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Part day times */}
          {duration === "Part day" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Comment Dialog ───────────────────────────────────────────────────────────

interface CommentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  date: string
}

export function ShiftCommentDialog({
  open,
  onOpenChange,
  employeeName,
  date,
}: CommentDialogProps) {
  const [comment, setComment] = useState("")
  const [notifyCommenters, setNotifyCommenters] = useState(true)
  const [notifyManagers, setNotifyManagers] = useState(false)
  const [notifySpecific, setNotifySpecific] = useState(false)
  const [specificPerson, setSpecificPerson] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    // Notification dispatch would go here
    await new Promise((r) => setTimeout(r, 400))
    toast.success("Comment saved")
    setSubmitting(false)
    setComment("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Context */}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {employeeName} · {date}
          </div>

          {/* Comment textarea */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            className="text-sm"
            autoFocus
          />

          {/* Notify section */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Notify others of your comment</p>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifyCommenters}
                onCheckedChange={(v) => setNotifyCommenters(!!v)}
              />
              <span className="text-sm">People who've commented</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifyManagers}
                onCheckedChange={(v) => setNotifyManagers(!!v)}
              />
              <span className="text-sm">Team Managers</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={notifySpecific}
                onCheckedChange={(v) => setNotifySpecific(!!v)}
              />
              <span className="text-sm">Specific person</span>
            </label>

            {notifySpecific && (
              <Input
                value={specificPerson}
                onChange={(e) => setSpecificPerson(e.target.value)}
                placeholder="Search person…"
                className="text-sm mt-1 ml-6 w-[calc(100%-1.5rem)]"
              />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !comment.trim()}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Row action buttons ───────────────────────────────────────────────────────

interface ShiftRowActionsProps {
  employeeId: string
  employeeName: string
  date: string // yyyy-MM-dd
  collapsed: boolean
  onToggleCollapse: () => void
}

export function ShiftRowActions({
  employeeId,
  employeeName,
  date,
  collapsed,
  onToggleCollapse,
}: ShiftRowActionsProps) {
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)

  const displayDate = (() => {
    try {
      return format(new Date(date + "T00:00:00"), "d MMM yyyy")
    } catch {
      return date
    }
  })()

  return (
    <>
      {/* Vertical button strip */}
      <div className="flex flex-col items-center gap-1 pl-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
          title={collapsed ? "Expand" : "Collapse"}
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          title="Add leave"
          onClick={() => setLeaveOpen(true)}
        >
          <Plane className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          title="Comment"
          onClick={() => setCommentOpen(true)}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      <AddLeaveDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        date={date}
      />

      <ShiftCommentDialog
        open={commentOpen}
        onOpenChange={setCommentOpen}
        employeeName={employeeName}
        date={displayDate}
      />
    </>
  )
}
