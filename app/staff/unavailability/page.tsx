"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { toast } from "sonner"
import { useEmployeeProfile } from "@/lib/queries/employee-clock"

type AvailabilityConstraintLike = {
  _id?: string
  id?: string
  employeeId?: string
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

function toYmd(d: string | null | undefined): string | null {
  if (d == null || d === "") return null
  const s = String(d)
  return s.length >= 10 ? s.slice(0, 10) : null
}

function formatDays(days: number[] | undefined) {
  if (!days?.length) return "—"
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? `Day ${d}`)
    .join(", ")
}

function constraintKey(c: AvailabilityConstraintLike): string {
  return String(c._id ?? c.id ?? "")
}

export default function StaffUnavailabilityPage() {
  const router = useRouter()
  const employeeProfileQuery = useEmployeeProfile()
  const employee = employeeProfileQuery.data?.data?.employee
  const employeeId = employee?.id

  const [refreshNonce, setRefreshNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [constraints, setConstraints] = useState<AvailabilityConstraintLike[]>([])
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null)

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
        const res = await fetch(`/api/employees/${employeeId}/availability`, {
          credentials: "include",
          signal: controller.signal,
        })
        const json = await res.json().catch(() => ({} as Record<string, unknown>))
        if (!res.ok) {
          throw new Error((json as { error?: string }).error || "Failed to load unavailability constraints")
        }
        const list = ((json as { constraints?: AvailabilityConstraintLike[] }).constraints ?? []) as AvailabilityConstraintLike[]
        const merged = list.map((c) => {
          const oid = (c.id ?? c._id) as string | undefined
          return { ...c, _id: oid, id: oid, employeeId }
        })
        setConstraints(merged)
        setSelectedConstraintId((prev) => {
          if (prev && merged.some((c) => constraintKey(c) === prev)) return prev
          const first = merged[0]
          return first ? constraintKey(first) : null
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load unavailability constraints")
        setConstraints([])
        setSelectedConstraintId(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void run()
    return () => controller.abort()
  }, [employeeId, refreshNonce])

  const selectedConstraint = useMemo(() => {
    if (!selectedConstraintId) return null
    return constraints.find((c) => constraintKey(c) === selectedConstraintId) ?? null
  }, [constraints, selectedConstraintId])

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
          <h1 className="text-2xl font-bold">My Unavailability</h1>
          <p className="text-sm text-muted-foreground">View your availability constraints and preferences</p>
        </div>
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Constraints</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : constraints.length ? `${constraints.length} constraint(s)` : "No constraints found."}
            </CardDescription>
          </CardHeader>
          <Separator />
          <ScrollArea className="h-[520px]">
            <div className="space-y-2 p-2">
              {constraints.map((c) => {
                const id = constraintKey(c)
                const isActive = id === selectedConstraintId
                const hasTemp = !!(toYmd(c.temporaryStartDate ?? undefined) || toYmd(c.temporaryEndDate ?? undefined))
                return (
                  <button
                    key={id || `c-${formatDays(c.unavailableDays)}`}
                    type="button"
                    onClick={() => setSelectedConstraintId(id || null)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {formatDays(c.unavailableDays)}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {hasTemp ? "Temporary" : "Permanent"}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {hasTemp ? "Temporary" : "Permanent"}
                      </Badge>
                    </div>
                    {c.reason?.trim() ? (
                      <div className="mt-2 truncate text-xs text-muted-foreground">{c.reason}</div>
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
                  {selectedConstraint ? formatDays(selectedConstraint.unavailableDays) : "—"}
                </CardTitle>
                <CardDescription>
                  {selectedConstraint ? "Availability constraint details" : "Select a constraint to view details."}
                </CardDescription>
              </div>
              {selectedConstraint && (
                <Badge variant="outline">
                  {toYmd(selectedConstraint.temporaryStartDate ?? undefined) ||
                  toYmd(selectedConstraint.temporaryEndDate ?? undefined)
                    ? "Temporary"
                    : "Permanent"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-5">
            {!selectedConstraint ? (
              <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                Pick a constraint from the left to see details.
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Unavailable days</div>
                    <div className="text-sm font-semibold text-foreground">{formatDays(selectedConstraint.unavailableDays)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Time ranges</div>
                    <div className="text-sm text-foreground">
                      {selectedConstraint.unavailableTimeRanges?.length
                        ? selectedConstraint.unavailableTimeRanges.map((r) => `${r.start}–${r.end}`).join(", ")
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Preferred shift types</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedConstraint.preferredShiftTypes?.length
                        ? selectedConstraint.preferredShiftTypes.join(", ")
                        : "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Max consecutive days</div>
                    <div className="text-sm text-muted-foreground">{selectedConstraint.maxConsecutiveDays ?? "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Min rest hours</div>
                    <div className="text-sm text-muted-foreground">{selectedConstraint.minRestHours ?? "—"}</div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Temporary window</div>
                    <div className="text-sm text-foreground">
                      {toYmd(selectedConstraint.temporaryStartDate ?? undefined) ||
                      toYmd(selectedConstraint.temporaryEndDate ?? undefined)
                        ? `${toYmd(selectedConstraint.temporaryStartDate ?? undefined) ?? "—"} → ${toYmd(selectedConstraint.temporaryEndDate ?? undefined) ?? "—"}`
                        : "— (permanent)"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Reason</div>
                    <div className="rounded-lg border bg-background p-3 text-sm text-foreground">
                      {selectedConstraint.reason?.trim() ? selectedConstraint.reason : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    To modify your availability constraints, please contact your manager or administrator.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
