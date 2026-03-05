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
import type { EmployeeRow } from "../page"
import AwardHistoryCard from "@/components/employees/award-history-card"
import EmployeeRoleAssignmentList from "@/components/employees/EmployeeRoleAssignmentList"
import { EmployeeRoleAssignmentDialog } from "@/components/employees/EmployeeRoleAssignmentDialog"
import { formatDateLong as formatDateLongUtil } from "@/lib/utils/date-format"

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

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [employee, setEmployee] = useState<EmployeeRow | null>(null)
  const [awardId, setAwardId] = useState<string | null>(null)
  const [awardLevel, setAwardLevel] = useState<string | null>(null)
  const [employmentType, setEmploymentType] = useState<string | null>(null)
  const [timesheets, setTimesheets] = useState<DailyTimesheetRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tsLoading, setTsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [editTimesheetRow, setEditTimesheetRow] = useState<DailyTimesheetRow | null>(null)
  const [roleAssignmentDialogOpen, setRoleAssignmentDialogOpen] = useState(false)
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const debouncedSearch = useDebounce(search, 300)

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees/${id}`)
      if (res.ok) {
        const data = await res.json()
        const e = data.employee
        setEmployee({
          id: e.id,
          name: e.name ?? "",
          pin: e.pin ?? "",
          roles: e.roles ?? [],
          employers: e.employers ?? [],
          locations: e.locations ?? [],
          hire: e.hire ?? "",
          site: e.site ?? "",
          email: e.email ?? "",
          phone: e.phone ?? "",
          dob: e.dob ?? "",
          comment: e.comment ?? "",
          img: e.img ?? "",
        })
        // Set award fields from the award object
        setAwardId(e.award?.id ?? null)
        setAwardLevel(e.award?.level ?? null)
        setEmploymentType(e.employmentType ?? null)
      } else {
        setEmployee(null)
      }
    } catch {
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchTimesheets = useCallback(async () => {
    setTsLoading(true)
    try {
      const limit = pageSize >= 99999 ? 500 : pageSize
      const offset = pageIndex * (pageSize >= 99999 ? 500 : pageSize)
      const sp = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        sortBy: "date", // Always fetch by date from server
        order: "desc",  // Always fetch newest first
      })
      if (debouncedSearch) sp.set("search", debouncedSearch)
      
      console.log('📡 Fetching timesheets (client-side sorting enabled)')
      
      const res = await fetch(`/api/employees/${id}/timesheet?${sp}`)
      if (res.ok) {
        const data = await res.json()
        console.log('✅ Timesheets fetched:', {
          count: data.data?.length || 0,
          total: data.pagination?.total || 0,
        })
        setTimesheets(data.data ?? [])
        setTotal(data.pagination?.total ?? 0)
      } else {
        console.error('❌ Failed to fetch timesheets:', res.status)
        setTimesheets([])
        setTotal(0)
      }
    } catch (err) {
      console.error('❌ Error fetching timesheets:', err)
      setTimesheets([])
      setTotal(0)
    } finally {
      setTsLoading(false)
    }
  }, [id, debouncedSearch, pageIndex, pageSize])

  useEffect(() => {
    fetchEmployee()
  }, [fetchEmployee])

  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch])

  const tsColumns: ColumnDef<DailyTimesheetRow>[] = [
    {
      id: "expand",
      header: () => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation()
            const isRecord = expanded && typeof expanded === "object" && !Array.isArray(expanded)
            const keys = isRecord ? Object.keys(expanded) : []
            const allExpanded = timesheets.length > 0 && keys.length >= timesheets.length
            if (allExpanded) setExpanded({})
            else setExpanded(timesheets.reduce<Record<string, boolean>>((acc, r) => ({ ...acc, [r.date]: true }), {}))
          }}
        >
          {(() => {
            const isRecord = expanded && typeof expanded === "object" && !Array.isArray(expanded)
            const keys = isRecord ? Object.keys(expanded) : []
            return keys.length >= timesheets.length && timesheets.length > 0 ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          })()}
        </Button>
      ),
      cell: ({ row }) =>
        row.original.clockInImage ||
        row.original.clockInWhere ||
        row.original.breakInImage ||
        row.original.breakInWhere ||
        row.original.breakOutImage ||
        row.original.breakOutWhere ||
        row.original.clockOutImage ||
        row.original.clockOutWhere ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              const id = row.original.date
              const isRecord = expanded && typeof expanded === "object" && !Array.isArray(expanded)
              const prev = isRecord ? expanded : {}
              setExpanded({ ...prev, [id]: !(prev as Record<string, boolean>)[id] })
            }}
          >
            {(() => {
              const isRecord = expanded && typeof expanded === "object" && !Array.isArray(expanded)
              const isExpanded = isRecord && (expanded as Record<string, boolean>)[row.original.date]
              return isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            })()}
          </Button>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDateLong(row.original.date),
      sortingFn: (rowA, rowB) => {
        const dateA = parseDate(rowA.original.date)
        const dateB = parseDate(rowB.original.date)
        if (!dateA || !dateB) return 0
        return dateA.getTime() - dateB.getTime()
      },
    },
    {
      accessorKey: "clockIn",
      header: "Clock In",
      cell: ({ row }) => <TimeCell time={row.original.clockIn} source={row.original.clockInSource} />,
      enableSorting: false,
    },
    {
      accessorKey: "breakIn",
      header: "Break In",
      cell: ({ row }) => <TimeCell time={row.original.breakIn} source={row.original.breakInSource} />,
      enableSorting: false,
    },
    {
      accessorKey: "breakOut",
      header: "Break Out",
      cell: ({ row }) => <TimeCell time={row.original.breakOut} source={row.original.breakOutSource} />,
      enableSorting: false,
    },
    {
      accessorKey: "clockOut",
      header: "Clock Out",
      cell: ({ row }) => <TimeCell time={row.original.clockOut} source={row.original.clockOutSource} />,
      enableSorting: false,
    },
    {
      accessorKey: "breakHours",
      header: "Break Hours",
      cell: ({ row }) => formatBreakHours(row.original.breakHours),
      sortingFn: (rowA, rowB) => {
        return rowA.original.breakMinutes - rowB.original.breakMinutes
      },
    },
    {
      accessorKey: "totalHours",
      header: "Total Hours",
      cell: ({ row }) => formatTotalHours(row.original.totalHours),
      sortingFn: (rowA, rowB) => {
        return rowA.original.totalMinutes - rowB.original.totalMinutes
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setEditTimesheetRow(row.original)
          }}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Loading employee...</p>
      </div>
    )
  }

  if (!employee) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
          <CardDescription>Employee not found.</CardDescription>
          <Button variant="outline" onClick={() => router.push("/dashboard/employees")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/employees")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Employee Details</h1>
      </div>

      <EmployeeProfileCard
        employeeId={id}
        employee={employee}
        currentAwardId={awardId}
        currentAwardLevel={awardLevel}
        currentEmploymentType={employmentType}
        onUpdate={fetchEmployee}
        onEditEmployee={() => setEditEmployeeOpen(true)}
      />

      <EmployeeRoleAssignmentList
        employeeId={id}
        onAdd={() => setRoleAssignmentDialogOpen(true)}
      />

      {awardId && (
        <AwardHistoryCard employeeId={id} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timesheet</CardTitle>
          <CardDescription>
            Daily clock in, break, and clock out. Break/total hours are calculated automatically.{" "}
            <span className="text-destructive font-medium">Red</span> = time added manually (no punch);{" "}
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Green</span> = edited by admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            mode="server"
            columns={tsColumns}
            data={timesheets}
            totalCount={total}
            loading={tsLoading}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by date..."
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPageIndex(0)
            }}
            getRowId={(row) => row.date}
            emptyMessage="No timesheet entries yet."
            expanded={expanded}
            onExpandedChange={setExpanded}
            getRowCanExpand={(row) =>
              !!(row.clockInImage || row.clockInWhere || row.breakInImage || row.breakInWhere || row.breakOutImage || row.breakOutWhere || row.clockOutImage || row.clockOutWhere)
            }
            renderExpandedRow={(row) => renderExpandedRowCells(row)}
          />
        </CardContent>
      </Card>

      {employee && (
        <EditEmployeeDialog
          employee={employee}
          open={editEmployeeOpen}
          onOpenChange={setEditEmployeeOpen}
          onSuccess={() => {
            fetchEmployee()
          }}
        />
      )}

      {editTimesheetRow && (
        <EditTimesheetDialog
          employeeId={id}
          row={editTimesheetRow}
          open={!!editTimesheetRow}
          onOpenChange={(open) => !open && setEditTimesheetRow(null)}
          onSuccess={() => {
            setEditTimesheetRow(null)
            fetchTimesheets()
          }}
        />
      )}

      {employee && (
        <EmployeeRoleAssignmentDialog
          open={roleAssignmentDialogOpen}
          onOpenChange={setRoleAssignmentDialogOpen}
          employeeId={id}
          employeeName={employee.name}
          onSuccess={() => {
            // The EmployeeRoleAssignmentList component will automatically refresh
            // when the dialog closes successfully
          }}
        />
      )}
    </div>
  )
}
