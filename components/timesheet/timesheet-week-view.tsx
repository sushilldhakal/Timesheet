"use client"

import { useMemo, useState, useEffect } from "react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import type { ColumnDef, VisibilityState } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import Link from "next/link"

interface WeekViewData {
  employeeId: string
  name: string
  pin: string
  date: string
  totalHours: string
  breakHours: string
  role: string
  employer: string
  location: string
}

interface WeekViewEmployee {
  employeeId: string
  name: string
  pin: string
  role: string
  dailyHours: string[]
  totalFormatted: string
  totalMinutes: number
}

interface TimesheetWeekViewProps {
  data: WeekViewData[]
  selectedDate: Date
  loading?: boolean
}

function getWeekViewColumns(weekDays: Date[]): ColumnDef<WeekViewEmployee>[] {
  const columns: ColumnDef<WeekViewEmployee>[] = [
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
      enableHiding: true,
    }
  ]

  // Add day columns
  weekDays.forEach((day, index) => {
    columns.push({
      id: `day-${index}`,
      header: () => (
        <div className="text-center">
          {format(day, "EEE")}
          <br />
          <span className="text-xs text-muted-foreground">{format(day, "d")}</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center text-sm">
          {row.original.dailyHours[index]}
        </div>
      ),
      enableHiding: true,
    })
  })

  // Add total column
  columns.push({
    id: "total",
    accessorKey: "totalFormatted",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.totalFormatted}
      </div>
    ),
  })

  return columns
}

export function TimesheetWeekView({ data, selectedDate, loading }: TimesheetWeekViewProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    role: false,
  })
  const [isHydrated, setIsHydrated] = useState(false)

  // Prevent hydration mismatch by only rendering dates after hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const weekData = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
    
    // Group data by employee
    const employeeMap = new Map<string, {
      employeeId: string
      name: string
      pin: string
      role: string
      dailyHours: Map<string, string>
    }>()
    
    data.forEach(row => {
      let dateKey = row.date
      
      if (!employeeMap.has(row.employeeId)) {
        employeeMap.set(row.employeeId, {
          employeeId: row.employeeId,
          name: row.name,
          pin: row.pin,
          role: row.role,
          dailyHours: new Map()
        })
      }
      employeeMap.get(row.employeeId)!.dailyHours.set(dateKey, row.totalHours)
    })
    
    // Calculate totals
    const employees = Array.from(employeeMap.values()).map(emp => {
      let totalMinutes = 0
      const dailyHours: string[] = []
      
      weekDays.forEach(day => {
        const dateKey = format(day, "dd-MM-yyyy") // Match the date format from API
        const hours = emp.dailyHours.get(dateKey) || "—"
        dailyHours.push(hours)
        
        if (hours && hours !== "—") {
          const match = hours.match(/(\d+)h\s*(\d+)?m?/)
          if (match) {
            const h = parseInt(match[1], 10) || 0
            const m = parseInt(match[2], 10) || 0
            totalMinutes += h * 60 + m
          }
        }
      })
      
      const totalHours = Math.floor(totalMinutes / 60)
      const remainingMinutes = totalMinutes % 60
      const totalFormatted = remainingMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalHours}h`
      
      return {
        ...emp,
        dailyHours,
        totalFormatted,
        totalMinutes
      }
    })
    
    // Calculate daily totals
    const dailyTotals = weekDays.map(day => {
      const dateKey = format(day, "dd-MM-yyyy") // Match the date format from API
      let dayTotal = 0
      
      employees.forEach(emp => {
        const hours = emp.dailyHours[weekDays.findIndex(d => format(d, "dd-MM-yyyy") === dateKey)]
        if (hours && hours !== "—") {
          const match = hours.match(/(\d+)h\s*(\d+)?m?/)
          if (match) {
            const h = parseInt(match[1], 10) || 0
            const m = parseInt(match[2], 10) || 0
            dayTotal += h * 60 + m
          }
        }
      })
      
      const hours = Math.floor(dayTotal / 60)
      const minutes = dayTotal % 60
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    })
    
    const grandTotal = employees.reduce((sum, emp) => sum + emp.totalMinutes, 0)
    const grandTotalHours = Math.floor(grandTotal / 60)
    const grandTotalMinutes = grandTotal % 60
    const grandTotalFormatted = grandTotalMinutes > 0 ? `${grandTotalHours}h ${grandTotalMinutes}m` : `${grandTotalHours}h`
    
    return {
      weekStart,
      weekEnd,
      weekDays,
      employees,
      dailyTotals,
      grandTotalFormatted
    }
  }, [data, selectedDate])

  const columns = useMemo(() => getWeekViewColumns(weekData.weekDays), [weekData.weekDays])

  if (loading || !isHydrated) {
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
          Week: {format(weekData.weekStart, "d MMM")} – {format(weekData.weekEnd, "d MMM yyyy")}
        </h3>
      </div>
      
      <DataTable
        mode="client"
        columns={columns}
        data={weekData.employees}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        emptyMessage="No timesheet entries for this week."
        getRowId={(row) => row.employeeId}
        initialPageSize={25}
        toolbar={(table) => (
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {weekData.employees.length} employees
              </span>
            </div>
            <DataTableViewOptions table={table} />
          </div>
        )}
      />
    </div>
  )
}