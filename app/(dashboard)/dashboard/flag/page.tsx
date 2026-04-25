"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  format,
  addDays, subDays,
  addWeeks, subWeeks, startOfISOWeek, endOfISOWeek,
  addMonths, subMonths, startOfMonth, endOfMonth,
} from "date-fns"
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
import { ExternalLink, AlignJustify, Columns, LayoutGrid } from "lucide-react"
import { useFlags } from "@/lib/queries/flags"
import { useBuddyPunchAlerts, useUpdateBuddyPunchAlert, type AlertStatus } from "@/lib/queries/face-recognition"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FlagIssueType, FlagRow } from "@/lib/types/flags"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { BuddyPunchAlertCard } from "../../../../components/dashboard/BuddyPunchAlertCard"

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

function getDateRange(view: TimesheetView, selectedDate: Date, customStart: string, customEnd: string, useCustomRange: boolean) {
  if (useCustomRange && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd }
  }
  switch (view) {
    case "day":
      return { startDate: format(selectedDate, "yyyy-MM-dd"), endDate: format(selectedDate, "yyyy-MM-dd") }
    case "week":
      return { startDate: format(startOfISOWeek(selectedDate), "yyyy-MM-dd"), endDate: format(endOfISOWeek(selectedDate), "yyyy-MM-dd") }
    case "month":
      return { startDate: format(startOfMonth(selectedDate), "yyyy-MM-dd"), endDate: format(endOfMonth(selectedDate), "yyyy-MM-dd") }
  }
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

  // Date navigation state
  const [view, setView] = useState<TimesheetView>("week")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  useEffect(() => { setIsClient(true) }, [])

  const columns = getColumns()

  const { startDate, endDate } = useMemo(
    () => getDateRange(view, selectedDate, customStartDate, customEndDate, useCustomRange),
    [view, selectedDate, customStartDate, customEndDate, useCustomRange]
  )

  // Reset pagination when date range changes
  useEffect(() => { setPageIndex(0) }, [startDate, endDate])

  const flagsQuery = useFlags({
    limit: pageSize,
    offset: pageIndex * pageSize,
    filter: filter || undefined,
    sortBy: sortBy || undefined,
    order: sortOrder,
    startDate,
    endDate,
  })

  const buddyPunchAlertsQuery = useBuddyPunchAlerts({
    status: buddyPunchStatus === "all" ? undefined : buddyPunchStatus,
    startDate,
    endDate,
  })
  const updateAlert = useUpdateBuddyPunchAlert()

  const items = flagsQuery.data?.items ?? []
  const totalCount = flagsQuery.data?.total ?? 0
  const loading = flagsQuery.isLoading
  const error = flagsQuery.error?.message ?? null

  const alerts = buddyPunchAlertsQuery.data?.alerts ?? []
  const alertsCount = buddyPunchAlertsQuery.isLoading ? 0 : alerts.length

  const handleToday = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    setUseCustomRange(!!(start && end))
  }

  const handleViewChange = (v: TimesheetView) => {
    setView(v)
    setUseCustomRange(false)
    setCustomStartDate("")
    setCustomEndDate("")
    setPageIndex(0)
  }

  const titleDate = useCustomRange && customStartDate
    ? `${format(new Date(customStartDate), "MMMM yyyy")}`
    : format(selectedDate, "MMMM yyyy")

  const handleReview = (alertId: string, status: AlertStatus, notes?: string) => {
    updateAlert.mutate({ id: alertId, status, notes })
  }

  return (
    <div className="space-y-4 p-4 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Flagged Punches & Alerts</h1>
        <p className="text-muted-foreground">Review missing data and buddy punch alerts</p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <UnifiedCalendarTopbar
            onToday={handleToday}
            title={titleDate}
            nav={
              <TimesheetDateNavigator
                view={view}
                selectedDate={selectedDate}
                onDateChange={(date) => {
                  setSelectedDate(date)
                  setUseCustomRange(false)
                  setCustomStartDate("")
                  setCustomEndDate("")
                  setPageIndex(0)
                }}
                rangeValue={
                  view === "day"
                    ? { startDate: useCustomRange ? customStartDate : format(selectedDate, "yyyy-MM-dd"), endDate: useCustomRange ? customEndDate : format(selectedDate, "yyyy-MM-dd") }
                    : undefined
                }
                onRangeChange={view === "day" ? handleCustomRangeChange : undefined}
              />
            }
            viewSwitcher={
              <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
                {([
                  { k: "day" as const, l: "Day", Icon: AlignJustify },
                  { k: "week" as const, l: "Week", Icon: Columns },
                  { k: "month" as const, l: "Month", Icon: LayoutGrid },
                ] as { k: TimesheetView; l: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[]).map(({ k, l, Icon }) => {
                  const active = view === k
                  return (
                    <button
                      key={k}
                      onClick={() => handleViewChange(k)}
                      title={l}
                      className={[
                        "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
                        active
                          ? "w-[76px] bg-background font-semibold text-foreground shadow-sm"
                          : "w-8 bg-transparent font-normal text-muted-foreground",
                      ].join(" ")}
                      type="button"
                    >
                      <Icon size={14} className="shrink-0" />
                      <span
                        className={[
                          "overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out",
                          active ? "max-w-[44px] opacity-100" : "max-w-0 opacity-0",
                        ].join(" ")}
                      >
                        {l}
                      </span>
                    </button>
                  )
                })}
              </div>
            }
          />
        </CardHeader>

        <CardContent className="pt-4">
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
              <div className="flex flex-wrap items-end gap-4">
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
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
              {!isClient ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
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
                  emptyMessage="No flagged punches for the selected period."
                />
              )}
            </TabsContent>

            <TabsContent value="buddy-punch" className="space-y-4 mt-4">
              <div className="flex flex-wrap items-end gap-4">
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
              </div>

              {!isClient || buddyPunchAlertsQuery.isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {buddyPunchStatus === "pending"
                    ? "No pending buddy punch alerts"
                    : `No ${buddyPunchStatus === "all" ? "" : buddyPunchStatus.replace("_", " ")} alerts found`}
                </div>
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
        </CardContent>
      </Card>
    </div>
  )
}

export default FlagPage
