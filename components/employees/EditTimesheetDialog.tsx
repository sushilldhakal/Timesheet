"use client"

import { useState, useEffect } from "react"
import { format, isValid, parse } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormDialogShell } from "@/components/shared/forms"
import { useUpdateEmployeeTimesheet } from "@/lib/queries/employees"

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
  timesheet: DailyTimesheetRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTimesheetDialog({ employeeId, timesheet, open, onOpenChange, onSuccess }: Props) {
  const [clockIn, setClockIn] = useState(toTimeInputValue(timesheet.clockIn))
  const [breakIn, setBreakIn] = useState(toTimeInputValue(timesheet.breakIn))
  const [breakOut, setBreakOut] = useState(toTimeInputValue(timesheet.breakOut))
  const [clockOut, setClockOut] = useState(toTimeInputValue(timesheet.clockOut))
  const [error, setError] = useState<string | null>(null)

  const updateTimesheetMutation = useUpdateEmployeeTimesheet()

  useEffect(() => {
    if (open && timesheet) {
      setClockIn(toTimeInputValue(timesheet.clockIn))
      setBreakIn(toTimeInputValue(timesheet.breakIn))
      setBreakOut(toTimeInputValue(timesheet.breakOut))
      setClockOut(toTimeInputValue(timesheet.clockOut))
    }
  }, [open, timesheet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await updateTimesheetMutation.mutateAsync({
        employeeId,
        data: {
          clockIn,
          breakStart: breakIn,
          breakEnd: breakOut,
          clockOut,
        }
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update timesheet")
    }
  }

  const loading = updateTimesheetMutation.isPending

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Timesheet"
      description={formatDateForTitle(timesheet.date)}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      loading={loading}
      error={error}
    >
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="edit-clock-in">Clock In</FieldLabel>
            <Input
              id="edit-clock-in"
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-clock-out">Clock Out</FieldLabel>
            <Input
              id="edit-clock-out"
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="edit-break-in">Break Start</FieldLabel>
            <Input
              id="edit-break-in"
              type="time"
              value={breakIn}
              onChange={(e) => setBreakIn(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-break-out">Break End</FieldLabel>
            <Input
              id="edit-break-out"
              type="time"
              value={breakOut}
              onChange={(e) => setBreakOut(e.target.value)}
            />
          </Field>
        </div>
      </FieldGroup>
    </FormDialogShell>
  )
}
