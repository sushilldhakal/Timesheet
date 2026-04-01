"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { FileDown, Printer } from "lucide-react"
import { TimesheetViewTabs, type TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetTodayButton } from "@/components/timesheet/timesheet-today-button"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { TimesheetDayView } from "@/components/timesheet/timesheet-day-view"
import { TimesheetWeekView } from "@/components/timesheet/timesheet-week-view"
import { TimesheetMonthView } from "@/components/timesheet/timesheet-month-view"
import { useMe } from "@/lib/queries/auth"
import { useEmployees } from "@/lib/queries/employees"
import { useCategoriesByType } from "@/lib/queries/categories"
import { useTimesheets } from "@/lib/queries/timesheets"

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

function buildTimesheetUrl(params: {
  startDate: string
  endDate: string
  employeeIds?: string[]
  employers?: string[]
  locations?: string[]
  roles?: string[]
}) {
  const sp = new URLSearchParams()
  sp.set("startDate", params.startDate)
  sp.set("endDate", params.endDate)
  sp.set("limit", "500") // Get more data for aggregation (API max limit)
  sp.set("offset", "0")
  params.employeeIds?.forEach((id) => sp.append("employeeId", id))
  params.employers?.forEach((e) => sp.append("employer", e))
  params.locations?.forEach((l) => sp.append("location", l))
  params.roles?.forEach((r) => sp.append("role", r))
  return `/api/timesheets?${sp.toString()}`
}

function getDateRange(view: TimesheetView, selectedDate: Date) {
  switch (view) {
    case "day":
      const dayStart = startOfDay(selectedDate)
      const dayEnd = endOfDay(selectedDate)
      return {
        startDate: format(dayStart, "yyyy-MM-dd"),
        endDate: format(dayEnd, "yyyy-MM-dd"),
      }
    case "week":
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      return {
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
      }
    case "month":
      const monthStart = startOfMonth(selectedDate)
      const monthEnd = endOfMonth(selectedDate)
      return {
        startDate: format(monthStart, "yyyy-MM-dd"),
        endDate: format(monthEnd, "yyyy-MM-dd"),
      }
    default:
      return {
        startDate: format(selectedDate, "yyyy-MM-dd"),
        endDate: format(selectedDate, "yyyy-MM-dd"),
      }
  }
}

export default function TimesheetPage() {
  const [view, setView] = useState<TimesheetView>("week")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [selectedEmployers, setSelectedEmployers] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [employers, setEmployers] = useState<Category[]>([])
  const [locations, setLocations] = useState<Category[]>([])
  const [roles, setRoles] = useState<Category[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [userPermissions, setUserPermissions] = useState<{locations: string[], managedRoles: string[], role: string} | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range first
  const { startDate, endDate } = useMemo(() => {
    if (useCustomRange && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }

    if (view === "day") {
      return {
        startDate: format(startOfDay(selectedDate), "yyyy-MM-dd"),
        endDate: format(endOfDay(selectedDate), "yyyy-MM-dd"),
      }
    }

    if (view === "week") {
      return {
        startDate: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }
    }

    return {
      startDate: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
      endDate: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
    }
  }, [view, selectedDate, useCustomRange, customStartDate, customEndDate])

  // TanStack Query hooks
  const userQuery = useMe()
  const employeesQuery = useEmployees(500)
  const locationsQuery = useCategoriesByType('location')
  const rolesQuery = useCategoriesByType('role')

  const timesheetsQuery = useTimesheets({
    startDate,
    endDate,
    employeeIds: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
    employers: selectedEmployers.length > 0 ? selectedEmployers : undefined,
    locations: selectedLocations.length > 0 ? selectedLocations : undefined,
    roles: selectedRoles.length > 0 ? selectedRoles : undefined,
  })

  const timesheets = timesheetsQuery.data?.timesheets ?? []
  const totalWorkingHours = timesheetsQuery.data?.totalWorkingHours ?? "—"
  const totalBreakHours = timesheetsQuery.data?.totalBreakHours ?? "—"
  const loading = timesheetsQuery.isLoading || timesheetsQuery.isFetching
  const timesheetError = timesheetsQuery.isError
    ? (timesheetsQuery.error instanceof Error ? timesheetsQuery.error.message : "Failed to load timesheets")
    : null

  // Process employees data
  const fetchFilters = useCallback(async () => {
    try {
      // Get user permissions from auth query
      let userPermissions = null
      if (userQuery.data?.user) {
        const user = userQuery.data.user
        userPermissions = {
          locations: user.location || [],
          managedRoles: user.managedRoles || [],
          role: user.role || "user"
        }
        setUserPermissions(userPermissions)
      }
      
      // Get employees from query
      if (employeesQuery.data?.employees) {
        const employeeData = employeesQuery.data.employees.map(
          (e: any) => {
            // Extract employer names from the 'employers' array
            const employerNames = e.employers?.map((emp: any) => emp.name).filter(Boolean) || []

            // Extract location names from the 'locations' array  
            const locationNames = e.locations?.map((loc: any) => loc.name).filter(Boolean) || []

            return {
              id: e.id ?? e._id,
              name: e.name ?? "",
              pin: e.pin ?? "",
              employer: employerNames,
              location: locationNames,
            }
          }
        )
        setEmployees(employeeData)

        // Extract unique employers and roles from employee data
        const uniqueEmployers = new Set<string>()
        const uniqueRoles = new Set<string>()

        employeesQuery.data.employees?.forEach((emp: any) => {
          // Extract employers
          if (emp.employers) {
            emp.employers.forEach((employer: any) => uniqueEmployers.add(employer.name))
          }
          
          // Extract roles
          if (emp.roles) {
            emp.roles.forEach((roleAssignment: any) => {
              if (roleAssignment.role && roleAssignment.role.name) {
                uniqueRoles.add(roleAssignment.role.name)
              }
            })
          }
        })

        // Set filter options based on user permissions
        const employersArray = Array.from(uniqueEmployers).map((name: string) => ({ id: name, name, type: "employer" }))

        let locationsArray: Category[] = []
        let rolesArray: Category[] = []

        if (userPermissions?.role === "admin" || userPermissions?.role === "super_admin") {
          // Admin users: Use categories from queries
          locationsArray = locationsQuery.data?.categories?.map((loc: any) => ({ 
            id: loc.id, 
            name: loc.name, 
            type: "location" 
          })) || []
          
          rolesArray = rolesQuery.data?.categories?.map((role: any) => ({ 
            id: role.id, 
            name: role.name, 
            type: "role" 
          })) || []
        } else {
          // Regular users: Use their assigned permissions
          locationsArray = userPermissions ? 
            userPermissions.locations.map((name: string) => ({ id: name, name, type: "location" })) : []
          
          rolesArray = userPermissions ? 
            userPermissions.managedRoles.map((name: string) => ({ id: name, name, type: "role" })) : []
        }

        setEmployers(employersArray)
        setLocations(locationsArray)
        setRoles(rolesArray)
      }
    } catch (error) {
      console.error("Error in fetchFilters:", error)
      setError("Failed to load filters")
    }
  }, [userQuery.data, employeesQuery.data, locationsQuery.data, rolesQuery.data])

  const filteredEmployees = useMemo(() => {
    if (selectedEmployers.length === 0 && selectedLocations.length === 0 && selectedRoles.length === 0) return employees
    return employees.filter((e) => {
      const matchEmployer = selectedEmployers.length === 0 || e.employer.some((x) => selectedEmployers.includes(x))
      const matchLocation = selectedLocations.length === 0 || e.location.some((x) => selectedLocations.includes(x))
      // For roles, we would need to check employee roles, but since the current data structure doesn't include roles in the employee data,
      // we'll skip role filtering for now and focus on the UI visibility logic
      return matchEmployer && matchLocation
    })
  }, [employees, selectedEmployers, selectedLocations, selectedRoles])

  const fetchTimesheets = useCallback(async () => {
    // This is now handled by the useTimesheets hook
  }, [])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  // Set error from timesheets query
  useEffect(() => {
    if (timesheetsQuery.error) {
      setError(timesheetsQuery.error instanceof Error ? timesheetsQuery.error.message : "Failed to load timesheets")
    } else {
      setError(null)
    }
  }, [timesheetsQuery.error])

  useEffect(() => {
    if (selectedEmployeeIds.length > 0 && filteredEmployees.length > 0) {
      const valid = selectedEmployeeIds.filter((id) => filteredEmployees.some((e) => e.id === id))
      if (valid.length !== selectedEmployeeIds.length) setSelectedEmployeeIds(valid)
    }
  }, [selectedEmployeeIds, filteredEmployees])

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    setUseCustomRange(true)
  }

  const handleExportCSV = () => {
    if (timesheets.length === 0) return

    // Always export all available data regardless of view
    const headers = [
      "Date", "Employee ID", "Name", "PIN", "Role", "Employer", "Location", 
      "Clock In", "Break In", "Break Out", "Clock Out", 
      "Break Hours", "Total Hours", "Total Minutes", "Comment"
    ]
    
    const rows = timesheets.map(row => [
      row.date || "—",
      row.employeeId || "—",
      row.name || "—",
      row.pin || "—",
      row.role || "—",
      row.employer || "—",
      row.location || "—",
      row.clockIn || "—",
      row.breakIn || "—",
      row.breakOut || "—",
      row.clockOut || "—",
      row.breakHours || "—",
      row.totalHours || "—",
      row.totalMinutes?.toString() || "0",
      row.comment || "—"
    ])

    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const cellStr = String(cell).replace(/"/g, '""')
          return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') 
            ? `"${cellStr}"` 
            : cellStr
        }).join(",")
      )
    ].join("\n")

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    
    // Create download link
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    
    // Generate filename with current filters
    const filterSuffix = [
      selectedEmployers.length > 0 ? `emp-${selectedEmployers.length}` : "",
      selectedLocations.length > 0 ? `loc-${selectedLocations.length}` : "",
      selectedRoles.length > 0 ? `role-${selectedRoles.length}` : "",
      selectedEmployeeIds.length > 0 ? `staff-${selectedEmployeeIds.length}` : ""
    ].filter(Boolean).join("-")
    
    const filename = `timesheet-${view}-${startDate}-to-${endDate}${filterSuffix ? `-${filterSuffix}` : ""}.csv`
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleTodayClick = () => {
    setSelectedDate(new Date())
    setUseCustomRange(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const renderCurrentView = () => {
    switch (view) {
      case "day":
        return (
          <TimesheetDayView
            data={timesheets}
            selectedDate={useCustomRange ? new Date(customStartDate) : selectedDate}
            endDate={useCustomRange ? new Date(customEndDate) : undefined}
            loading={loading}
          />
        )
      case "week":
        return (
          <TimesheetWeekView
            data={timesheets}
            selectedDate={selectedDate}
            loading={loading}
          />
        )
      case "month":
        return (
          <TimesheetMonthView
            data={timesheets}
            selectedDate={selectedDate}
            loading={loading}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 print:space-y-0 print:text-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <TimesheetTodayButton onTodayClick={handleTodayClick} />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {format(selectedDate, "MMMM yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {view === "day" ? (
                <DateRangePicker
                  value={{ 
                    startDate: useCustomRange ? customStartDate : startDate, 
                    endDate: useCustomRange ? customEndDate : endDate 
                  }}
                  onChange={handleCustomRangeChange}
                  placeholder="Select date or range"
                />
              ) : (
                <TimesheetDateNavigator
                  view={view}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    setSelectedDate(date)
                    setUseCustomRange(false)
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
          <div className="flex w-full items-center gap-2">
            <TimesheetViewTabs view={view} onViewChange={setView} />
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={loading || timesheets.length === 0}
              onClick={handleExportCSV}
            >
              <FileDown className="size-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={loading}
              onClick={handlePrint}
            >
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Employer filter - show if multiple employers exist OR if admin */}
            {(employers.length > 1 || (userPermissions && (userPermissions.role === "admin" || userPermissions.role === "super_admin") && employers.length > 0)) && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground block text-xs font-medium">
                  Employer
                </label>
                <MultiSelect
                  options={employers.map((c) => ({ label: c.name, value: c.name }))}
                  defaultValue={selectedEmployers}
                  onValueChange={setSelectedEmployers}
                  placeholder="All employers"
                  searchable
                  className="min-w-[180px] max-w-[220px]"
                />
              </div>
            )}
           
            {/* Location filter - show for admin users (if any exist) OR if regular user has multiple locations */}
            {userPermissions && (
              (userPermissions.role === "admin" || userPermissions.role === "super_admin") ? 
              locations.length > 0 : userPermissions.locations.length > 1
            ) && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground block text-xs font-medium">Location</label>
                <MultiSelect
                  options={locations.map((c) => ({ label: c.name, value: c.name }))}
                  defaultValue={selectedLocations}
                  onValueChange={setSelectedLocations}
                  placeholder="All locations"
                  searchable
                  className="min-w-[180px] max-w-[220px]"
                />
              </div>
            )}
            
            {/* Role filter - show for admin users (if any exist) OR if regular user has multiple managed roles */}
            {userPermissions && (
              (userPermissions.role === "admin" || userPermissions.role === "super_admin") ? 
              roles.length > 0 : userPermissions.managedRoles.length > 1
            ) && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground block text-xs font-medium">Role</label>
                <MultiSelect
                  options={roles.map((c) => ({ label: c.name, value: c.name }))}
                  defaultValue={selectedRoles}
                  onValueChange={setSelectedRoles}
                  placeholder="All roles"
                  searchable
                  className="min-w-[180px] max-w-[220px]"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-muted-foreground block text-xs font-medium">Employee</label>
              <MultiSelect
                options={filteredEmployees.map((e) => ({
                  label: `${e.name} (${e.pin})`,
                  value: e.id,
                }))}
                defaultValue={selectedEmployeeIds}
                onValueChange={setSelectedEmployeeIds}
                placeholder="All employees"
                searchable
                className="min-w-[200px] max-w-[240px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {!loading && timesheets.length > 0 && (
        <div className="flex gap-6 px-4 py-3 text-sm border rounded-lg bg-muted/30 print:bg-white print:border-gray-300 print:text-xs">
          <span>
            <strong>Total Break (all):</strong> {totalBreakHours}
          </span>
          <span>
            <strong>Total Hours (all):</strong> {totalWorkingHours}
          </span>
          <span className="print:block hidden">
            <strong>Total Records:</strong> {timesheets.length}
          </span>
        </div>
      )}

      {/* Content */}
      <Card>
        <CardHeader className="hidden print:block print:border-b print:pb-4">
          <CardTitle className="text-sm print:text-base print:font-bold">
            Timesheet Report: {startDate} – {endDate}
          </CardTitle>
          <div className="text-xs print:text-sm print:mt-2 print:text-gray-600">
            <div className="flex flex-wrap gap-4">
              {selectedEmployers.length > 0 && (
                <span>Employers: {selectedEmployers.join(", ")}</span>
              )}
              {selectedLocations.length > 0 && (
                <span>Locations: {selectedLocations.join(", ")}</span>
              )}
              {selectedRoles.length > 0 && (
                <span>Roles: {selectedRoles.join(", ")}</span>
              )}
              {selectedEmployeeIds.length > 0 && (
                <span>Employees: {selectedEmployeeIds.length} selected</span>
              )}
            </div>
            <div className="mt-1">
              View: {view.charAt(0).toUpperCase() + view.slice(1)} | 
              Generated: <span suppressHydrationWarning>
                {typeof window !== 'undefined' ? new Date().toLocaleString() : ''}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {(error || timesheetError) && (
            <p className="text-destructive text-sm mb-4">{timesheetError || error}</p>
          )}
          {renderCurrentView()}
        </CardContent>
      </Card>
    </div>
  )
}