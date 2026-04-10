"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, parseISO, eachDayOfInterval } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { FileDown, Printer, AlignJustify, Columns, LayoutGrid, DollarSign } from "lucide-react"
import type { TimesheetView } from "@/components/timesheet/timesheet-view-tabs"
import { TimesheetDateNavigator } from "@/components/timesheet/timesheet-date-navigator"
import { TimesheetDayView } from "@/components/timesheet/timesheet-day-view"
import { TimesheetWeekView, type WeekAggApiRow } from "@/components/timesheet/timesheet-week-view"
import { TimesheetMonthView, type MonthAggApiRow } from "@/components/timesheet/timesheet-month-view"
import { CalendarPageShell } from "@/components/dashboard/calendar/CalendarPageShell"
import { UnifiedCalendarTopbar } from "@/components/dashboard/calendar/UnifiedCalendarTopbar"
import { useMe } from "@/lib/queries/auth"
import { useEmployees } from "@/lib/queries/employees"
import { useLocations } from "@/lib/queries/locations"
import { useRoles } from "@/lib/queries/roles"
import { useTimesheets } from "@/lib/queries/daily-shifts"
import { getTimesheets } from "@/lib/api/daily-shifts"
import { AwardEnhancedRow } from "@/components/timesheet/award-enhanced-row"

// 🔥 Mock award data for demonstration
const mockAwardData: Record<string, any> = {
  // This would normally come from the API with award engine processing
  "emp1-2024-01-15": {
    awardTags: ["TOIL"],
    computed: {
      segments: [
        {
          startTime: "09:00",
          endTime: "17:00",
          ruleName: "Ordinary Time",
          outcome: { type: "ordinary", multiplier: 1.0 },
          durationMinutes: 480
        },
        {
          startTime: "17:00",
          endTime: "17:30",
          ruleName: "TOIL Accrual",
          outcome: { type: "toil", accrualMultiplier: 1.5 },
          durationMinutes: 30
        }
      ],
      totalOrdinaryHours: 8.0,
      totalOvertimeHours: 0,
      totalToilHours: 0.75,
      allowances: [],
      breakEntitlements: [
        { startTime: "12:00", durationMinutes: 30, isPaid: false }
      ]
    }
  },
  "emp2-2024-01-15": {
    awardTags: [],
    computed: {
      segments: [
        {
          startTime: "14:00",
          endTime: "22:00",
          ruleName: "Ordinary Time",
          outcome: { type: "ordinary", multiplier: 1.0 },
          durationMinutes: 480
        },
        {
          startTime: "22:00",
          endTime: "23:00",
          ruleName: "Daily Overtime",
          outcome: { type: "overtime", multiplier: 1.5 },
          durationMinutes: 60
        }
      ],
      totalOrdinaryHours: 8.0,
      totalOvertimeHours: 1.0,
      totalToilHours: 0,
      allowances: [
        { name: "Night Shift Allowance", amount: 25, currency: "AUD" }
      ],
      breakEntitlements: [
        { startTime: "18:00", durationMinutes: 30, isPaid: false }
      ]
    }
  }
}

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
  // 🔥 NEW: Award system fields
  awardTags?: string[]
  computed?: {
    segments: Array<{
      startTime: string
      endTime: string
      ruleName: string
      outcome: {
        type: "ordinary" | "overtime" | "allowance" | "toil" | "break" | "leave"
        multiplier?: number
        flatRate?: number
        currency?: string
        accrualMultiplier?: number
        durationMinutes?: number
        isPaid?: boolean
      }
      durationMinutes: number
    }>
    totalOrdinaryHours: number
    totalOvertimeHours: number
    totalToilHours: number
    allowances: Array<{
      name: string
      amount: number
      currency: string
    }>
    breakEntitlements: Array<{
      startTime: string
      durationMinutes: number
      isPaid: boolean
    }>
  }
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

export default function TimesheetPage() {
  const [isHydrated, setIsHydrated] = useState(false)
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
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const assignedLocations = userPermissions?.locations ?? []
  const isSingleLocationUser = assignedLocations.length === 1

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
  const locationsQuery = useLocations()
  const rolesQuery = useRoles()

  const timesheetFilters = useMemo(
    () => ({
      startDate,
      endDate,
      view: view as "day" | "week" | "month",
      employeeIds: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
      employers: selectedEmployers.length > 0 ? selectedEmployers : undefined,
      locations: selectedLocations.length > 0 ? selectedLocations : undefined,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined,
      limit: view === "day" ? pageSize : 5000,
      offset: view === "day" ? pageIndex * pageSize : 0,
    }),
    [
      startDate,
      endDate,
      view,
      selectedEmployeeIds,
      selectedEmployers,
      selectedLocations,
      selectedRoles,
      pageSize,
      pageIndex,
    ],
  )

  const timesheetsQuery = useTimesheets(timesheetFilters)

  const timesheets = timesheetsQuery.data?.timesheets ?? []
  const timesheetTotal = timesheetsQuery.data?.total ?? 0
  const totalWorkingHours = timesheetsQuery.data?.totalWorkingHours ?? "—"
  const totalBreakHours = timesheetsQuery.data?.totalBreakHours ?? "—"
  const loading = timesheetsQuery.isLoading || timesheetsQuery.isFetching
  const timesheetError = timesheetsQuery.isError
    ? (timesheetsQuery.error instanceof Error ? timesheetsQuery.error.message : "Failed to load timesheets")
    : null

  // 🔥 Enhance timesheets with award data
  const enhancedTimesheets = useMemo(() => {
    return timesheets.map((ts: any) => {
      const key = `${ts.employeeId}-${ts.date}`
      const awardData = mockAwardData[key]
      return {
        ...ts,
        awardTags: awardData?.awardTags || [],
        computed: awardData?.computed
      }
    })
  }, [timesheets])

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

        const isAdminUser = userPermissions?.role === "admin" || userPermissions?.role === "super_admin"

        if (isAdminUser) {
          // Admin users: Use categories from queries, unless they are explicitly restricted to 1 location.
          const restrictedToOne = (userPermissions?.locations?.length ?? 0) === 1
          if (restrictedToOne) {
            const only = userPermissions!.locations[0]!
            locationsArray = [{ id: only, name: only, type: "location" }]
          } else {
            locationsArray =
              locationsQuery.data?.locations?.map((loc: any) => ({
                id: loc.id,
                name: loc.name,
                type: "location",
              })) || []
          }
          
          rolesArray = rolesQuery.data?.roles?.map((role: any) => ({ 
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

  // If user is restricted to exactly one location, force-select it and keep it selected.
  useEffect(() => {
    if (!isSingleLocationUser) return
    const only = assignedLocations[0]
    if (!only) return
    setSelectedLocations((prev) => (prev.length === 1 && prev[0] === only ? prev : [only]))
  }, [isSingleLocationUser, assignedLocations])

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
    setIsHydrated(true)
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

  useEffect(() => {
    setPageIndex(0)
  }, [
    view,
    startDate,
    endDate,
    useCustomRange,
    customStartDate,
    customEndDate,
    selectedEmployeeIds,
    selectedEmployers,
    selectedLocations,
    selectedRoles,
  ])

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    // Only enable range mode once both ends are valid ISO dates.
    const s = parseISO(String(start || ""))
    const e = parseISO(String(end || ""))
    setUseCustomRange(isValid(s) && isValid(e))
  }

  const exportFilterBase = useMemo(
    () => ({
      startDate,
      endDate,
      employeeIds: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
      employers: selectedEmployers.length > 0 ? selectedEmployers : undefined,
      locations: selectedLocations.length > 0 ? selectedLocations : undefined,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined,
    }),
    [startDate, endDate, selectedEmployeeIds, selectedEmployers, selectedLocations, selectedRoles],
  )

  const escapeCsvCell = (cell: unknown) => {
    const cellStr = String(cell).replace(/"/g, '""')
    return cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n") ? `"${cellStr}"` : cellStr
  }

  const handleExportCSV = async () => {
    const filterSuffix = [
      selectedEmployers.length > 0 ? `emp-${selectedEmployers.length}` : "",
      selectedLocations.length > 0 ? `loc-${selectedLocations.length}` : "",
      selectedRoles.length > 0 ? `role-${selectedRoles.length}` : "",
      selectedEmployeeIds.length > 0 ? `staff-${selectedEmployeeIds.length}` : "",
    ]
      .filter(Boolean)
      .join("-")
    const filename = `timesheet-${view}-${startDate}-to-${endDate}${filterSuffix ? `-${filterSuffix}` : ""}.csv`

    const download = (headers: string[], rows: string[][]) => {
      const csvContent = [headers.join(","), ...rows.map((row) => row.map(escapeCsvCell).join(","))].join("\n")
      const BOM = "\uFEFF"
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    try {
      if (view === "day") {
        const all: DashboardTimesheetRow[] = []
        let offset = 0
        const limit = 2000
        while (true) {
          const res = await getTimesheets({ ...exportFilterBase, view: "day", limit, offset })
          const chunk = res.timesheets as DashboardTimesheetRow[]
          all.push(...chunk)
          if (all.length >= res.total || chunk.length < limit) break
          offset += limit
        }
        if (all.length === 0) return
        const headers = [
          "Date",
          "Employee ID",
          "Name",
          "PIN",
          "Role",
          "Employer",
          "Location",
          "Clock In",
          "Break In",
          "Break Out",
          "Clock Out",
          "Break Hours",
          "Total Hours",
          "Total Minutes",
          "Comment",
        ]
        const rows = all.map((row) => [
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
          row.comment || "—",
        ])
        download(headers, rows)
        return
      }

      if (view === "week") {
        const res = await getTimesheets({ ...exportFilterBase, view: "week", limit: 5000, offset: 0 })
        const agg = res.timesheets as unknown as WeekAggApiRow[]
        if (agg.length === 0) return
        const rangeStart = parseISO(exportFilterBase.startDate)
        const rangeEnd = parseISO(exportFilterBase.endDate)
        const dayKeys =
          isValid(rangeStart) && isValid(rangeEnd)
            ? eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((d) => format(d, "yyyy-MM-dd"))
            : [...new Set(agg.flatMap((r) => Object.keys(r.dailyMinutes ?? {})))].sort()
        const headers = ["Employee ID", "Name", "PIN", "Role", "Employer", "Location", ...dayKeys, "Total Minutes", "Break Minutes"]
        const rows = agg.map((row) => [
          row.employeeId,
          row.name,
          row.pin,
          row.role,
          row.employer,
          row.location,
          ...dayKeys.map((k) => String(row.dailyMinutes[k] ?? 0)),
          String(row.totalMinutes),
          String(row.breakMinutes),
        ])
        download(headers, rows)
        return
      }

      const res = await getTimesheets({ ...exportFilterBase, view: "month", limit: 5000, offset: 0 })
      const agg = res.timesheets as unknown as MonthAggApiRow[]
      if (agg.length === 0) return
      const headers = [
        "Employee ID",
        "Name",
        "PIN",
        "Employer",
        "Location",
        "Days Worked",
        "Total Hours",
        "Total Break",
        "Total Minutes",
        "Break Minutes",
      ]
      const rows = agg.map((row) => [
        row.employeeId,
        row.name,
        row.pin,
        row.employersList || row.employer || "—",
        row.locationsList || row.location || "—",
        String(row.daysWorked),
        row.totalHours,
        row.totalBreak,
        String(row.totalMinutes),
        String(row.breakMinutes),
      ])
      download(headers, rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed")
    }
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
      case "day": {
        const safeRangeStart = useCustomRange ? parseISO(customStartDate) : null
        const safeRangeEnd = useCustomRange ? parseISO(customEndDate) : null
        const safeSelectedDate = useCustomRange && safeRangeStart && isValid(safeRangeStart) ? safeRangeStart : selectedDate
        const safeEndDate = useCustomRange && safeRangeEnd && isValid(safeRangeEnd) ? safeRangeEnd : undefined
        return (
          <TimesheetDayView
            data={enhancedTimesheets as DashboardTimesheetRow[]}
            selectedDate={safeSelectedDate}
            endDate={safeEndDate}
            loading={loading}
            serverPagination={{
              totalCount: timesheetTotal,
              pageIndex,
              pageSize,
              onPageChange: setPageIndex,
              onPageSizeChange: (s) => {
                setPageSize(s)
                setPageIndex(0)
              },
            }}
          />
        )
      }
      case "week":
        return (
          <TimesheetWeekView
            data={[]}
            preAggregated
            aggregatedRows={enhancedTimesheets as unknown as WeekAggApiRow[]}
            selectedDate={selectedDate}
            loading={loading}
          />
        )
      case "month":
        return (
          <TimesheetMonthView
            data={[]}
            preAggregated
            aggregatedRows={enhancedTimesheets as unknown as MonthAggApiRow[]}
            selectedDate={selectedDate}
            loading={loading}
          />
        )
      default:
        return null
    }
  }

  return (
    <CalendarPageShell
      containerClassName="px-4 sm:px-6"
      toolbar={
        <UnifiedCalendarTopbar
          className="print:hidden"
          onToday={handleTodayClick}
          title={format(selectedDate, "MMMM yyyy")}
          nav={
            <div className="flex items-center gap-2">
              {view === "day" ? (
                <DateRangePicker
                  value={{
                    startDate: useCustomRange ? customStartDate : startDate,
                    endDate: useCustomRange ? customEndDate : endDate,
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
          }
          viewSwitcher={
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
              {([
                { k: "day" as const, l: "Day", Icon: AlignJustify },
                { k: "week" as const, l: "Week", Icon: Columns },
                { k: "month" as const, l: "Month", Icon: LayoutGrid },
              ] satisfies { k: TimesheetView; l: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[]).map(({ k, l, Icon }) => {
                const active = view === k
                return (
                  <button
                    key={k}
                    onClick={() => setView(k)}
                    title={l}
                    className={[
                      "flex h-7 items-center justify-center gap-1 overflow-hidden rounded-md text-xs transition-all duration-200 ease-in-out",
                      active ? "w-[76px] bg-background font-semibold text-foreground shadow-sm" : "w-8 bg-transparent font-normal text-muted-foreground",
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
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <MultiSelect
                  options={filteredEmployees.map((e) => ({
                    label: `${e.name} (${e.pin})`,
                    value: e.id,
                  }))}
                  defaultValue={selectedEmployeeIds}
                  onValueChange={setSelectedEmployeeIds}
                  placeholder="All employees"
                  searchable
                  avatarView
                  maxCount={5}
                  className="min-w-[220px] max-w-[260px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!isHydrated || loading || timesheetTotal === 0}
                onClick={() => void handleExportCSV()}
              >
                <FileDown className="size-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!isHydrated || loading}
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                Print
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-4 py-4 print:space-y-0 print:py-0 print:text-sm">
        {/* Filters */}
        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Employer filter - show if multiple employers exist OR if admin */}
              {(employers.length > 1 ||
                (userPermissions &&
                  (userPermissions.role === "admin" || userPermissions.role === "super_admin") &&
                  employers.length > 0)) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">Employer</label>
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
              {userPermissions &&
                !isSingleLocationUser &&
                ((userPermissions.role === "admin" || userPermissions.role === "super_admin")
                  ? locations.length > 0
                  : userPermissions.locations.length > 1) && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Location</label>
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
              {userPermissions &&
                ((userPermissions.role === "admin" || userPermissions.role === "super_admin")
                  ? roles.length > 0
                  : userPermissions.managedRoles.length > 1) && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">Role</label>
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
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {isHydrated && !loading && timesheetTotal > 0 && (
          <>
            {/* Screen stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
              <div className="rounded-lg border-l-4 border-l-emerald-500 bg-card px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Hours</p>
                <p className="mt-0.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalWorkingHours}</p>
                <p className="text-xs text-muted-foreground">All employees combined</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-amber-500 bg-card px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Break</p>
                <p className="mt-0.5 text-2xl font-bold text-amber-600 dark:text-amber-400">{totalBreakHours}</p>
                <p className="text-xs text-muted-foreground">Break time this period</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-card px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {view === "day" ? "Total Shifts" : "Employees"}
                </p>
                <p className="mt-0.5 text-2xl font-bold text-blue-600 dark:text-blue-400">{timesheetTotal}</p>
                <p className="text-xs text-muted-foreground">
                  {view === "day" ? "Clock-in records" : "With hours this period"}
                </p>
              </div>
              {/* 🔥 NEW: Award System Stats */}
              <div className="rounded-lg border-l-4 border-l-green-500 bg-card px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overtime Hours</p>
                <p className="mt-0.5 text-2xl font-bold text-green-600 dark:text-green-400">
                  {enhancedTimesheets.reduce((sum: number, ts: any) => sum + (ts.computed?.totalOvertimeHours || 0), 0).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">1.5x+ penalty rates</p>
              </div>
              <div className="rounded-lg border-l-4 border-l-orange-500 bg-card px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TOIL Accrued</p>
                <p className="mt-0.5 text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {enhancedTimesheets.reduce((sum: number, ts: any) => sum + (ts.computed?.totalToilHours || 0), 0).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">Time off banked</p>
              </div>
            </div>
            {/* Print-only compact version */}
            <div className="hidden print:flex gap-6 rounded-lg border border-border bg-background px-4 py-3 text-xs">
              <span><strong>Total Break:</strong> {totalBreakHours}</span>
              <span><strong>Total Hours:</strong> {totalWorkingHours}</span>
              <span><strong>Records:</strong> {timesheetTotal}{view === "day" && timesheets.length !== timesheetTotal ? ` (showing ${timesheets.length} on this page)` : ""}</span>
            </div>
          </>
        )}

        {/* Content */}
        <Card>
          <CardHeader className="hidden print:block print:border-b print:pb-4">
            <CardTitle className="text-sm print:text-base print:font-bold">
              Timesheet Report: {startDate} – {endDate}
            </CardTitle>
            <div className="text-xs print:mt-2 print:text-sm print:text-gray-600">
              <div className="flex flex-wrap gap-4">
                {selectedEmployers.length > 0 && <span>Employers: {selectedEmployers.join(", ")}</span>}
                {selectedLocations.length > 0 && <span>Locations: {selectedLocations.join(", ")}</span>}
                {selectedRoles.length > 0 && <span>Roles: {selectedRoles.join(", ")}</span>}
                {selectedEmployeeIds.length > 0 && <span>Employees: {selectedEmployeeIds.length} selected</span>}
              </div>
              <div className="mt-1">
                View: {view.charAt(0).toUpperCase() + view.slice(1)} | Generated:{" "}
                <span suppressHydrationWarning>{isHydrated ? new Date().toLocaleString() : ""}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {(error || timesheetError) && (
              <p className="mb-4 text-sm text-destructive">{timesheetError || error}</p>
            )}
            
            {/* 🔥 Award System Enhancement */}
            {view === "day" && enhancedTimesheets.some((ts: any) => ts.computed || (ts.awardTags && ts.awardTags.length > 0)) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Award System Active - Enhanced Pay Calculation
                </h3>
                <div className="space-y-3">
                  {enhancedTimesheets
                    .filter((ts: any) => ts.computed || (ts.awardTags && ts.awardTags.length > 0))
                    .slice(0, 3)
                    .map((ts: any, index: number) => (
                      <AwardEnhancedRow key={index} timesheet={ts} />
                    ))}
                </div>
                {enhancedTimesheets.filter((ts: any) => ts.computed || (ts.awardTags && ts.awardTags.length > 0)).length > 3 && (
                  <p className="text-sm text-blue-700 mt-3">
                    And {enhancedTimesheets.filter((ts: any) => ts.computed || (ts.awardTags && ts.awardTags.length > 0)).length - 3} more timesheets with award processing...
                  </p>
                )}
              </div>
            )}
            
            {renderCurrentView()}
          </CardContent>
        </Card>
      </div>
    </CalendarPageShell>
  )
}