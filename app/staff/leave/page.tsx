"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useEmployeeProfile } from "@/lib/queries/employee-clock"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LEAVE_TYPE_OPTIONS = ["ANNUAL", "SICK", "UNPAID", "PUBLIC_HOLIDAY"] as const

type LeaveRecordLike = {
  _id?: string
  id?: string
  employeeId?: string
  startDate?: string
  endDate?: string
  leaveType?: string
  status?: string
  notes?: string
  approvedBy?: string
  approvedAt?: string
  deniedBy?: string
  deniedAt?: string
  denialReason?: string
  createdAt?: string
  updatedAt?: string
}

function statusBadge(statusRaw: string | undefined): { label: string; className: string } {
  const s = (statusRaw || "").toLowerCase()
  if (s.includes("approve")) {
    return { label: statusRaw || "Approved", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
  }
  if (s.includes("reject") || s.includes("denied") || s.includes("declin")) {
    return { label: statusRaw || "Rejected", className: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300" }
  }
  if (s.includes("pending") || !s) {
    return { label: statusRaw || "Pending", className: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300" }
  }
  return { label: statusRaw || "Unknown", className: "border-border bg-muted text-muted-foreground" }
}

export default function StaffLeavePage() {
  const router = useRouter()
  const employeeProfileQuery = useEmployeeProfile()
  const employee = employeeProfileQuery.data?.data?.employee
  const employeeId = employee?.id

  const [refreshNonce, setRefreshNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [absences, setAbsences] = useState<LeaveRecordLike[]>([])
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null)

  const [addLeaveOpen, setAddLeaveOpen] = useState(false)
  const [addStart, setAddStart] = useState("")
  const [addEnd, setAddEnd] = useState("")
  const [addType, setAddType] = useState<(typeof LEAVE_TYPE_OPTIONS)[number]>("ANNUAL")
  const [addNotes, setAddNotes] = useState("")
  const [addSubmitting, setAddSubmitting] = useState(false)

  useEffect(() => {
    if (employeeProfileQuery.isError) {
      toast.error("Session expired. Please log in again.")
      router.push("/")
    }
  }, [employeeProfileQuery.isError, router])

  useEffect(() => {
    if (!employeeId) return

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/employees/${employeeId}/absences`, {
          credentials: "include",
          signal: controller.signal,
        })
        const json = await res.json().catch(() => ({} as Record<string, unknown>))
        if (!res.ok) {
          throw new Error((json as { error?: string }).error || "Failed to load leave records")
        }
        const rows = ((json as { absences?: LeaveRecordLike[] }).absences ?? []) as LeaveRecordLike[]
        const merged = rows.map((a) => {
          const oid = (a.id ?? a._id) as string | undefined
          return { ...a, _id: oid, id: oid }
        })
        merged.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))
        setAbsences(merged)
        setSelectedAbsenceId((prev) => {
          if (prev && merged.some((x) => (x._id ?? x.id) === prev)) return prev
          return merged[0]?._id ?? merged[0]?.id ?? null
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load leave records")
        setAbsences([])
        setSelectedAbsenceId(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [employeeId, refreshNonce])

  const submitAddLeave = async () => {
    if (!employeeId) {
      toast.error("Employee ID not found")
      return
    }
    if (!addStart || !addEnd) {
      toast.error("Start and end dates are required")
      return
    }
    if (addEnd < addStart) {
      toast.error("End date must be on or after start date")
      return
    }

    setAddSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/employees/${employeeId}/absences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: addStart,
          endDate: addEnd,
          leaveType: addType,
          notes: addNotes.trim() || undefined,
        }),
      })

      const json = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        const msg = (json as { error?: string }).error || "Failed to create leave"
        toast.error(msg)
        throw new Error(msg)
      }

      setAddLeaveOpen(false)
      setRefreshNonce((n) => n + 1)
      toast.success("Leave request created")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create leave")
    } finally {
      setAddSubmitting(false)
    }
  }

  const openAddLeave = () => {
    const today = new Date().toISOString().split("T")[0]
    setAddStart(today)
    setAddEnd(today)
    setAddType("ANNUAL")
    setAddNotes("")
    setAddLeaveOpen(true)
  }

  const selectedAbsence = useMemo(() => {
    if (!selectedAbsenceId) return null
    return absences.find((a) => (a._id ?? a.id) === selectedAbsenceId) ?? null
  }, [absences, selectedAbsenceId])

  if (employeeProfileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (employeeProfileQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Session expired. Redirecting to login...</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Leave Requests</h1>
          <p className="text-sm text-muted-foreground">View and manage your leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={openAddLeave}>
            <Plus className="size-4" />
            Request Leave
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setRefreshNonce((n) => n + 1)}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">All Requests</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : absences.length ? `${absences.length} request(s)` : "No requests found."}
            </CardDescription>
          </CardHeader>
          <Separator />
          <ScrollArea className="h-[520px]">
            <div className="space-y-2 p-2">
              {absences.map((a) => {
                const id = (a._id ?? a.id) as string | undefined
                const isActive = !!id && id === selectedAbsenceId
                const st = statusBadge(a.status)
                return (
                  <button
                    key={id ?? `${a.startDate}-${a.endDate}-${a.leaveType}`}
                    type="button"
                    onClick={() => setSelectedAbsenceId(id ?? null)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{a.leaveType ?? "—"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {a.startDate ?? "—"} → {a.endDate ?? "—"}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", st.className)}>
                        {st.label}
                      </Badge>
                    </div>
                    {a.notes?.trim() ? (
                      <div className="mt-2 truncate text-xs text-muted-foreground">{a.notes}</div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {selectedAbsence ? selectedAbsence.leaveType ?? "—" : "—"}
                </CardTitle>
                <CardDescription>
                  {selectedAbsence
                    ? `${selectedAbsence.startDate ?? "—"} → ${selectedAbsence.endDate ?? "—"}`
                    : "Select a request to view details."}
                </CardDescription>
              </div>
              {selectedAbsence && (
                <Badge variant="outline" className={cn(statusBadge(selectedAbsence.status).className)}>
                  {statusBadge(selectedAbsence.status).label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-5">
            {!selectedAbsence ? (
              <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                Pick a leave request from the left to see details.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Dates</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedAbsence.startDate ?? "—"} → {selectedAbsence.endDate ?? "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Leave type</div>
                    <div className="text-sm font-semibold text-foreground">{selectedAbsence.leaveType ?? "—"}</div>
                  </div>
                </div>

                {selectedAbsence.notes?.trim() && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Notes</div>
                    <div className="rounded-lg border bg-background p-3 text-sm text-foreground">
                      {selectedAbsence.notes}
                    </div>
                  </div>
                )}

                {selectedAbsence.denialReason?.trim() && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-destructive">Denial reason</div>
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                      {selectedAbsence.denialReason}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedAbsence.approvedAt && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Approved at</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(selectedAbsence.approvedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedAbsence.deniedAt && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Denied at</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(selectedAbsence.deniedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addLeaveOpen} onOpenChange={setAddLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leave-type">Leave Type</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as typeof addType)}>
                <SelectTrigger id="leave-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={addStart}
                  onChange={(e) => setAddStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={addEnd}
                  onChange={(e) => setAddEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Add any additional information..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeaveOpen(false)} disabled={addSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitAddLeave} disabled={addSubmitting}>
              {addSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
