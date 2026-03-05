"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { UserPlus, Pencil, Trash2, X } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import type { FilterConfig } from "@/components/ui/data-table/data-table-toolbar"
import { AddEmployeeDialog } from "./AddEmployeeDialog"
import { EditEmployeeDialog } from "./EditEmployeeDialog"
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog"

// Custom toolbar for server-side filtering
function CustomEmployeeToolbar({ 
  table, 
  searchValue, 
  onSearchChange, 
  filterConfig, 
  columnFilters, 
  onColumnFiltersChange 
}: {
  table: any
  searchValue: string
  onSearchChange: (value: string) => void
  filterConfig: FilterConfig[]
  columnFilters: { id: string; value: string[] }[]
  onColumnFiltersChange: (filters: { id: string; value: string[] }[]) => void
}) {
  const hasFilters = columnFilters.some(filter => filter.value.length > 0)

  const handleFilterChange = (columnId: string, values: string[]) => {
    const newFilters = columnFilters.filter(f => f.id !== columnId)
    if (values.length > 0) {
      newFilters.push({ id: columnId, value: values })
    }
    onColumnFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onColumnFiltersChange([])
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search employees..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filterConfig.map((filter) => {
          const currentFilter = columnFilters.find(f => f.id === filter.columnId)
          const selectedValues = currentFilter?.value || []
          
          // Create a minimal column-like object that satisfies the DataTableFacetedFilter requirements
          const mockColumn = {
            getFilterValue: () => selectedValues,
            setFilterValue: (value: any) => {
              const values = Array.isArray(value) ? value : value ? [value] : []
              handleFilterChange(filter.columnId, values)
            },
            getFacetedUniqueValues: () => {
              // Return a Map with the filter options and their counts
              const map = new Map()
              filter.options.forEach(option => {
                // Extract count from label if it exists (e.g., "Melbourne Central (23)" -> 23)
                const countMatch = option.label.match(/\((\d+)\)$/)
                const count = countMatch ? parseInt(countMatch[1], 10) : 0
                map.set(option.value, count)
              })
              return map
            },
          }
          
          return (
            <div key={filter.columnId} className="relative">
              <DataTableFacetedFilter
                column={mockColumn as any}
                title={filter.title}
                options={filter.options}
              />
            </div>
          )
        })}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}

export type EmployeeRow = {
  id: string
  name: string
  pin: string
  roles?: Array<{
    id: string
    role: {
      id: string
      name: string
      color?: string
    }
    location: {
      id: string
      name: string
      address: string
      lat?: number
      lng?: number
      geofence: {
        radius: number
        mode: string
      }
      hours: {
        opening?: number
        closing?: number
        workingDays: number[]
      }
    }
    validFrom: string
    validTo: string | null
    isActive: boolean
  }>
  employers?: Array<{
    id: string
    name: string
    color?: string
  }>
  locations?: Array<{
    id: string
    name: string
    address: string
    lat?: number
    lng?: number
    geofence: {
      radius: number
      mode: string
    }
    hours: {
      opening?: number
      closing?: number
      workingDays: number[]
    }
  }>
  hire: string
  site: string
  email: string
  phone: string
  dob: string
  comment: string
  img: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string | null>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeRow | null>(null)
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnFilters, setColumnFilters] = useState<{ id: string; value: string[] }[]>([])
  const debouncedSearch = useDebounce(search, 300)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const limit = pageSize >= 99999 ? 10000 : pageSize
      const offset = pageIndex * (pageSize >= 99999 ? 10000 : pageSize)
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sortBy) {
        params.set("sortBy", sortBy)
        params.set("order", sortOrder)
      }
      
      // Add server-side filters
      columnFilters.forEach(filter => {
        if (filter.value.length > 0) {
          params.set(filter.id, filter.value.join(','))
        }
      })
      
      const res = await fetch(`/api/employees?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees ?? [])
        setTotal(data.total ?? 0)
      } else {
        setEmployees([])
        setTotal(0)
      }
    } catch {
      setEmployees([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pageIndex, pageSize, sortBy, sortOrder, columnFilters])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch, columnFilters])

  const handleRowClick = (row: EmployeeRow) => {
    router.push(`/dashboard/employees/${row.id}`)
  }

  const handleSortChange = (columnId: string, order: "asc" | "desc") => {
    setSortBy(columnId)
    setSortOrder(order)
    setPageIndex(0)
  }

  // Define sortable column IDs (role sorting requires complex aggregation, so it's excluded)
  const sortableColumnIds = ["name", "pin", "email", "phone", "employer", "location"]

  // Define columns
  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
     
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "—"}</span>
        ),
        enableHiding: false,
        enableSorting: sortableColumnIds.includes("name"),
      },
      {
        accessorKey: "pin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PIN" />
        ),
        cell: ({ row }) => row.original.pin,
        enableHiding: false,
        enableSorting: sortableColumnIds.includes("pin"),
      },
      {
        accessorKey: "role",
        accessorFn: (row) => {
          if (row.roles && row.roles.length > 0) {
            return row.roles.map((r) => r.role.name).join(", ")
          }
          return "—"
        },
        header: () => <span>Roles</span>,
        cell: ({ row }) => {
          const roles = row.original.roles
          
          if (!roles || roles.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          
          const activeRoles = roles.filter((r) => r.isActive)
            
          if (activeRoles.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          
          if (activeRoles.length === 1) {
            const role = activeRoles[0]
            return (
              <div className="flex items-center gap-2">
                {role.role.color && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.role.color }}
                  />
                )}
                <span>{role.role.name}</span>
              </div>
            )
          }
          
          const displayRoles = activeRoles.slice(0, 2)
          const remainingCount = activeRoles.length - 2
          
          return (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  {displayRoles.map((role) => (
                    <Badge
                      key={role.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {role.role.color && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: role.role.color }}
                        />
                      )}
                      {role.role.name}
                    </Badge>
                  ))}
                  {remainingCount > 0 && (
                    <Badge variant="outline">+{remainingCount}</Badge>
                  )}
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80" align="start">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Role Assignments</h4>
                  <div className="space-y-2">
                    {activeRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        {role.role.color && (
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                            style={{ backgroundColor: role.role.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{role.role.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {role.location.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )
        },
        enableSorting: sortableColumnIds.includes("role"),
      },
      {
        accessorKey: "employer",
        accessorFn: (row) => (row.employers ?? []).map(e => e.name).join(", "),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employers" />
        ),
        cell: ({ row }) =>
          row.original.employers?.length ? row.original.employers.map(e => e.name).join(", ") : "—",
        enableSorting: sortableColumnIds.includes("employer"),
      },
      {
        accessorKey: "location",
        accessorFn: (row) => (row.locations ?? []).map(l => l.name).join(", "),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Locations" />
        ),
        cell: ({ row }) =>
          row.original.locations?.length
            ? row.original.locations.map(l => l.name).join(", ")
            : "—",
        enableSorting: sortableColumnIds.includes("location"),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => row.original.email || "—",
        enableSorting: sortableColumnIds.includes("email"),
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => row.original.phone || "—",
        enableSorting: sortableColumnIds.includes("phone"),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditEmployee(e)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteEmployee(e)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )
        },
      },
    ],
    [sortableColumnIds]
  )

  // Extract unique filter options from ALL data (not just current page)
  // We'll fetch these separately to get complete filter options with counts
  const [allFilterOptions, setAllFilterOptions] = useState<{
    roles: { label: string; value: string; count: number }[]
    employers: { label: string; value: string; count: number }[]
    locations: { label: string; value: string; count: number }[]
  }>({
    roles: [],
    employers: [],
    locations: []
  })

  // Fetch filter options separately
  const fetchFilterOptions = useCallback(async () => {
    try {
      // Fetch all employees to get complete filter options (without pagination)
      const res = await fetch('/api/employees?limit=10000')
      if (res.ok) {
        const data = await res.json()
        const allEmployees = data.employees || []
        
        // Count unique employees per role (not total assignments)
        const roleCounts = new Map<string, number>()
        allEmployees.forEach((emp: EmployeeRow) => {
          const employeeRoles = new Set<string>()
          emp.roles?.filter((r) => r.isActive).forEach((r) => {
            employeeRoles.add(r.role.name)
          })
          // Count each employee only once per role, even if they have multiple assignments
          employeeRoles.forEach(roleName => {
            roleCounts.set(roleName, (roleCounts.get(roleName) || 0) + 1)
          })
        })
        const roles = Array.from(roleCounts.entries()).map(([role, count]) => ({ 
          label: `${role} (${count})`, 
          value: role,
          count 
        }))

        // Count unique employees per employer
        const employerCounts = new Map<string, number>()
        allEmployees.forEach((emp: EmployeeRow) => {
          const employeeEmployers = new Set<string>()
          emp.employers?.forEach((e) => {
            employeeEmployers.add(e.name)
          })
          // Count each employee only once per employer
          employeeEmployers.forEach(employerName => {
            employerCounts.set(employerName, (employerCounts.get(employerName) || 0) + 1)
          })
        })
        const employers = Array.from(employerCounts.entries()).map(([employer, count]) => ({ 
          label: `${employer} (${count})`, 
          value: employer,
          count 
        }))

        // Count unique employees per location
        const locationCounts = new Map<string, number>()
        allEmployees.forEach((emp: EmployeeRow) => {
          const employeeLocations = new Set<string>()
          emp.locations?.forEach((l) => {
            employeeLocations.add(l.name)
          })
          // Count each employee only once per location
          employeeLocations.forEach(locationName => {
            locationCounts.set(locationName, (locationCounts.get(locationName) || 0) + 1)
          })
        })
        const locations = Array.from(locationCounts.entries()).map(([location, count]) => ({ 
          label: `${location} (${count})`, 
          value: location,
          count 
        }))

        setAllFilterOptions({ roles, employers, locations })
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    }
  }, [])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  const filterConfig = useMemo<FilterConfig[]>(() => {
    const configs: FilterConfig[] = []
    
    // Only show role filter if user has multiple managed roles or if there are multiple roles available
    if (allFilterOptions.roles.length > 1) {
      configs.push({ columnId: "role", title: "Role", options: allFilterOptions.roles })
    }
    
    // Only show employer filter if there are multiple employers among accessible employees
    if (allFilterOptions.employers.length > 1) {
      configs.push({ columnId: "employer", title: "Employer", options: allFilterOptions.employers })
    }
    
    // Only show location filter if there are multiple locations among accessible employees
    if (allFilterOptions.locations.length > 1) {
      configs.push({ columnId: "location", title: "Location", options: allFilterOptions.locations })
    }
    
    return configs
  }, [allFilterOptions])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-muted-foreground">
            Manage staff, roles, and timesheets.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            Search works across all employees. Click a row to view details and timesheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            mode="server"
            columns={columns}
            data={employees}
            totalCount={total}
            loading={loading}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employees..."
            showSearch={false}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPageIndex(0)
            }}
            pageSizeOptions={[10, 20, 30, 50]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            sortableColumnIds={["name", "pin", "email", "phone", "employer", "location"]}
            filterConfig={filterConfig}
            enableRowSelection={true}
            onRowClick={handleRowClick}
            emptyMessage="No employees yet. Click Add Employee to create one."
            getRowId={(row) => row.id}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            toolbar={(table) => (
              <CustomEmployeeToolbar
                table={table}
                searchValue={search}
                onSearchChange={setSearch}
                filterConfig={filterConfig}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
              />
            )}
          />
        </CardContent>
      </Card>

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={fetchEmployees}
      />

      {editEmployee && (
        <EditEmployeeDialog
          employee={editEmployee}
          open={!!editEmployee}
          onOpenChange={(open) => !open && setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null)
            fetchEmployees()
          }}
        />
      )}

      {deleteEmployee && (
        <DeleteEmployeeDialog
          employee={deleteEmployee}
          open={!!deleteEmployee}
          onOpenChange={(open) => !open && setDeleteEmployee(null)}
          onSuccess={() => {
            setDeleteEmployee(null)
            fetchEmployees()
          }}
        />
      )}
    </div>
  )
}
