"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "@/lib/utils/toast"
import { apiFetch } from "@/lib/api/fetch-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Plus, Loader2, Trash2 } from "lucide-react"

type BreakRow = { id: string; start: string; end: string; paid: boolean }

export interface PunchEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timesheetId: string
  shiftId: string
  date: string
  employeeName: string
  clockIn: string | null
  clockOut: string | null
  breaks: BreakRow[]
  onSaved: () => void
}

function isoToUtcTimeValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function utcTimeValueToIso(dateYmd: string, timeValue: string): string {
  // Expect dateYmd: yyyy-MM-dd, timeValue: HH:mm
  return `${dateYmd}T${timeValue}:00.000Z`
}

function newLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `new-${crypto.randomUUID()}`
  return `new-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function PunchEditDialog(props: PunchEditDialogProps) {
  const { open, onOpenChange, timesheetId, shiftId, date, employeeName, clockIn, clockOut, breaks, onSaved } = props

  const initialState = useMemo(() => {
    return {
      clockInTime: isoToUtcTimeValue(clockIn),
      clockOutTime: isoToUtcTimeValue(clockOut),
      breaks: (breaks ?? []).map((b) => ({
        id: b.id,
        startTime: isoToUtcTimeValue(b.start),
        endTime: isoToUtcTimeValue(b.end),
        paid: !!b.paid,
        _isNew: false,
      })),
    }
  }, [clockIn, clockOut, breaks])

  const [clockInTime, setClockInTime] = useState(initialState.clockInTime)
  const [clockOutTime, setClockOutTime] = useState(initialState.clockOutTime)
  const [breakRows, setBreakRows] = useState(initialState.breaks)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setClockInTime(initialState.clockInTime)
    setClockOutTime(initialState.clockOutTime)
    setBreakRows(initialState.breaks)
  }, [open, initialState])

  const missingClockIn = !clockIn
  const missingClockOut = !clockOut

  const canSave = useMemo(() => {
    // Allow saving missing clock in/out (still valid to patch breaks only).
    const breaksValid = breakRows.every((b) => (!b.startTime && !b.endTime) || (b.startTime && b.endTime))
    return breaksValid && !saving
  }, [breakRows, saving])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        clockInUtc: clockInTime ? utcTimeValueToIso(date, clockInTime) : null,
        clockOutUtc: clockOutTime ? utcTimeValueToIso(date, clockOutTime) : null,
        breaks: breakRows
          .filter((b) => b.startTime || b.endTime)
          .map((b) => ({
            id: b.id,
            start: utcTimeValueToIso(date, b.startTime),
            end: utcTimeValueToIso(date, b.endTime),
            paid: b.paid,
          })),
      }

      await apiFetch(`/api/daily-shifts/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      await apiFetch(`/api/timesheets/${timesheetId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      toast.success({ description: "Punch updated and totals recalculated." })
      onOpenChange(false)
      onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update punch"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit punch</DialogTitle>
          <DialogDescription>
            {employeeName} · {date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Clock In</Label>
                {missingClockIn && <Badge variant="outline">Missing</Badge>}
              </div>
              <Input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                step={60}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Clock Out</Label>
                {missingClockOut && <Badge variant="outline">Missing</Badge>}
              </div>
              <Input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                step={60}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Breaks</p>
                <p className="text-xs text-muted-foreground">
                  Provide both start and end times for each break.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setBreakRows((prev) => [
                    ...prev,
                    {
                      id: newLocalId(),
                      startTime: "",
                      endTime: "",
                      paid: false,
                      _isNew: true,
                    },
                  ])
                }
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add break
              </Button>
            </div>

            {breakRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No breaks.</p>
            ) : (
              <div className="space-y-3">
                {breakRows.map((b, idx) => {
                  const hasMismatch = (b.startTime && !b.endTime) || (!b.startTime && b.endTime)
                  return (
                    <div key={b.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          Break {idx + 1} {b._isNew ? <Badge variant="secondary" className="ml-2">New</Badge> : null}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => setBreakRows((prev) => prev.filter((x) => x.id !== b.id))}
                          title="Remove break"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                        <div className="space-y-2">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={b.startTime}
                            onChange={(e) =>
                              setBreakRows((prev) =>
                                prev.map((x) => (x.id === b.id ? { ...x, startTime: e.target.value } : x))
                              )
                            }
                            step={60}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>End</Label>
                          <Input
                            type="time"
                            value={b.endTime}
                            onChange={(e) =>
                              setBreakRows((prev) =>
                                prev.map((x) => (x.id === b.id ? { ...x, endTime: e.target.value } : x))
                              )
                            }
                            step={60}
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">Paid</p>
                            <p className="text-xs text-muted-foreground">Counts as paid time</p>
                          </div>
                          <Switch
                            checked={b.paid}
                            onCheckedChange={(v) =>
                              setBreakRows((prev) =>
                                prev.map((x) => (x.id === b.id ? { ...x, paid: !!v } : x))
                              )
                            }
                          />
                        </div>
                      </div>

                      {hasMismatch && (
                        <p className="mt-2 text-xs text-red-600">
                          Break needs both start and end times.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

