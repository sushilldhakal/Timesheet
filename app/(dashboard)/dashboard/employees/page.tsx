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
import * as employeesApi from "@/lib/api/employees"
import type { Employee } from "@/lib/api/employees"
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
  onColumnFiltersChange,
  onFilterInteraction 
}: {
  table: any
  searchValue: string
  onSearchChange: (value: string) => void
  filterConfig: FilterConfig[]
  columnFilters: { id: string; value: string[] }[]
  onColumnFiltersChange: (filters: { id: string; value: string[] }[]) => void
  onFilterInteraction: () => void
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
                onOpenChange={(open) => {
                  if (open) {
                    onFilterInteraction()
                  }
                }}
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
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string | null>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null)
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnFilters, setColumnFilters] = useState<{ id: string; value: string[] }[]>([])
  const debouncedSearch = useDebounce(search, 300)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      // For "All" option, we need to fetch all employees using pagination
      if (pageSize >= 99999) {
        // Fetch all employees using pagination
        let allEmployees: Employee[] = []
        let offset = 0
        const limit = 1000 // Use maximum allowed limit
        let hasMore = true
        
        while (hasMore) {
          const params = {
            limit,
            offset,
            search: debouncedSearch || undefined,
            sortBy: sortBy || undefined,
            order: sortOrder,
            // Add server-side filters
            ...Object.fromEntries(
              columnFilters
                .filter(filter => filter.value.length > 0)
                .map(filter => [filter.id, filter.value.join(',')])
            )
          }
          
          const data = await employeesApi.getEmployees(params)
          const employees = data.employees || []
          allEmployees = [...allEmployees, ...employees]
          
          // Check if we got fewer employees than requested, meaning we've reached the end
          hasMore = employees.length === limit
          offset += limit
        }
        
        setEmployees(allEmployees)
        setTotal(allEmployees.length)
      } else {
        // Normal pagination
        const limit = pageSize
        const offset = pageIndex * pageSize
        
        const params = {
          limit,
          offset,
          search: debouncedSearch || undefined,
          sortBy: sortBy || undefined,
          order: sortOrder,
          // Add server-side filters
          ...Object.fromEntries(
            columnFilters
              .filter(filter => filter.value.length > 0)
              .map(filter => [filter.id, filter.value.join(',')])
          )
        }
        const data = await employeesApi.getEmployees(params)
        setEmployees(data.employees ?? [])
        setTotal(data.total ?? 0)
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

  // Load filters immediately on page load for better UX
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const handleRowClick = (row: Employee) => {
    router.push(`/dashboard/employees/${row.id}`)
  }

  const handleSortChange = (columnId: string, order: "asc" | "desc") => {
    setSortBy(columnId)
    setSortOrder(order)
    setPageIndex(0)
  }

  // Define sortable column IDs
  const sortableColumnIds = ["name", "pin", "role", "email", "phone", "employer", "location"]

  // Define columns
  const columns = useMemo<ColumnDef<Employee>[]>(
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
            const activeRoles = row.roles.filter((r) => r.isActive)
            const roleNames = activeRoles.map((r) => r.role.name).join(", ")
            return roleNames
          }
          return "—"
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Roles" />
        ),
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
                  {displayRoles.map((role, index) => (
                    <Badge
                      key={`${role.id}-${index}`}
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
                  <h4 className="text-sm font-semibold">Team Assignments</h4>
                  <div className="space-y-2">
                    {activeRoles.map((role, index) => (
                      <div
                        key={`${role.id}-${index}`}
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
        accessorFn: (row) => {
          const locationNames = (row.locations ?? []).map(l => l.name).join(", ")
          return locationNames
        },
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
  // We'll fetch these separately when user interacts with filters (lazy loading)
  const [allFilterOptions, setAllFilterOptions] = useState<{
    roles: { label: string; value: string; count: number }[]
    employers: { label: string; value: string; count: number }[]
    locations: { label: string; value: string; count: number }[]
  }>({
    roles: [],
    employers: [],
    locations: []
  })
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)

  // Lazy load filter options when user first interacts with filters
  const fetchFilterOptions = useCallback(async () => {
    if (filtersLoaded || filtersLoading) return
    
    setFiltersLoading(true)
    try {
      const data = await employeesApi.getEmployeeFilters()
      
      const roles = data.roles.map(role => ({
        label: `${role.name} (${role.count})`,
        value: role.name,
        count: role.count
      }))
      
      const employers = data.employers.map(employer => ({
        label: `${employer.name} (${employer.count})`,
        value: employer.name,
        count: employer.count
      }))
      
      const locations = data.locations.map(location => ({
        label: `${location.name} (${location.count})`,
        value: location.name,
        count: location.count
      }))

      setAllFilterOptions({ roles, employers, locations })
      setFiltersLoaded(true)
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    } finally {
      setFiltersLoading(false)
    }
  }, [filtersLoaded, filtersLoading])

  // Trigger filter loading when user interacts with filter UI
  const handleFilterInteraction = useCallback(() => {
    if (!filtersLoaded && !filtersLoading) {
      fetchFilterOptions()
    }
  }, [fetchFilterOptions, filtersLoaded, filtersLoading])



  const filterConfig = useMemo<FilterConfig[]>(() => {
    const configs: FilterConfig[] = []
    
    // Show placeholder filters immediately, then populate with real data
    if (!filtersLoaded) {
      // Show common filter placeholders while loading
      configs.push({ 
        columnId: "role", 
        title: filtersLoading ? "Role (loading...)" : "Role", 
        options: [] 
      })
      configs.push({ 
        columnId: "employer", 
        title: filtersLoading ? "Employer (loading...)" : "Employer", 
        options: [] 
      })
      configs.push({ 
        columnId: "location", 
        title: filtersLoading ? "Location (loading...)" : "Location", 
        options: [] 
      })
      return configs
    }
    
    // Once loaded, only show filters with multiple options
    if (allFilterOptions.roles.length > 1) {
      configs.push({ columnId: "role", title: "Role", options: allFilterOptions.roles })
    }
    
    if (allFilterOptions.employers.length > 1) {
      configs.push({ columnId: "employer", title: "Employer", options: allFilterOptions.employers })
    }
    
    if (allFilterOptions.locations.length > 1) {
      configs.push({ columnId: "location", title: "Location", options: allFilterOptions.locations })
    }
    
    return configs
  }, [allFilterOptions, filtersLoaded, filtersLoading])

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

      <Card className="border-none shadow-none ring-0">
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
            pageSizeOptions={[10, 20, 30, 50, 100]}
            showAllOption={true}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            sortableColumnIds={["name", "pin", "role", "email", "phone", "employer", "location"]}
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
                onFilterInteraction={handleFilterInteraction}
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
          key={`edit-${editEmployee.id}`}
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
          key={`delete-${deleteEmployee.id}`}
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