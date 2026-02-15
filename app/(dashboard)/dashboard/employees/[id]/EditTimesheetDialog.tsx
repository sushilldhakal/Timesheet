"use client"

import { useState, useEffect } from "react"
import { format, isValid, parse } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface DailyTimesheetRow {
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
}

/** Convert time string to HH:mm for input[type="time"]. Handles old ("Wednesday... 1:57 PM") and new ("08:25") formats. */
function formatDateForTitle(dateStr: string): string {
  if (!dateStr) return dateStr
  try {
    const d1 = parse(dateStr, "dd-MM-yyyy", new Date(), { locale: enUS })
    if (isValid(d1)) return format(d1, "EEE do MMMM yyyy", { locale: enUS })
    const d2 = parse(dateStr, "yyyy-MM-dd", new Date(), { locale: enUS })
    return isValid(d2) ? format(d2, "EEE do MMMM yyyy", { locale: enUS }) : dateStr
  } catch {
    return dateStr
  }
}

function toTimeInputValue(t?: string): string {
  if (!t || typeof t !== "string" || !t.trim()) return ""
  const s = t.trim()
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) return `${colonMatch[1].padStart(2, "0")}:${colonMatch[2]}`
  const d = new Date(s)
  if (!isValid(d)) return ""
  return format(d, "HH:mm")
}

type Props = {
  employeeId: string
  row: DailyTimesheetRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTimesheetDialog({ employeeId, row, open, onOpenChange, onSuccess }: Props) {
  const [clockIn, setClockIn] = useState(toTimeInputValue(row.clockIn))
  const [breakIn, setBreakIn] = useState(toTimeInputValue(row.breakIn))
  const [breakOut, setBreakOut] = useState(toTimeInputValue(row.breakOut))
  const [clockOut, setClockOut] = useState(toTimeInputValue(row.clockOut))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && row) {
      setClockIn(toTimeInputValue(row.clockIn))
      setBreakIn(toTimeInputValue(row.breakIn))
      setBreakOut(toTimeInputValue(row.breakOut))
      setClockOut(toTimeInputValue(row.clockOut))
    }
  }, [open, row])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/timesheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: row.date,
          clockIn,
          breakIn,
          breakOut,
          clockOut,
          previousClockIn: row.clockIn ?? "",
          previousBreakIn: row.breakIn ?? "",
          previousBreakOut: row.breakOut ?? "",
          previousClockOut: row.clockOut ?? "",
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to update timesheet")
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Timesheet - {formatDateForTitle(row.date)}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Clock In</FieldLabel>
              <Input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Break In</FieldLabel>
              <Input
                type="time"
                value={breakIn}
                onChange={(e) => setBreakIn(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Break Out</FieldLabel>
              <Input
                type="time"
                value={breakOut}
                onChange={(e) => setBreakOut(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Clock Out</FieldLabel>
              <Input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
