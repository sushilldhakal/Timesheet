"use client"

import { useMemo, useState } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { ColumnDef, VisibilityState } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import Link from "next/link"

interface MonthViewData {
  employeeId: string
  name: string
  pin: string
  date: string
  totalHours: string
  breakHours: string
  employer: string
  location: string
}

interface MonthViewEmployee {
  employeeId: string
  name: string
  pin: string
  daysWorked: number
  daysAbsent: number
  totalHours: string
  totalBreak: string
  totalMinutes: number
  totalBreakMinutes: number
  employersList: string
  locationsList: string
}

interface TimesheetMonthViewProps {
  data: MonthViewData[]
  selectedDate: Date
  loading?: boolean
  preAggregated?: boolean
  aggregatedRows?: MonthAggApiRow[]
}

/** Row shape from GET /api/timesheets?view=month */
export interface MonthAggApiRow {
  employeeId: string
  name: string
  pin: string
  employer?: string
  role: string
  location: string
  daysWorked: number
  totalMinutes: number
  breakMinutes: number
  totalHours: string
  totalBreak: string
  employersList: string
  locationsList: string
}

function getMonthViewColumns(): ColumnDef<MonthViewEmployee>[] {
  return [
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
      id: "employer",
      accessorKey: "employersList",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employer" />
      ),
      enableSorting: true,
      enableHiding: true,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.employersList || "—"}
        </div>
      ),
    },
    {
      id: "location",
      accessorKey: "locationsList",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      enableSorting: true,
      enableHiding: true,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.locationsList || "—"}
        </div>
      ),
    },
    {
      id: "daysWorked",
      accessorKey: "daysWorked",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Days" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-center">{row.original.daysWorked}</div>
      ),
    },
    {
      id: "daysAbsent",
      accessorKey: "daysAbsent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Absent" />
      ),
      enableSorting: true,
      enableHiding: true,
      cell: ({ row }) => (
        <div className="text-center">{row.original.daysAbsent}</div>
      ),
    },
    {
      id: "totalBreak",
      accessorKey: "totalBreak",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Break" />
      ),
      enableSorting: true,
      enableHiding: true,
      cell: ({ row }) => (
        <div className="text-center">{row.original.totalBreak}</div>
      ),
    },
    {
      id: "totalHours",
      accessorKey: "totalHours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Hours" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-center font-medium">{row.original.totalHours}</div>
      ),
    },
  ]
}

export function TimesheetMonthView({ data, selectedDate, loading, preAggregated, aggregatedRows }: TimesheetMonthViewProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // Keep all columns visible by default for month view
  })

  const monthData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const totalDaysInMonth = monthEnd.getDate()

    if (preAggregated) {
      const rows = aggregatedRows ?? []
      const employees: MonthViewEmployee[] = rows.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        pin: row.pin,
        daysWorked: row.daysWorked,
        daysAbsent: Math.max(0, totalDaysInMonth - row.daysWorked),
        totalHours: row.totalHours,
        totalBreak: row.totalBreak,
        totalMinutes: row.totalMinutes,
        totalBreakMinutes: row.breakMinutes,
        employersList: row.employersList || row.employer || "—",
        locationsList: row.locationsList || row.location || "—",
      }))

      const grandTotalDaysWorked = employees.reduce((sum, emp) => sum + emp.daysWorked, 0)
      const grandTotalDaysAbsent = employees.reduce((sum, emp) => sum + emp.daysAbsent, 0)
      const grandTotalMinutes = employees.reduce((sum, emp) => sum + emp.totalMinutes, 0)
      const grandTotalBreakMinutes = employees.reduce((sum, emp) => sum + emp.totalBreakMinutes, 0)

      const formatMinutes = (minutes: number) => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}h ${m}m` : `${h}h`
      }

      return {
        monthStart,
        monthEnd,
        employees,
        grandTotals: {
          daysWorked: grandTotalDaysWorked,
          daysAbsent: grandTotalDaysAbsent,
          totalHours: formatMinutes(grandTotalMinutes),
          totalBreak: formatMinutes(grandTotalBreakMinutes),
        },
      }
    }

    // Group raw shift rows by employee
    const employeeMap = new Map<string, {
      employeeId: string
      name: string
      pin: string
      entries: MonthViewData[]
      employers: Set<string>
      locations: Set<string>
    }>()
    
    data.forEach(row => {
      if (!employeeMap.has(row.employeeId)) {
        employeeMap.set(row.employeeId, {
          employeeId: row.employeeId,
          name: row.name,
          pin: row.pin,
          entries: [],
          employers: new Set(),
          locations: new Set()
        })
      }
      const emp = employeeMap.get(row.employeeId)!
      emp.entries.push(row)
      if (row.employer) emp.employers.add(row.employer)
      if (row.location) emp.locations.add(row.location)
    })
    
    // Calculate monthly summaries
    const employees = Array.from(employeeMap.values()).map(emp => {
      let totalMinutes = 0
      let totalBreakMinutes = 0
      let daysWorked = 0
      
      emp.entries.forEach(entry => {
        // Count days worked (entries with actual hours)
        if (entry.totalHours && entry.totalHours !== "—" && entry.totalHours !== "0h") {
          daysWorked++
          
          // Calculate total hours
          const hoursMatch = entry.totalHours.match(/(\d+)h\s*(\d+)?m?/)
          if (hoursMatch) {
            const h = parseInt(hoursMatch[1], 10) || 0
            const m = parseInt(hoursMatch[2], 10) || 0
            totalMinutes += h * 60 + m
          }
          
          // Calculate total break hours
          if (entry.breakHours && entry.breakHours !== "—") {
            const breakMatch = entry.breakHours.match(/(\d+)h\s*(\d+)?m?/)
            if (breakMatch) {
              const h = parseInt(breakMatch[1], 10) || 0
              const m = parseInt(breakMatch[2], 10) || 0
              totalBreakMinutes += h * 60 + m
            }
          }
        }
      })
      
      const daysAbsent = Math.max(0, totalDaysInMonth - daysWorked)
      
      // Format totals
      const formatMinutes = (minutes: number) => {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}h ${m}m` : `${h}h`
      }
      
      return {
        ...emp,
        daysWorked,
        daysAbsent,
        totalHours: formatMinutes(totalMinutes),
        totalBreak: formatMinutes(totalBreakMinutes),
        totalMinutes,
        totalBreakMinutes,
        employersList: Array.from(emp.employers).join(", "),
        locationsList: Array.from(emp.locations).join(", ")
      }
    })
    
    // Calculate grand totals
    const grandTotalDaysWorked = employees.reduce((sum, emp) => sum + emp.daysWorked, 0)
    const grandTotalDaysAbsent = employees.reduce((sum, emp) => sum + emp.daysAbsent, 0)
    const grandTotalMinutes = employees.reduce((sum, emp) => sum + emp.totalMinutes, 0)
    const grandTotalBreakMinutes = employees.reduce((sum, emp) => sum + emp.totalBreakMinutes, 0)
    
    const formatMinutes = (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    
    return {
      monthStart,
      monthEnd,
      employees,
      grandTotals: {
        daysWorked: grandTotalDaysWorked,
        daysAbsent: grandTotalDaysAbsent,
        totalHours: formatMinutes(grandTotalMinutes),
        totalBreak: formatMinutes(grandTotalBreakMinutes)
      }
    }
  }, [data, selectedDate, preAggregated, aggregatedRows])

  const columns = useMemo(() => getMonthViewColumns(), [])

  if (loading) {
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
          {format(selectedDate, "MMMM yyyy")}
        </h3>
      </div>
      
      <DataTable
        mode="client"
        columns={columns}
        data={monthData.employees}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        emptyMessage="No timesheet entries for this month."
        getRowId={(row) => row.employeeId}
        initialPageSize={25}
        toolbar={(table) => (
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {monthData.employees.length} employees
              </span>
            </div>
            <DataTableViewOptions table={table} />
          </div>
        )}
      />
    </div>
  )
}