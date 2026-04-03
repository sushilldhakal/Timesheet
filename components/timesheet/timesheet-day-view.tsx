"use client"

import { useMemo, useState } from "react"
import { format, isValid } from "date-fns"
import type { ColumnDef, VisibilityState } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import Link from "next/link"

interface DayViewRow {
  employeeId: string
  name: string
  pin: string
  date: string
  clockIn: string
  breakIn: string
  breakOut: string
  clockOut: string
  breakHours: string
  totalHours: string
  comment: string
  employer: string
  role: string
  location: string
}

export interface TimesheetDayServerPagination {
  totalCount: number
  pageIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

interface TimesheetDayViewProps {
  data: DayViewRow[]
  selectedDate: Date
  endDate?: Date
  loading?: boolean
  /** When set, table uses server pagination (one page of rows in `data`). */
  serverPagination?: TimesheetDayServerPagination
}

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

function getDayViewColumns(showDateColumn: boolean = false): ColumnDef<DayViewRow>[] {
  const columns: ColumnDef<DayViewRow>[] = []
  
  // Add date column if showing date range
  if (showDateColumn) {
    columns.push({
      id: "date",
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      enableSorting: true,
    })
  }
  
  columns.push(
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Link href={`/dashboard/employees/${row.original.employeeId}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      enableSorting: true,
    },
    {
      id: "location",
      accessorKey: "location",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      enableSorting: true,
    },
    {
      id: "clockIn",
      accessorKey: "clockIn",
      header: "Clock In",
      cell: ({ row }) => formatTimeOnly(row.original.clockIn),
    },
    {
      id: "break",
      header: "Break",
      cell: ({ row }) => {
        const breakIn = formatTimeOnly(row.original.breakIn)
        const breakOut = formatTimeOnly(row.original.breakOut)
        if (breakIn === "—" && breakOut === "—") return "—"
        if (breakIn === "—") return `—${breakOut}`
        if (breakOut === "—") return `${breakIn}—`
        return `${breakIn}-${breakOut}`
      },
    },
    {
      id: "clockOut",
      accessorKey: "clockOut",
      header: "Clock Out",
      cell: ({ row }) => formatTimeOnly(row.original.clockOut),
    },
    {
      id: "totalHours",
      accessorKey: "totalHours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      enableSorting: true,
    },
    // Hidden columns for column visibility
    {
      id: "comment",
      accessorKey: "comment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Comment" />
      ),
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employer" />
      ),
      enableHiding: true,
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
      id: "breakHours",
      accessorKey: "breakHours",
      header: "Total Break",
      enableHiding: true,
    }
  )
  
  return columns
}

export function TimesheetDayView({ data, selectedDate, endDate, loading, serverPagination }: TimesheetDayViewProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    comment: false,
    employer: false,
    breakIn: false,
    breakOut: false,
    breakHours: false,
  })

  const safeSelectedDate = isValid(selectedDate) ? selectedDate : null
  const safeEndDate = endDate && isValid(endDate) ? endDate : undefined
  const isDateRange = !!(safeSelectedDate && safeEndDate && safeEndDate.getTime() !== safeSelectedDate.getTime())
  const columns = useMemo(() => getDayViewColumns(isDateRange), [isDateRange])

  const totalHours = useMemo(() => {
    return data.reduce((total, row) => {
      const hours = row.totalHours
      if (hours && hours !== "—") {
        const match = hours.match(/(\d+)h\s*(\d+)?m?/)
        if (match) {
          const h = parseInt(match[1], 10) || 0
          const m = parseInt(match[2], 10) || 0
          return total + h + (m / 60)
        }
      }
      return total
    }, 0)
  }, [data])

  const formatTotalHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const getDateRangeTitle = () => {
    if (!safeSelectedDate) return "—"
    if (isDateRange) {
      return `${format(safeSelectedDate, "d MMM")} - ${format(safeEndDate!, "d MMM yyyy")}`
    }
    return format(safeSelectedDate, "EEEE, d MMMM yyyy")
  }

  if (loading && !serverPagination) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="text-center print:mb-4">
        <h3 className="text-lg font-semibold print:text-base print:font-bold">
          {getDateRangeTitle()}
        </h3>
        {isDateRange && (
          <p className="text-sm text-muted-foreground print:text-xs print:text-black">
            Showing detailed timesheet data for selected date range
          </p>
        )}
      </div>
      
      {serverPagination ? (
        <DataTable
          mode="server"
          columns={columns}
          data={data}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          emptyMessage={isDateRange ? "No timesheet entries for the selected date range." : "No timesheet entries for this date."}
          getRowId={(row) => `timesheet-${row.employeeId}-${row.date}-${row.clockIn}`}
          loading={loading}
          totalCount={serverPagination.totalCount}
          pageIndex={serverPagination.pageIndex}
          pageSize={serverPagination.pageSize}
          onPageChange={serverPagination.onPageChange}
          onPageSizeChange={serverPagination.onPageSizeChange}
          pageSizeOptions={[25, 50, 100, 200]}
          showSearch={false}
          searchValue=""
          onSearchChange={() => {}}
          toolbar={(table) => (
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {serverPagination.totalCount === 0
                    ? "No rows"
                    : isDateRange
                      ? `Showing ${data.length} of ${serverPagination.totalCount} entries`
                      : `${serverPagination.totalCount} row(s) total`}
                </span>
              </div>
              <DataTableViewOptions table={table} />
            </div>
          )}
        />
      ) : (
        <DataTable
          mode="client"
          columns={columns}
          data={data}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          emptyMessage={isDateRange ? "No timesheet entries for the selected date range." : "No timesheet entries for this date."}
          getRowId={(row) => `timesheet-${row.employeeId}-${row.date}-${row.clockIn}`}
          initialPageSize={50}
          toolbar={(table) => (
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center space-x-2">
                {isDateRange && (
                  <span className="text-sm text-muted-foreground">
                    {data.length} entries across {Math.ceil((safeEndDate!.getTime() - safeSelectedDate!.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                  </span>
                )}
              </div>
              <DataTableViewOptions table={table} />
            </div>
          )}
        />
      )}
    </div>
  )
}