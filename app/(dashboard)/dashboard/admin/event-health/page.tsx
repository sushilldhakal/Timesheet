"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { useEventHealth } from "@/lib/hooks/use-event-health"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertCircle,
  XCircle,
  CheckCircle,
  TrendingDown,
  RefreshCw,
  Loader2,
  Activity,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

function StatCard({
  title,
  value,
  icon: Icon,
  variant,
  tooltip,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  variant: "danger" | "success" | "warning" | "neutral"
  tooltip?: string
}) {
  const colours = {
    danger: "border-red-200 dark:border-red-900",
    success: "border-green-200 dark:border-green-900",
    warning: "border-yellow-200 dark:border-yellow-900",
    neutral: "",
  }
  const iconColours = {
    danger: "text-red-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    neutral: "text-muted-foreground",
  }

  return (
    <Card className={colours[variant]} title={tooltip}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${iconColours[variant]}`} />
        </div>
      </CardContent>
    </Card>
  )
}

export default function EventHealthPage() {
  const router = useRouter()
  const { user, isHydrated } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isHydrated && user && user.role !== "admin" && user.role !== "super_admin") {
      router.replace("/dashboard")
    }
  }, [isHydrated, user, router])

  const { data, isLoading, refetch } = useEventHealth()
  const [selectedFailure, setSelectedFailure] = useState<NonNullable<typeof data>["recentFailures"][0] | null>(null)
  const [retrying, setRetrying] = useState(false)

  if (!isHydrated || !user) return null
  if (user.role !== "admin" && user.role !== "super_admin") return null

  const handleTriggerRetry = async () => {
    setRetrying(true)
    try {
      const res = await fetch("/api/admin/trigger-retry", { method: "POST" })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast(`Retry sweep triggered — ${result.retried} events retried, ${result.resolved} resolved`)
      queryClient.invalidateQueries({ queryKey: ["event-health"] })
    } catch (err) {
      toast.error("Trigger failed")
    } finally {
      setRetrying(false)
    }
  }

  const failureRateVariant =
    !data ? "neutral"
    : data.failureRate > 5 ? "danger"
    : data.failureRate > 1 ? "warning"
    : "success"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">Event Bus Health</h1>
            <p className="text-muted-foreground text-sm">
              Live monitoring of the domain event processing pipeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live · refreshing every 60s
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Unprocessed Events"
            value={data?.unprocessed ?? 0}
            icon={AlertCircle}
            variant={data?.unprocessed ? "danger" : "success"}
            tooltip="Events that were emitted but whose listeners have not yet completed"
          />
          <StatCard
            title="Retry Limit Exceeded"
            value={data?.retryExceeded ?? 0}
            icon={XCircle}
            variant={data?.retryExceeded ? "danger" : "success"}
            tooltip="Events that failed 5+ times and will not be retried automatically"
          />
          <StatCard
            title="Processed (24h)"
            value={`${data?.processed24h ?? 0} / ${data?.total24h ?? 0}`}
            icon={CheckCircle}
            variant="neutral"
          />
          <StatCard
            title="Failure Rate"
            value={`${data?.failureRate ?? 0}%`}
            icon={TrendingDown}
            variant={failureRateVariant}
          />
        </div>
      )}

      {/* Recent failures */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Failures</h2>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data?.recentFailures.length ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg border text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
            <p className="font-medium">No failures in the current window</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Event Type</th>
                  <th className="text-left px-4 py-3 font-medium">Failed Listeners</th>
                  <th className="text-left px-4 py-3 font-medium">Occurred</th>
                  <th className="text-left px-4 py-3 font-medium">Retries</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentFailures.map((failure) => (
                  <tr
                    key={failure._id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedFailure(failure)}
                  >
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {failure.eventType}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {failure.failedListeners.map((l) => (
                          <Badge key={l} variant="secondary" className="text-xs">
                            {l}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(failure.occurredAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">{failure.retryCount}</td>
                    <td className="px-4 py-3">
                      {failure.retryCount >= 5 ? (
                        <Badge variant="destructive">Exhausted</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Retrying
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button variant="outline" onClick={handleTriggerRetry} disabled={retrying}>
          {retrying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Trigger Retry Now
        </Button>
      </div>

      {/* Failure detail sheet — forensic read-only */}
      <Sheet open={!!selectedFailure} onOpenChange={(open) => !open && setSelectedFailure(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Failure Detail</SheetTitle>
            <SheetDescription>Read-only forensic view of this event failure.</SheetDescription>
          </SheetHeader>
          {selectedFailure && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Event ID</span>
                <code className="text-xs break-all">{selectedFailure.eventId}</code>

                <span className="text-muted-foreground">Event Type</span>
                <code className="text-xs">{selectedFailure.eventType}</code>

                <span className="text-muted-foreground">Entity</span>
                <span>{selectedFailure.entityType} / {selectedFailure.entityId}</span>

                <span className="text-muted-foreground">Occurred At</span>
                <span>{new Date(selectedFailure.occurredAt).toISOString()}</span>

                <span className="text-muted-foreground">Retry Count</span>
                <span>{selectedFailure.retryCount}</span>

                <span className="text-muted-foreground">Next Retry</span>
                <span>{selectedFailure.nextRetryAt
                  ? new Date(selectedFailure.nextRetryAt).toISOString()
                  : "Will not retry"}</span>

                <span className="text-muted-foreground">Failed Listeners</span>
                <div className="flex flex-wrap gap-1">
                  {selectedFailure.failedListeners.map((l: string) => (
                    <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Payload</p>
                <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedFailure.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
