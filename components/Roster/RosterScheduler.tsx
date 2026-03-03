"use client"

import { useState, useEffect } from "react"
import { format, addWeeks, subWeeks, parseISO, getISOWeek, getISOWeekYear } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle2, Copy, Save, Send } from "lucide-react"
import { RosterGrid } from "./RosterGrid"
import { EmployeePanel } from "./EmployeePanel"

interface RosterSchedulerProps {
  initialWeekId?: string
}

export function RosterScheduler({ initialWeekId }: RosterSchedulerProps) {
  const [weekId, setWeekId] = useState(initialWeekId || getDefaultWeekId())
  const [roster, setRoster] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setIsSaving] = useState(false)
  const [publishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<any>(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Load roster when weekId changes
  useEffect(() => {
    loadRoster()
  }, [weekId])

  function getDefaultWeekId(): string {
    const now = new Date()
    const year = getISOWeekYear(now)
    const week = getISOWeek(now)
    return `${year}-W${week.toString().padStart(2, "0")}`
  }

  async function loadRoster() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/roster/schedule/${weekId}`)
      if (!res.ok) throw new Error("Failed to load roster")
      const data = await res.json()
      setRoster(data.roster)
      setValidation(data.validation)
      setUnsavedChanges(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveRoster() {
    if (!roster) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/roster/schedule/${weekId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts: roster.shifts }),
      })
      if (!res.ok) throw new Error("Failed to save roster")
      const data = await res.json()
      setRoster(data.roster)
      setValidation(data.validation)
      setUnsavedChanges(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function publishRoster() {
    if (!roster) return
    setIsPublishing(true)
    setError(null)
    try {
      const res = await fetch(`/api/roster/schedule/${weekId}/publish`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to publish roster")
      }
      const data = await res.json()
      setRoster(data.roster)
      setValidation(data.validation)
      setUnsavedChanges(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsPublishing(false)
    }
  }

  async function copyPreviousWeek() {
    const prevWeekId = getPreviousWeekId(weekId)
    try {
      const res = await fetch(`/api/roster/schedule/${weekId}/copy-from/${prevWeekId}`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to copy previous week")
      loadRoster()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function getPreviousWeekId(weekId: string): string {
    const [year, week] = weekId.split("-W")
    let w = parseInt(week)
    let y = parseInt(year)
    if (w === 1) {
      y--
      w = 52
    } else {
      w--
    }
    return `${y}-W${w.toString().padStart(2, "0")}`
  }

  function handleWeekChange(direction: "prev" | "next") {
    const [year, week] = weekId.split("-W")
    let w = parseInt(week)
    let y = parseInt(year)

    if (direction === "prev") {
      if (w === 1) {
        y--
        w = 52
      } else {
        w--
      }
    } else {
      if (w === 52) {
        y++
        w = 1
      } else {
        w++
      }
    }

    setWeekId(`${y}-W${w.toString().padStart(2, "0")}`)
  }

  if (loading)
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin mr-2" />
        Loading roster...
      </div>
    )

  const weekStart = roster ? new Date(roster.weekStartDate) : null
  const weekEnd = roster ? new Date(roster.weekEndDate) : null

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roster Scheduler</h1>
          {weekStart && weekEnd && (
            <p className="text-gray-600">
              {format(weekStart, "MMM dd")} – {format(weekEnd, "MMM dd, yyyy")}
            </p>
          )}
        </div>

        {/* Status Badge */}
        {roster && (
          <div className="flex items-center gap-2">
            {roster.status === "draft" ? (
              <Badge variant="outline" className="bg-yellow-50">
                📝 Draft
              </Badge>
            ) : (
              <Badge className="bg-green-600">✓ Published</Badge>
            )}
          </div>
        )}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => handleWeekChange("prev")}>
          ← Previous
        </Button>

        <Button
          variant="ghost"
          onClick={() => setWeekId(getDefaultWeekId())}
          className="flex-1"
        >
          This Week
        </Button>

        <Button variant="outline" onClick={() => handleWeekChange("next")}>
          Next →
        </Button>

        {roster?.status === "draft" && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyPreviousWeek}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy Previous
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Summary */}
      {validation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Validation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Errors:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {validation.summary.totalErrors}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Warnings:</span>
                <span className="ml-2 font-semibold text-yellow-600">
                  {validation.summary.totalWarnings}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Understaffed:</span>
                <span className="ml-2 font-semibold">
                  {validation.summary.understaffedShifts}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      {roster && (
        <div className="grid grid-cols-4 gap-6">
          {/* Left Panel - Available Employees */}
          <EmployeePanel weekId={weekId} />

          {/* Center - Roster Grid */}
          <div className="col-span-3">
            <RosterGrid
              roster={roster}
              validation={validation}
              onShiftsChange={(shifts) => {
                setRoster({ ...roster, shifts })
                setUnsavedChanges(true)
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        {roster?.status === "draft" && (
          <>
            <Button
              onClick={saveRoster}
              disabled={!unsavedChanges || saving}
              className="gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Save Draft
            </Button>

            <Button
              onClick={publishRoster}
              disabled={
                publishing ||
                !validation ||
                !validation.canPublish ||
                unsavedChanges
              }
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
              <Send className="w-4 h-4" />
              Publish Roster
            </Button>

            {!validation?.canPublish && (
              <p className="text-sm text-red-600 self-center">
                Fix validation errors before publishing
              </p>
            )}
          </>
        )}

        {roster?.status === "published" && (
          <p className="text-sm text-gray-600 self-center">
            Published rosters are read-only. Create a new draft for next week.
          </p>
        )}
      </div>
    </div>
  )
}
