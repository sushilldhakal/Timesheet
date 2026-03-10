"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { VisibilityState } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table/data-table"
import { ExternalLink } from "lucide-react"
import { useFlags } from "@/lib/queries/flags"
import { useBuddyPunchAlerts, useUpdateBuddyPunchAlert, type AlertStatus } from "@/lib/queries/face-recognition"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FlagIssueType, FlagRow } from "@/lib/types/flags"

import { BuddyPunchAlertCard } from "./BuddyPunchAlertCard"

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
  const [buddyPunchStatus, setBuddyPunchStatus] = useState<"pending" | "all" | "confirmed_buddy" | "false_alarm" | "dismissed">("pending")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<string | null>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [searchValue, setSearchValue] = useState("")
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client before showing counts
  useEffect(() => {
    setIsClient(true)
  }, [])

  const columns = getColumns()

  const flagsQuery = useFlags({
    limit: pageSize,
    offset: pageIndex * pageSize,
    filter: filter || undefined,
    sortBy: sortBy || undefined,
    order: sortOrder,
  })

  const buddyPunchAlertsQuery = useBuddyPunchAlerts({ 
    status: buddyPunchStatus === "all" ? undefined : buddyPunchStatus 
  })
  const updateAlert = useUpdateBuddyPunchAlert()

  const items = flagsQuery.data?.items ?? []
  const totalCount = flagsQuery.data?.total ?? 0
  const loading = flagsQuery.isLoading
  const error = flagsQuery.error?.message ?? null

  const alerts = buddyPunchAlertsQuery.data?.alerts ?? []
  const alertsCount = buddyPunchAlertsQuery.isLoading ? 0 : alerts.length

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
            Missing Data{isClient && !loading ? ` (${totalCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="buddy-punch">
            Buddy Punch Alerts{isClient && !buddyPunchAlertsQuery.isLoading ? ` (${alertsCount})` : ""}
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

          <Card className="pt-0">
            <CardContent className="p-0">
              {error && (
                <p className="text-destructive px-4 py-2 text-sm">{error}</p>
              )}
              {!isClient ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
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
              )}
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
                <Select 
                  value={buddyPunchStatus} 
                  onValueChange={(v) => setBuddyPunchStatus(v as typeof buddyPunchStatus)}
                >
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

          {!isClient ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : buddyPunchAlertsQuery.isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading alerts...
              </CardContent>
            </Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {buddyPunchStatus === "pending" 
                  ? "No pending buddy punch alerts" 
                  : `No ${buddyPunchStatus === "all" ? "" : buddyPunchStatus.replace("_", " ")} alerts found`}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert: any) => (
                <BuddyPunchAlertCard
                  key={alert._id}
                  alert={alert}
                  onReview={handleReview}
                  isPending={updateAlert.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FlagPage
