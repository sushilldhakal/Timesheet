"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parse, isValid } from "date-fns"
import { enUS } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, MapPin, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from "lucide-react"
import { UserCircle } from "lucide-react"
import { ServerDataTable } from "@/components/ui/data-table"
import { ColumnDef, type ExpandedState } from "@tanstack/react-table"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { EditEmployeeDialog } from "../EditEmployeeDialog"
import { EditTimesheetDialog } from "./EditTimesheetDialog"
import type { EmployeeRow } from "../page"

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

/** Parse date "31-12-2025" (dd-MM-yyyy) or "2025-12-31" (yyyy-MM-dd). */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null
  const s = dateStr.trim()
  try {
    const d1 = parse(s, "dd-MM-yyyy", new Date(), { locale: enUS })
    if (isValid(d1)) return d1
    const d2 = parse(s, "yyyy-MM-dd", new Date(), { locale: enUS })
    return isValid(d2) ? d2 : null
  } catch {
    return null
  }
}

/** Format date as "Fri 31st December 2025". */
function formatDateLong(dateStr: string): string {
  const d = parseDate(dateStr)
  if (!d) return dateStr || "—"
  return format(d, "EEE do MMMM yyyy", { locale: enUS })
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
  const id = params.id as string
  const [employee, setEmployee] = useState<EmployeeRow | null>(null)
  const [timesheets, setTimesheets] = useState<DailyTimesheetRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tsLoading, setTsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [editTimesheetRow, setEditTimesheetRow] = useState<DailyTimesheetRow | null>(null)
  const [sortBy, setSortBy] = useState<"date" | "totalMinutes" | "breakMinutes">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const debouncedSearch = useDebounce(search, 300)

  const handleSortHeader = useCallback((key: "date" | "totalMinutes" | "breakMinutes") => {
    if (sortBy !== key) {
      setSortBy(key)
      setSortOrder("desc")
    } else {
      setSortOrder((p) => (p === "asc" ? "desc" : "asc"))
    }
  }, [sortBy])

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
          role: e.role ?? "",
          employer: e.employer ?? "",
          location: e.location ?? [],
          hire: e.hire ?? "",
          site: e.site ?? "",
          email: e.email ?? "",
          phone: e.phone ?? "",
          dob: e.dob ?? "",
          comment: e.comment ?? "",
          img: e.img ?? "",
        })
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
        sortBy: sortBy === "totalMinutes" ? "totalMinutes" : sortBy === "breakMinutes" ? "breakMinutes" : "date",
        order: sortOrder,
      })
      if (debouncedSearch) sp.set("search", debouncedSearch)
      const res = await fetch(`/api/employees/${id}/timesheet?${sp}`)
      if (res.ok) {
        const data = await res.json()
        setTimesheets(data.timesheets ?? [])
        setTotal(data.total ?? 0)
      } else {
        setTimesheets([])
        setTotal(0)
      }
    } catch {
      setTimesheets([])
      setTotal(0)
    } finally {
      setTsLoading(false)
    }
  }, [id, debouncedSearch, pageIndex, pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchEmployee()
  }, [fetchEmployee])

  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch])

  useEffect(() => {
    setPageIndex(0)
  }, [sortBy, sortOrder])

  const SortableHeader = ({
    label,
    sortKey,
  }: {
    label: string
    sortKey: "date" | "totalMinutes" | "breakMinutes"
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => handleSortHeader(sortKey)}
    >
      {label}
      {sortBy === sortKey ? (
        sortOrder === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUp className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )

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
      header: () => <SortableHeader label="Date" sortKey="date" />,
      cell: ({ row }) => formatDateLong(row.original.date),
    },
    {
      accessorKey: "clockIn",
      header: "Clock In",
      cell: ({ row }) => <TimeCell time={row.original.clockIn} source={row.original.clockInSource} />,
    },
    {
      accessorKey: "breakIn",
      header: "Break In",
      cell: ({ row }) => <TimeCell time={row.original.breakIn} source={row.original.breakInSource} />,
    },
    {
      accessorKey: "breakOut",
      header: "Break Out",
      cell: ({ row }) => <TimeCell time={row.original.breakOut} source={row.original.breakOutSource} />,
    },
    {
      accessorKey: "clockOut",
      header: "Clock Out",
      cell: ({ row }) => <TimeCell time={row.original.clockOut} source={row.original.clockOutSource} />,
    },
    {
      accessorKey: "breakHours",
      header: () => <SortableHeader label="Break Hours" sortKey="breakMinutes" />,
      cell: ({ row }) => formatBreakHours(row.original.breakHours),
    },
    {
      accessorKey: "totalHours",
      header: () => <SortableHeader label="Total Hours" sortKey="totalMinutes" />,
      cell: ({ row }) => formatTotalHours(row.original.totalHours),
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {employee.img ? (
                <OptimizedImage src={employee.img} alt={employee.name} fill className="object-cover" sizes="64px" />
              ) : (
                <UserCircle className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle>{employee.name}</CardTitle>
              <CardDescription>
                PIN: {employee.pin} • Roles: {employee.role?.length ? employee.role.join(", ") : "—"} • Employers: {employee.employer?.length ? employee.employer.join(", ") : "—"}
              </CardDescription>
              {employee.location?.length ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Locations: {employee.location.join(", ")}
                </p>
              ) : null}
              {employee.email && (
                <p className="text-sm text-muted-foreground">Email: {employee.email}</p>
              )}
              {employee.phone && (
                <p className="text-sm text-muted-foreground">Phone: {employee.phone}</p>
              )}
            </div>
          </div>
          <Button onClick={() => setEditEmployeeOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Employee
          </Button>
        </CardHeader>
      </Card>

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
          <ServerDataTable<DailyTimesheetRow, unknown>
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
    </div>
  )
}
