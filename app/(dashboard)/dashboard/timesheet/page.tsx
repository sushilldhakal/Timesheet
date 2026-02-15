"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import type { VisibilityState } from "@tanstack/react-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ServerDataTable } from "@/components/ui/data-table"
import { FileDown, Printer } from "lucide-react"
import Link from "next/link"

interface DashboardTimesheetRow {
  date: string
  employeeId: string
  name: string
  pin: string
  comment: string
  employer: string
  role: string
  location: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
}

interface Category {
  id: string
  name: string
  type: string
}

interface EmployeeOption {
  id: string
  name: string
  pin: string
  employer: string[]
  location: string[]
}

function getDefaultWeek() {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

function buildTimesheetUrl(params: {
  startDate: string
  endDate: string
  employeeId?: string
  employer?: string
  location?: string
  limit: number
  offset: number
  sortBy?: string
  order?: "asc" | "desc"
}) {
  const sp = new URLSearchParams()
  sp.set("startDate", params.startDate)
  sp.set("endDate", params.endDate)
  sp.set("limit", String(params.limit))
  sp.set("offset", String(params.offset))
  if (params.employeeId) sp.set("employeeId", params.employeeId)
  if (params.employer) sp.set("employer", params.employer)
  if (params.location) sp.set("location", params.location)
  if (params.sortBy) sp.set("sortBy", params.sortBy)
  if (params.order) sp.set("order", params.order)
  return `/api/timesheets?${sp.toString()}`
}

function escapeCsvCell(value: string): string {
  const s = String(value ?? "")
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Show only time (e.g. "7:45 AM") from full date-time strings. */
function formatTimeOnly(value: string): string {
  if (!value || typeof value !== "string") return "—"
  const s = value.trim()
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(\s*[AaPp][Mm])?$/i)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = colonMatch[2]
    const ampm = colonMatch[4]?.trim() ? colonMatch[4].trim().toUpperCase() : (h >= 12 ? "PM" : "AM")
    const h12 = h % 12 || 12
    return `${h12}:${m} ${ampm}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
  }
  return s || "—"
}

const TIMESHEET_COLUMN_IDS = [
  "date",
  "name",
  "comment",
  "employer",
  "role",
  "location",
  "clockIn",
  "breakIn",
  "breakOut",
  "clockOut",
  "breakHours",
  "totalHours",
] as const

function getTimesheetColumns(): ColumnDef<DashboardTimesheetRow>[] {
  return [
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      enableSorting: true,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => (
        <Link href={`/dashboard/employees/${row.original.employeeId}`}>
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "comment",
      accessorKey: "comment",
      header: "Comment",
      enableHiding: true,
      cell: ({ row }) => (
        <span className="max-w-[120px] truncate block" title={row.original.comment}>
          {row.original.comment}
        </span>
      ),
    },
    {
      id: "employer",
      accessorKey: "employer",
      header: "Employer",
      enableHiding: true,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      enableHiding: true,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      enableHiding: true,
    },
    {
      id: "clockIn",
      accessorKey: "clockIn",
      header: "Clock In",
      enableHiding: true,
      cell: ({ row }) => formatTimeOnly(row.original.clockIn),
    },
    {
      id: "breakIn",
      accessorKey: "breakIn",
      header: "Break In",
      enableHiding: true,
      cell: ({ row }) => formatTimeOnly(row.original.breakIn),
    },
    {
      id: "breakOut",
      accessorKey: "breakOut",
      header: "End Break",
      enableHiding: true,
      cell: ({ row }) => formatTimeOnly(row.original.breakOut),
    },
    {
      id: "clockOut",
      accessorKey: "clockOut",
      header: "Clock Out",
      enableHiding: true,
      cell: ({ row }) => formatTimeOnly(row.original.clockOut),
    },
    {
      id: "breakHours",
      accessorKey: "breakHours",
      header: "Total Break",
      enableHiding: true,
    },
    {
      id: "totalHours",
      accessorKey: "totalHours",
      header: "Total Hours",
      enableHiding: true,
    },
  ]
}

export default function TimesheetPage() {
  const { startDate: defaultStart, endDate: defaultEnd } = getDefaultWeek()
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [employer, setEmployer] = useState<string>("")
  const [location, setLocation] = useState<string>("")
  const [employeeId, setEmployeeId] = useState<string>("")
  const [employers, setEmployers] = useState<Category[]>([])
  const [locations, setLocations] = useState<Category[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [timesheets, setTimesheets] = useState<DashboardTimesheetRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalWorkingHours, setTotalWorkingHours] = useState("—")
  const [totalBreakHours, setTotalBreakHours] = useState("—")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string | null>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    comment: false,
    employer: false,
    role: false,
    location: false,
  })
  const [searchValue, setSearchValue] = useState("")

  const columns = useMemo(() => getTimesheetColumns(), [])

  const fetchFilters = useCallback(async () => {
    try {
      const [employerRes, locationRes, empRes] = await Promise.all([
        fetch("/api/categories?type=employer"),
        fetch("/api/categories?type=location"),
        fetch("/api/employees?limit=500"),
      ])
      if (employerRes.ok) {
        const data = await employerRes.json()
        setEmployers(data.categories ?? [])
      }
      if (locationRes.ok) {
        const data = await locationRes.json()
        setLocations(data.categories ?? [])
      }
      if (empRes.ok) {
        const data = await empRes.json()
        const arr = (v: unknown) => (Array.isArray(v) ? v : v != null ? [String(v)] : []) as string[]
        setEmployees(
          (data.employees ?? []).map(
            (e: {
              _id: string
              id?: string
              name: string
              pin: string
              employer?: unknown
              location?: unknown
              hire?: string
              site?: string
            }) => ({
              id: e.id ?? e._id,
              name: e.name ?? "",
              pin: e.pin ?? "",
              employer: arr(e.employer).length ? arr(e.employer) : e.hire ? [e.hire] : [],
              location: arr(e.location).length ? arr(e.location) : e.site ? [e.site] : [],
            })
          )
        )
      }
    } catch {
      setError("Failed to load filters")
    }
  }, [])

  const filteredEmployees = useMemo(() => {
    if (!employer && !location) return employees
    return employees.filter((e) => {
      const matchEmployer = !employer || e.employer.some((x) => x === employer)
      const matchLocation = !location || e.location.some((x) => x === location)
      return matchEmployer && matchLocation
    })
  }, [employees, employer, location])

  const fetchTimesheets = useCallback(async () => {
    setLoading(true)
    setError(null)
    const offset = pageIndex * pageSize
    try {
      const url = buildTimesheetUrl({
        startDate,
        endDate,
        employeeId: employeeId || undefined,
        employer: employer || undefined,
        location: location || undefined,
        limit: pageSize,
        offset,
        sortBy: sortBy ?? undefined,
        order: sortOrder,
      })
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to load timesheets")
      }
      const data = await res.json()
      setTimesheets(data.timesheets ?? [])
      setTotalCount(data.total ?? 0)
      setTotalWorkingHours(data.totalWorkingHours ?? "—")
      setTotalBreakHours(data.totalBreakHours ?? "—")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timesheets")
      setTimesheets([])
      setTotalCount(0)
      setTotalWorkingHours("—")
      setTotalBreakHours("—")
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, employeeId, employer, location, pageIndex, pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  useEffect(() => {
    if (employeeId && filteredEmployees.length > 0 && !filteredEmployees.some((e) => e.id === employeeId)) {
      setEmployeeId("")
    }
  }, [employeeId, filteredEmployees])

  const exportCsv = useCallback(() => {
    const visibleIds = TIMESHEET_COLUMN_IDS.filter((id) => columnVisibility[id] !== false)
    const colDefs = getTimesheetColumns()
    const headers = visibleIds.map((id) => {
      const col = colDefs.find((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) === id)
      return typeof col?.header === "string" ? col.header : id
    })
    const rows = timesheets.map((r) => {
      const row: string[] = []
      visibleIds.forEach((id) => {
        const key = id as keyof DashboardTimesheetRow
        let val = r[key]
        if (key === "clockIn" || key === "breakIn" || key === "breakOut" || key === "clockOut") {
          val = formatTimeOnly(String(val ?? "")) as unknown as string
        }
        row.push(String(val ?? ""))
      })
      return row
    })
    const n = headers.length
    const totalsLabelRow = ["Totals", ...Array(n - 3).fill(""), "Total Break", "Total Hours"].map(escapeCsvCell).join(",")
    const totalsValueRow = [...Array(n - 2).fill(""), totalBreakHours, totalWorkingHours].map(escapeCsvCell).join(",")
    const csvContent = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((row) => row.map(escapeCsvCell).join(",")),
      "",
      totalsLabelRow,
      totalsValueRow,
    ].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `timesheet-${startDate}-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [timesheets, totalBreakHours, totalWorkingHours, startDate, endDate, columnVisibility])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-xl font-semibold">Timesheet</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || timesheets.length === 0}>
            <FileDown className="size-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground block text-xs font-medium">Date range</label>
            <DateRangePicker
              value={{ startDate, endDate }}
              onChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
              placeholder="Select date range"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground block text-xs font-medium">Employer</label>
            <Select value={employer || "all"} onValueChange={(v) => setEmployer(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All employers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employers</SelectItem>
                {employers.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground block text-xs font-medium">Location</label>
            <Select value={location || "all"} onValueChange={(v) => setLocation(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground block text-xs font-medium">Employee</label>
            <Select value={employeeId || "all"} onValueChange={(v) => setEmployeeId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.pin})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => setPageIndex(0)} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="hidden print:block">
          <CardTitle className="text-sm">Timesheet {startDate} – {endDate}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="text-destructive px-4 py-2 text-sm">{error}</p>
          )}
          <ServerDataTable<DashboardTimesheetRow, unknown>
            columns={columns}
            data={timesheets}
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
            pageSizeOptions={[50, 100, 200]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(columnId, order) => {
              setSortBy(columnId)
              setSortOrder(order)
              setPageIndex(0)
            }}
            sortableColumnIds={[
              "date", "name", "comment", "employer", "role", "location",
              "clockIn", "breakIn", "breakOut", "clockOut", "breakHours", "totalHours",
            ]}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={(updater) =>
              setColumnVisibility((prev) => (typeof updater === "function" ? updater(prev) : updater))
            }
            getRowId={(row) => `${row.pin}-${row.date}`}
            emptyMessage="No timesheet entries for the selected filters."
          />
          {!loading && totalCount > 0 && (
            <div className="flex gap-6 px-4 py-2 text-sm border-t bg-muted/30">
              <span>
                <strong>Total Break (all):</strong> {totalBreakHours}
              </span>
              <span>
                <strong>Total Hours (all):</strong> {totalWorkingHours}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
