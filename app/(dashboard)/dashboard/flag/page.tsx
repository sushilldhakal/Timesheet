"use client"

import { useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { VisibilityState } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table/data-table"
import { ExternalLink, AlertTriangle } from "lucide-react"
import { useFlags } from "@/lib/queries/flags"
import { useBuddyPunchAlerts, useUpdateBuddyPunchAlert, type AlertStatus } from "@/lib/queries/face-recognition"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type FlagIssueType = "no_image" | "no_location" | "no_image_no_location"

export interface FlagRow {
  id: string
  employeeId: string
  date: string
  pin: string
  name: string
  type: string
  typeLabel: string
  hasImage: boolean
  hasLocation: boolean
  issueType: FlagIssueType
}

const FILTER_OPTIONS: { value: "" | FlagIssueType; label: string }[] = [
  { value: "", label: "All flagged" },
  { value: "no_image", label: "No image" },
  { value: "no_location", label: "No location" },
  { value: "no_image_no_location", label: "No image & no location" },
]

function getColumns(): ColumnDef<FlagRow>[] {
  return [
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      enableHiding: true,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Employee",
      enableHiding: true,
      cell: ({ row }) => {
        const { name, employeeId } = row.original
        if (employeeId) {
          return (
            <Link
              href={`/dashboard/employees/${employeeId}`}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {name || row.original.pin}
              <ExternalLink className="size-3 shrink-0" />
            </Link>
          )
        }
        return name || row.original.pin
      },
    },
    {
      id: "pin",
      accessorKey: "pin",
      header: "PIN",
      enableHiding: true,
    },
    {
      id: "typeLabel",
      accessorKey: "typeLabel",
      header: "Punch type",
      enableHiding: true,
    },
    {
      id: "hasImage",
      accessorKey: "hasImage",
      header: "Image",
      enableHiding: true,
      cell: ({ row }) => (row.original.hasImage ? "Yes" : "No"),
    },
    {
      id: "hasLocation",
      accessorKey: "hasLocation",
      header: "Location",
      enableHiding: true,
      cell: ({ row }) => (row.original.hasLocation ? "Yes" : "No"),
    },
    {
      id: "issueType",
      accessorKey: "issueType",
      header: "Issue",
      enableHiding: true,
      cell: ({ row }) => {
        const t = row.original.issueType
        if (t === "no_image") return "No image"
        if (t === "no_location") return "No location"
        if (t === "no_image_no_location") return "No image & no location"
        return t
      },
    },
  ]
}

function FlagPage() {
  const [activeTab, setActiveTab] = useState<"flags" | "buddy-punch">("flags")
  const [filter, setFilter] = useState<"" | FlagIssueType>("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<string | null>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [searchValue, setSearchValue] = useState("")

  const columns = getColumns()

  const flagsQuery = useFlags({
    limit: pageSize,
    offset: pageIndex * pageSize,
    filter: filter || undefined,
    sortBy: sortBy || undefined,
    order: sortOrder,
  })

  const buddyPunchAlertsQuery = useBuddyPunchAlerts({ status: "pending" })
  const updateAlert = useUpdateBuddyPunchAlert()

  const items = flagsQuery.data?.items ?? []
  const totalCount = flagsQuery.data?.total ?? 0
  const loading = flagsQuery.isLoading
  const error = flagsQuery.error?.message ?? null

  const alerts = buddyPunchAlertsQuery.data?.alerts ?? []
  const pendingCount = buddyPunchAlertsQuery.isLoading ? 0 : alerts.length

  // Debug logging
  console.log('[FlagPage] Buddy punch alerts query:', {
    isLoading: buddyPunchAlertsQuery.isLoading,
    isError: buddyPunchAlertsQuery.isError,
    error: buddyPunchAlertsQuery.error,
    data: buddyPunchAlertsQuery.data,
    alertsCount: alerts.length,
  })

  const handleReview = (alertId: string, status: AlertStatus, notes?: string) => {
    updateAlert.mutate({ id: alertId, status, notes })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Flagged Punches & Alerts</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "flags" | "buddy-punch")}>
        <TabsList>
          <TabsTrigger value="flags">
            Missing Data (<span suppressHydrationWarning>{totalCount}</span>)
          </TabsTrigger>
          <TabsTrigger value="buddy-punch">
            Buddy Punch Alerts (<span suppressHydrationWarning>{pendingCount}</span>)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Filter by issue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-muted-foreground block text-xs font-medium">Issue type</label>
                <Select
                  value={filter || "all"}
                  onValueChange={(v) => {
                    setFilter((v === "all" ? "" : v) as "" | FlagIssueType)
                    setPageIndex(0)
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All flagged" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 pt-4">
              {error && (
                <p className="text-destructive px-4 py-2 text-sm">{error}</p>
              )}
              <DataTable
                mode="server"
                columns={columns}
                data={items}
                totalCount={totalCount}
                loading={loading}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                showSearch={false}
                pageIndex={pageIndex}
                pageSize={pageSize}
                onPageChange={setPageIndex}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPageIndex(0)
                }}
                pageSizeOptions={[20, 50, 100]}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={(columnId, order) => {
                  setSortBy(columnId)
                  setSortOrder(order)
                  setPageIndex(0)
                }}
                sortableColumnIds={["date", "name", "pin", "typeLabel", "hasImage", "hasLocation", "issueType"]}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={(updater) =>
                  setColumnVisibility((prev) => (typeof updater === "function" ? updater(prev) : updater))
                }
                getRowId={(row) => row.id}
                emptyMessage="No flagged punches in the last 30 days."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buddy-punch" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Filter alerts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-muted-foreground block text-xs font-medium">Status</label>
                <Select defaultValue="pending">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed_buddy">Confirmed</SelectItem>
                    <SelectItem value="false_alarm">False Alarm</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {buddyPunchAlertsQuery.isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading alerts...
              </CardContent>
            </Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending buddy punch alerts
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert: any) => {
                const matchPercent = (alert.matchScore * 100).toFixed(0)
                const matchLevel = alert.matchScore < 0.3 ? "Very low" : 
                                  alert.matchScore < 0.5 ? "Low" : 
                                  alert.matchScore < 0.7 ? "Medium" : "High"
                const matchColor = alert.matchScore < 0.3 ? "bg-destructive" : 
                                  alert.matchScore < 0.5 ? "bg-orange-500" : 
                                  alert.matchScore < 0.7 ? "bg-yellow-500" : "bg-green-500"

                return (
                  <Card key={alert._id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <div>
                            <CardTitle className="text-base mb-1">
                              {alert.employeeId?.name || "Unknown Employee"}
                            </CardTitle>
                            <div className="text-sm text-muted-foreground">
                              <span className="capitalize">{alert.punchType}</span>
                              {" · "}
                              {new Date(alert.punchTime).toLocaleDateString("en-US", { 
                                month: "short", 
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                              })}
                              {" · "}
                              {alert.locationId?.name || "Unknown Location"}
                            </div>
                          </div>
                        </div>
                        <Badge variant="destructive">Pending Review</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* Enrolled Photo */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">
                              Enrolled Photo
                            </label>
                            <span className="text-xs text-muted-foreground">
                              {alert.employeeId?.enrolledAt 
                                ? new Date(alert.employeeId.enrolledAt).toLocaleDateString("en-US", { 
                                    month: "short", 
                                    day: "numeric",
                                    year: "numeric"
                                  })
                                : "Enrollment date unknown"}
                            </span>
                          </div>
                          {alert.enrolledPhotoUrl ? (
                            <div className="relative aspect-[4/3] rounded-lg border-2 overflow-hidden bg-muted">
                              <img 
                                src={alert.enrolledPhotoUrl} 
                                alt="Enrolled" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-[4/3] rounded-lg border-2 border-dashed bg-muted flex items-center justify-center text-muted-foreground text-sm">
                              No photo available
                            </div>
                          )}
                        </div>

                        {/* Captured Photo */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">
                              Captured Photo
                            </label>
                            <span className="text-xs text-muted-foreground">
                              Today at clock-in
                            </span>
                          </div>
                          {alert.capturedPhotoUrl ? (
                            <div className="relative aspect-[4/3] rounded-lg border-2 overflow-hidden bg-muted">
                              <img 
                                src={alert.capturedPhotoUrl} 
                                alt="Captured" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-[4/3] rounded-lg border-2 border-dashed bg-muted flex items-center justify-center text-muted-foreground text-sm">
                              No photo available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Match Score Progress Bar */}
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Match score: {matchPercent}%</span>
                          <span className="text-sm text-muted-foreground">{matchLevel}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${matchColor} transition-all`}
                            style={{ width: `${matchPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => handleReview(alert._id, "confirmed_buddy", "Confirmed as buddy punch")}
                          disabled={updateAlert.isPending}
                        >
                          ✓ Confirm Buddy Punch
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleReview(alert._id, "false_alarm", "False alarm - legitimate punch")}
                          disabled={updateAlert.isPending}
                        >
                          ✗ False Alarm
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReview(alert._id, "dismissed")}
                          disabled={updateAlert.isPending}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FlagPage
