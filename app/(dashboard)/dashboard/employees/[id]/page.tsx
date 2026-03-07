"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parse, isValid } from "date-fns"
import { enUS } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, MapPin, ChevronRight, ChevronDown } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { ColumnDef, type ExpandedState } from "@tanstack/react-table"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { EditEmployeeDialog } from "../EditEmployeeDialog"
import { EditTimesheetDialog } from "./EditTimesheetDialog"
import EmployeeProfileCard from "@/components/employees/employee-profile-card"
import type { Employee } from "@/lib/api/employees"
import AwardHistoryCard from "@/components/employees/award-history-card"
import EmployeeRoleAssignmentList from "@/components/employees/EmployeeRoleAssignmentList"
import { EmployeeRoleAssignmentDialog } from "@/components/employees/EmployeeRoleAssignmentDialog"
import { formatDateLong as formatDateLongUtil } from "@/lib/utils/date-format"
import { useEmployee, useEmployeeTimesheet } from "@/lib/queries/employees"

interface DailyTimesheetRow {
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakMinutes: number
  breakHours: string
  totalMinutes: number
  totalHours: string
  clockInImage?: string
  clockInWhere?: string
  clockInLocation?: string
  breakInImage?: string
  breakInWhere?: string
  breakInLocation?: string
  breakOutImage?: string
  breakOutWhere?: string
  breakOutLocation?: string
  clockOutImage?: string
  clockOutWhere?: string
  clockOutLocation?: string
  /** "insert" = manually added (red). "update" = from punch or edited (green). */
  clockInSource?: "insert" | "update"
  breakInSource?: "insert" | "update"
  breakOutSource?: "insert" | "update"
  clockOutSource?: "insert" | "update"
}

/** Auth-protected link for Cloudinary images (proxied via /api/image). */
function getImageLinkHref(url: string): string {
  if (url.includes("res.cloudinary.com")) {
    return `/api/image?url=${encodeURIComponent(url)}`
  }
  return url
}

/** Single column: image on top, location link directly below. Aligns with Clock In / Break In / Break Out / Clock Out columns. */
function PunchPhotoAndLocation({
  imageUrl,
  where,
  locationName,
}: {
  imageUrl?: string
  where?: string
  locationName?: string
}) {
  const mapsUrl = where ? `https://www.google.com/maps?q=${where}` : null
  const imageLinkHref = imageUrl ? getImageLinkHref(imageUrl) : null
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {imageUrl ? (
        <a
          href={imageLinkHref ?? imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block w-16 h-16 rounded overflow-hidden border border-border hover:opacity-90 shrink-0"
        >
          <OptimizedImage src={imageUrl} alt="" fill className="object-cover" sizes="64px" />
        </a>
      ) : (
        <div className="w-16 h-16 rounded border border-dashed border-muted flex items-center justify-center shrink-0">
          <span className="text-muted-foreground text-xs">—</span>
        </div>
      )}
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all text-center"
        >
          <MapPin className="h-3 w-3 shrink-0" />
          {locationName || "Location"}
        </a>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      )}
    </div>
  )
}

/** Expanded row: one cell per column so image+location align under Clock In, Break In, Break Out, Clock Out. Columns: [expand, date, clockIn, breakIn, breakOut, clockOut, breakHours, totalHours, actions]. */
function renderExpandedRowCells(row: DailyTimesheetRow): React.ReactNode[] {
  const empty = null
  return [
    empty,
    empty,
    <div key="ci" className="flex justify-center"><PunchPhotoAndLocation imageUrl={row.clockInImage} where={row.clockInWhere} locationName={row.clockInLocation} /></div>,
    <div key="bi" className="flex justify-center"><PunchPhotoAndLocation imageUrl={row.breakInImage} where={row.breakInWhere} locationName={row.breakInLocation} /></div>,
    <div key="bo" className="flex justify-center"><PunchPhotoAndLocation imageUrl={row.breakOutImage} where={row.breakOutWhere} locationName={row.breakOutLocation} /></div>,
    <div key="co" className="flex justify-center"><PunchPhotoAndLocation imageUrl={row.clockOutImage} where={row.clockOutWhere} locationName={row.clockOutLocation} /></div>,
    empty,
    empty,
    empty,
  ]
}

/** Parse date "31-12-2025" (dd-MM-yyyy) or "2025-12-31" (yyyy-MM-dd) or ISO format. */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null
  const s = dateStr.trim()
  try {
    // Try ISO format first (most common from API)
    const isoDate = new Date(s)
    if (isValid(isoDate)) return isoDate
    
    // Try dd-MM-yyyy format
    const d1 = parse(s, "dd-MM-yyyy", new Date(), { locale: enUS })
    if (isValid(d1)) return d1
    
    // Try yyyy-MM-dd format
    const d2 = parse(s, "yyyy-MM-dd", new Date(), { locale: enUS })
    return isValid(d2) ? d2 : null
  } catch {
    return null
  }
}

/** Format date as "Fri 27th Feb 2026" using the utility function. */
function formatDateLong(dateStr: string): string {
  if (!dateStr) return "—"
  // Use the utility function which handles all date formats
  const formatted = formatDateLongUtil(dateStr)
  return formatted || dateStr || "—"
}

/**
 * Extract time as "1:57 PM" from either:
 * - Old format: "Wednesday, December 31, 2025 1:57 PM"
 * - New format: "08:25" or "08:25:00"
 */
function formatTimeDisplay(t?: string): string {
  if (!t || typeof t !== "string" || !t.trim()) return "—"
  const s = t.trim()
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    if (h === 0 && m === 0) return "—"
    const date = new Date(2000, 0, 1, h, m)
    return format(date, "h:mm a", { locale: enUS })
  }
  const d = new Date(s)
  if (!isValid(d)) return "—"
  return format(d, "h:mm a", { locale: enUS })
}

/** Red = manually added (no punch). Green = from punch or edited. */
function TimeCell({ time, source }: { time: string; source?: "insert" | "update" }) {
  const text = formatTimeDisplay(time)
  if (text === "—") return <span className="tabular-nums text-muted-foreground">—</span>
  const className =
    source === "insert"
      ? "tabular-nums text-destructive font-medium"
      : source === "update"
        ? "tabular-nums text-emerald-600 dark:text-emerald-400 font-medium"
        : "tabular-nums"
  return <span className={className}>{text}</span>
}

function formatBreakHours(s: string): string {
  if (!s) return "—"
  if (s === "—") return "—"
  const m = s.match(/(\d+)h\s*(\d*)m?/)
  if (!m) return s
  const h = parseInt(m[1] || "0", 10)
  const min = parseInt(m[2] || "0", 10)
  if (h === 0 && min === 0) return "—"
  if (min === 0) return h === 1 ? "1 hr" : `${h} hrs`
  return `${h}h ${min}m`
}

function formatTotalHours(s: string): string {
  if (!s) return "—"
  if (s === "—") return "—"
  const m = s.match(/(\d+)h\s*(\d*)m?/)
  if (!m) return s
  const h = parseInt(m[1] || "0", 10)
  const min = parseInt(m[2] || "0", 10)
  if (min === 0) return h === 1 ? "1 hr" : `${h} hrs`
  return `${h} hrs ${min}m`
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [employee, setEmployee] = useState<any>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [awardId, setAwardId] = useState<string | null>(null)
  const [awardLevel, setAwardLevel] = useState<string | null>(null)
  const [employmentType, setEmploymentType] = useState<string | null>(null)
  const [timesheets, setTimesheets] = useState<DailyTimesheetRow[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [editTimesheetRow, setEditTimesheetRow] = useState<DailyTimesheetRow | null>(null)
  const [roleAssignmentDialogOpen, setRoleAssignmentDialogOpen] = useState(false)
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const debouncedSearch = useDebounce(search, 300)

  const employeeQuery = useEmployee(id)

  const timesheetParams = new URLSearchParams({
    limit: String(pageSize >= 99999 ? 500 : pageSize),
    offset: String(pageIndex * (pageSize >= 99999 ? 500 : pageSize)),
    sortBy: "date",
    order: "desc",
  })
  if (debouncedSearch) timesheetParams.set("search", debouncedSearch)

  const timesheetQuery = useEmployeeTimesheet(id, timesheetParams)

  const loading = employeeQuery.isLoading
  const tsLoading = timesheetQuery.isLoading

  // Hydration check
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (employeeQuery.data?.employee) {
      const e = employeeQuery.data.employee
      setEmployee({
        id: e.id,
        name: e.name ?? "",
        pin: e.pin ?? "",
        roles: e.roles ?? [],
        employers: e.employers ?? [],
        locations: e.locations ?? [],
        hire: (e as any).hire ?? "",
        site: (e as any).site ?? "",
        email: e.email ?? "",
        phone: e.phone ?? "",
        dob: e.dob ?? "",
        comment: e.comment ?? "",
        img: e.img ?? "",
      })
      // Set award fields from the award object
      setAwardId((e as any).award?.id ?? null)
      setAwardLevel((e as any).award?.level ?? null)
      setEmploymentType((e as any).employmentType ?? null)
    } else if (employeeQuery.error) {
      setEmployee(null)
    }
  }, [employeeQuery.data, employeeQuery.error])

  useEffect(() => {
    if (timesheetQuery.data) {
      console.log('✅ Timesheets fetched:', {
        count: timesheetQuery.data.timesheets?.length || 0,
      })
      setTimesheets(timesheetQuery.data.timesheets as any ?? [])
      setTotal(timesheetQuery.data.timesheets?.length ?? 0)
    } else if (timesheetQuery.error) {
      console.error('❌ Failed to fetch timesheets:', timesheetQuery.error)
      setTimesheets([])
      setTotal(0)
    }
  }, [timesheetQuery.data, timesheetQuery.error])

  const refetchEmployee = () => {
    employeeQuery.refetch()
  }

  const refetchTimesheets = () => {
    timesheetQuery.refetch()
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Loading employee...</p>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        <p className="text-muted-foreground">Employee not found</p>
        <Button onClick={() => router.push("/dashboard/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    )
  }

  const columns: ColumnDef<DailyTimesheetRow>[] = [
    {
      id: "expander",
      header: "",
      cell: ({ row }) => {
        const hasImages = !!(
          row.original.clockInImage ||
          row.original.breakInImage ||
          row.original.breakOutImage ||
          row.original.clockOutImage
        )
        if (!hasImages) return null
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => row.toggleExpanded()}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )
      },
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDateLong(row.original.date),
      enableSorting: true,
      size: 140,
    },
    {
      accessorKey: "clockIn",
      header: "Clock In",
      cell: ({ row }) => (
        <TimeCell time={row.original.clockIn} source={row.original.clockInSource} />
      ),
      enableSorting: true,
      size: 90,
    },
    {
      accessorKey: "breakIn",
      header: "Break In",
      cell: ({ row }) => (
        <TimeCell time={row.original.breakIn} source={row.original.breakInSource} />
      ),
      enableSorting: true,
      size: 90,
    },
    {
      accessorKey: "breakOut",
      header: "Break Out",
      cell: ({ row }) => (
        <TimeCell time={row.original.breakOut} source={row.original.breakOutSource} />
      ),
      enableSorting: true,
      size: 90,
    },
    {
      accessorKey: "clockOut",
      header: "Clock Out",
      cell: ({ row }) => (
        <TimeCell time={row.original.clockOut} source={row.original.clockOutSource} />
      ),
      enableSorting: true,
      size: 90,
    },
    {
      accessorKey: "breakHours",
      header: "Break",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {formatBreakHours(row.original.breakHours)}
        </span>
      ),
      enableSorting: true,
      size: 80,
    },
    {
      accessorKey: "totalHours",
      header: "Total",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">
          {formatTotalHours(row.original.totalHours)}
        </span>
      ),
      enableSorting: true,
      size: 90,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditTimesheetRow(row.original)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
      enableSorting: false,
      size: 60,
    },
  ]

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/employees")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-sm text-muted-foreground">PIN: {employee.pin}</p>
        </div>
        <Button onClick={() => setEditEmployeeOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Employee
        </Button>
      </div>

      {/* Employee Details */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {employee.img ? (
                <OptimizedImage
                  src={employee.img}
                  alt={employee.name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-lg font-medium text-muted-foreground">
                    {employee.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium">{employee.name}</p>
                <p className="text-sm text-muted-foreground">PIN: {employee.pin}</p>
              </div>
            </div>
            {employee.email && (
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              </div>
            )}
            {employee.phone && (
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{employee.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <EmployeeRoleAssignmentList
          employeeId={employee.id}
        />

        <EmployeeProfileCard
          employeeId={employee.id}
          employee={employee}
          onUpdate={refetchEmployee}
          onEditEmployee={() => {}}
        />
      </div>

      <AwardHistoryCard employeeId={employee.id} />

      {/* Timesheet */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet</CardTitle>
          <CardDescription>
            Daily punch records and hours worked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            mode="server"
            columns={columns}
            data={timesheets}
            totalCount={total}
            loading={tsLoading}
            searchValue={search}
            onSearchChange={setSearch}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPageIndex(0)
            }}
            pageSizeOptions={[20, 50, 100, 500]}
            getRowId={(row) => row.date}
            emptyMessage="No timesheet entries found."
            getRowCanExpand={(row: any) => !!(
              row.original.clockInImage ||
              row.original.breakInImage ||
              row.original.breakOutImage ||
              row.original.clockOutImage
            )}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditEmployeeDialog
        employee={employee}
        open={editEmployeeOpen}
        onOpenChange={setEditEmployeeOpen}
        onSuccess={refetchEmployee}
      />

      {editTimesheetRow && (
        <EditTimesheetDialog
          employeeId={employee.id}
          timesheet={editTimesheetRow}
          open={!!editTimesheetRow}
          onOpenChange={(open) => !open && setEditTimesheetRow(null)}
          onSuccess={refetchTimesheets}
        />
      )}

      <EmployeeRoleAssignmentDialog
        employeeId={employee.id}
        employeeName={employee?.name || "Employee"}
        open={roleAssignmentDialogOpen}
        onOpenChange={setRoleAssignmentDialogOpen}
        onSuccess={refetchEmployee}
      />
    </div>
  )
}

export default EmployeeDetailPage
