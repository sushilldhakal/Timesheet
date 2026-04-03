"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { useEmployees } from "@/lib/queries/employees"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AvailabilityConstraintLike = {
  _id?: string
  id?: string
  unavailableDays?: number[]
  unavailableTimeRanges?: Array<{ start: string; end: string }>
  preferredShiftTypes?: string[]
  maxConsecutiveDays?: number | null
  minRestHours?: number | null
  temporaryStartDate?: string | null
  temporaryEndDate?: string | null
  reason?: string
  createdAt?: string
  updatedAt?: string
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

function formatDays(days: number[] | undefined) {
  if (!days?.length) return "—"
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? `Day ${d}`)
    .join(", ")
}

export default function UnavailabilityPage() {
  const { userRole, isHydrated } = useAuth()
  const isAdmin = isAdminOrSuperAdmin(userRole)

  const employeesQuery = useEmployees(500)
  const employees = employeesQuery.data?.employees ?? []

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [constraints, setConstraints] = useState<AvailabilityConstraintLike[]>([])

  useEffect(() => {
    if (!employees.length) return
    setSelectedEmployeeId((prev) => prev ?? employees[0]!.id)
  }, [employees])

  useEffect(() => {
    if (!selectedEmployeeId) return
    if (!isHydrated) return
    if (!isAdmin) return

    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/employees/${selectedEmployeeId}/availability`
        const res = await fetch(url, { credentials: "include", signal: controller.signal })
        const json = await res.json().catch(() => ({} as any))
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load unavailability constraints")
        }
        setConstraints((json?.constraints ?? []) as AvailabilityConstraintLike[])
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load unavailability constraints")
        setConstraints([])
      } finally {
        setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [selectedEmployeeId, isAdmin, isHydrated])

  const refetch = async () => {
    if (!selectedEmployeeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/employees/${selectedEmployeeId}/availability`, { credentials: "include" })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || "Failed to load constraints")
      setConstraints((json?.constraints ?? []) as AvailabilityConstraintLike[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load constraints")
    } finally {
      setLoading(false)
    }
  }

  const deleteConstraint = async (constraint: AvailabilityConstraintLike) => {
    const constraintId = constraint._id ?? constraint.id
    if (!constraintId || !selectedEmployeeId) return

    const ok = window.confirm("Delete this unavailability constraint?")
    if (!ok) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/employees/${selectedEmployeeId}/availability?constraintId=${encodeURIComponent(constraintId)}`,
        { method: "DELETE", credentials: "include" },
      )
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || "Failed to delete constraint")
      if (!json?.success) throw new Error("Delete failed")

      await refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete constraint")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Unavailability</h1>
          <p className="text-muted-foreground text-sm">
            Manage employee availability constraints (day/time unavailability).
          </p>
        </div>
      </div>

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>This page requires admin permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your current role doesn&apos;t have access to availability constraints.
            </p>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Employee</CardTitle>
              <CardDescription>Select an employee to view their unavailability constraints.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Employee</div>
                <Select value={selectedEmployeeId ?? undefined} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.pin})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-0.5">
                <Button type="button" variant="outline" disabled={loading || !selectedEmployeeId} onClick={() => void refetch()}>
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Constraints</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : constraints.length ? `Found ${constraints.length} constraint(s)` : "No constraints found."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="text-sm text-destructive mb-3">{error}</p>}

              {!loading ? (
                <div className="space-y-3">
                  {constraints.map((c) => {
                    const constraintId = c._id ?? c.id
                    const timeRanges = c.unavailableTimeRanges?.length
                      ? c.unavailableTimeRanges.map((r) => `${r.start}-${r.end}`).join(", ")
                      : "—"

                    return (
                      <div key={constraintId ?? Math.random().toString()} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-[200px]">
                            <div className="text-sm font-medium">Unavailable Days</div>
                            <div className="text-sm text-muted-foreground">{formatDays(c.unavailableDays)}</div>
                          </div>

                          <div className="min-w-[200px]">
                            <div className="text-sm font-medium">Unavailable Time Ranges</div>
                            <div className="text-sm text-muted-foreground">{timeRanges}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground">Preferred Shift Types</div>
                            <div className="text-sm text-muted-foreground">
                              {c.preferredShiftTypes?.length ? c.preferredShiftTypes.join(", ") : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground">Max Consecutive Days</div>
                            <div className="text-sm text-muted-foreground">{c.maxConsecutiveDays ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground">Min Rest Hours</div>
                            <div className="text-sm text-muted-foreground">{c.minRestHours ?? "—"}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground">Temporary Window</div>
                            <div className="text-sm text-muted-foreground">
                              {c.temporaryStartDate || c.temporaryEndDate
                                ? `${c.temporaryStartDate ?? "—"} → ${c.temporaryEndDate ?? "—"}`
                                : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground">Reason</div>
                            <div className="text-sm text-muted-foreground">{c.reason || "—"}</div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button size="sm" variant="destructive" onClick={() => void deleteConstraint(c)} disabled={!constraintId || loading}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {!constraints.length && (
                    <p className="text-sm text-muted-foreground py-2">No unavailability constraints found.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading constraints...</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

