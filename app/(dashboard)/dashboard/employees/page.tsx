"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
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
import { AddEmployeeDialog } from "../../../../components/employees/AddEmployeeDialog"
import { EditEmployeeDialog } from "../../../../components/employees/EditEmployeeDialog"
import { DeleteEmployeeDialog } from "../../../../components/employees/DeleteEmployeeDialog"
import { useDashboardLocationScope } from "@/components/providers/DashboardLocationScopeProvider"
import { useEmployerSettings } from "@/lib/queries/employers"

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
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: (filters: ColumnFiltersState) => void
  onFilterInteraction: () => void
}) {
  const hasFilters = columnFilters.some(filter => {
    const value = filter.value as string[] | undefined
    return value && value.length > 0
  })

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
          const selectedValues = (currentFilter?.value as string[]) || []
          
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

export default function EmployeesPage() {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null)
  const [columnVisibility, setColumnVisibility] = useState({})
  const { selectedLocationIds, isReady: locationScopeReady } = useDashboardLocationScope()
  const { data: employerSettings } = useEmployerSettings()
  const enableExternalHire = employerSettings?.enableExternalHire ?? false

  // For refetching after mutations
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Fetch function for virtual mode
  const fetchEmployeesPage = useCallback(async (params: {
    limit: number
    offset: number
    search?: string
    sortBy?: string
    order?: 'asc' | 'desc'
    [key: string]: any
  }) => {
    // Don't fetch until location scope is ready
    if (!locationScopeReady) {
      return { employees: [], total: 0 }
    }

    try {
      const apiParams: any = {
        limit: params.limit,
        offset: params.offset,
        search: params.search || undefined,
        sortBy: params.sortBy || undefined,
        order: params.order,
        // Prefer stable locationId scoping from dashboard header
        locationId: selectedLocationIds.length > 0 ? selectedLocationIds.join(',') : undefined,
      }

      // Add filters from params (team, employer, etc.)
      Object.keys(params).forEach(key => {
        if (!['limit', 'offset', 'search', 'sortBy', 'order'].includes(key)) {
          apiParams[key] = params[key]
        }
      })

      const data = await employeesApi.getEmployees(apiParams)
      return {
        employees: data.employees ?? [],
        total: data.total ?? 0
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      return { employees: [], total: 0 }
    }
  }, [locationScopeReady, selectedLocationIds, refreshTrigger])

  const handleRowClick = (row: Employee) => {
    router.push(`/dashboard/employees/${row.id}`)
  }

  // Define columns
  const columns = useMemo<ColumnDef<Employee>[]>(
    () => {
      const allColumns: ColumnDef<Employee>[] = [
     
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "—"}</span>
        ),
        enableHiding: false,
        enableSorting: true,
        size: 200,
      },
      {
        accessorKey: "pin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PIN" />
        ),
        cell: ({ row }) => row.original.pin,
        enableHiding: false,
        enableSorting: true,
        size: 100,
      },
      {
        accessorKey: "team",
        accessorFn: (row) => {
          if (row.teams && row.teams.length > 0) {
            const activeTeams = row.teams.filter((t) => t.isActive)
            const teamNames = activeTeams.map((t) => t.team.name).join(", ")
            return teamNames
          }
          return "—"
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Teams" />
        ),
        cell: ({ row }) => {
          const teams = row.original.teams
          
          if (!teams || teams.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          
          const activeTeams = teams.filter((t) => t?.isActive && t?.team)
            
          if (activeTeams.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          
          if (activeTeams.length === 1) {
            const team = activeTeams[0]
            return (
              <div className="flex items-center gap-2">
                {team.team?.color && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: team.team.color }}
                  />
                )}
                <span>{team.team?.name || '—'}</span>
              </div>
            )
          }
          
          const displayTeams = activeTeams.slice(0, 1)
          const remainingCount = activeTeams.length - 1
          
          return (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {displayTeams[0].team?.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: displayTeams[0].team.color }}
                      />
                    )}
                    {displayTeams[0].team?.name || '—'}
                  </Badge>
                  {remainingCount > 0 && (
                    <Badge variant="outline">+{remainingCount}</Badge>
                  )}
                </div>
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-80 z-[9999]" 
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={16}
                avoidCollisions={true}
              >
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Team Assignments</h4>
                  <div className="space-y-2">
                    {activeTeams.map((team, index) => (
                      <div
                        key={`${team.id}-${index}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        {team.team?.color && (
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                            style={{ backgroundColor: team.team.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{team.team?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {team.location?.name || '—'}
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
        enableSorting: true,
        size: 180,
      },
      {
        accessorKey: "employer",
        accessorFn: (row) => (row.employers ?? []).map(e => e.name).join(", "),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employers" />
        ),
        cell: ({ row }) =>
          row.original.employers?.length ? row.original.employers.map(e => e.name).join(", ") : "—",
        enableSorting: true,
        size: 150,
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
        cell: ({ row }) => {
          const locations = row.original.locations
          
          if (!locations || locations.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          
          if (locations.length === 1) {
            return <span>{locations[0].name}</span>
          }
          
          const displayLocations = locations.slice(0, 1)
          const remainingCount = locations.length - 1
          
          return (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  <Badge variant="secondary">
                    {displayLocations[0].name}
                  </Badge>
                  {remainingCount > 0 && (
                    <Badge variant="outline">+{remainingCount}</Badge>
                  )}
                </div>
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-80 z-[9999]" 
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={16}
                avoidCollisions={true}
              >
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Locations</h4>
                  <div className="space-y-2">
                    {locations.map((location, index) => (
                      <div
                        key={`${location.id}-${index}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{location.name}</div>
                          {location.address && (
                            <div className="text-xs text-muted-foreground">
                              {location.address}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )
        },
        enableSorting: true,
        size: 180,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => row.original.email || "—",
        enableSorting: true,
        size: 200,
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => row.original.phone || "—",
        enableSorting: true,
        size: 140,
      },
      {
        id: "status",
        accessorFn: (row) => {
          const isActive = (row as any).isActive !== false
          const onboarded = (row as any).onboardingCompleted === true
          if (!isActive) return "inactive"
          return onboarded ? "onboarded" : "pending"
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const e: any = row.original as any
          const isActive = e.isActive !== false
          const onboarded = e.onboardingCompleted === true

          if (!isActive) return <Badge variant="secondary">Inactive</Badge>
          if (onboarded) return <Badge variant="default">Onboarded</Badge>
          return <Badge variant="outline">Pending</Badge>
        },
        enableSorting: true,
        size: 120,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Actions" />
        ),
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
        size: 100,
      },
    ]
    return enableExternalHire ? allColumns : allColumns.filter(c => (c as any).accessorKey !== 'employer')
  },
    [enableExternalHire]
  )

  // Extract unique filter options from ALL data (not just current page)
  // We'll fetch these separately when user interacts with filters (lazy loading)
  const [allFilterOptions, setAllFilterOptions] = useState<{
    teams: { label: string; value: string; count: number }[]
    employers: { label: string; value: string; count: number }[]
  }>({
    teams: [],
    employers: []
  })
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)

  // Lazy load filter options when user first interacts with filters
  const fetchFilterOptions = useCallback(async () => {
    if (filtersLoading || !locationScopeReady) return
    
    setFiltersLoading(true)
    try {
      // Pass the selected locationId to get tenant-safe, location-specific filters
      const locationIdParam = selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined
      const data = await employeesApi.getEmployeeFilters({ locationId: locationIdParam })
      
      const teams = data.teams.map(team => ({
        label: `${team.name} (${team.count})`,
        value: team.name,
        count: team.count
      }))
      
      const employers = data.employers.map(employer => ({
        label: `${employer.name} (${employer.count})`,
        value: employer.name,
        count: employer.count
      }))

      setAllFilterOptions({ teams, employers })
      setFiltersLoaded(true)
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
      // On error, still mark as loaded to prevent infinite retries
      setFiltersLoaded(true)
    } finally {
      setFiltersLoading(false)
    }
  }, [filtersLoading, locationScopeReady, selectedLocationIds])

  // Refetch filters when location changes
  React.useEffect(() => {
    if (filtersLoaded && locationScopeReady) {
      setFiltersLoaded(false)
      setAllFilterOptions({ teams: [], employers: [] })
    }
  }, [selectedLocationIds, locationScopeReady])

  // Trigger filter loading when user interacts with filter UI
  const handleFilterInteraction = useCallback(() => {
    if (!filtersLoaded && !filtersLoading) {
      fetchFilterOptions()
    }
  }, [fetchFilterOptions, filtersLoaded, filtersLoading])



  const filterConfig = useMemo<FilterConfig[]>(() => {
    const configs: FilterConfig[] = []
    
    // Always show both filters - either with placeholder or real data
    // Team filter
    if (!filtersLoaded) {
      configs.push({ 
        columnId: "team", 
        title: filtersLoading ? "Team (loading...)" : "Team", 
        options: [] 
      })
    } else if (allFilterOptions.teams.length > 0) {
      configs.push({ 
        columnId: "team", 
        title: "Team", 
        options: allFilterOptions.teams 
      })
    } else {
      // Even if no options, show the filter
      configs.push({ 
        columnId: "team", 
        title: "Team", 
        options: [] 
      })
    }
    
    // Employer filter - only show when external hire is enabled
    if (enableExternalHire) {
      if (!filtersLoaded) {
        configs.push({ 
          columnId: "employer", 
          title: filtersLoading ? "Employer (loading...)" : "Employer", 
          options: [] 
        })
      } else if (allFilterOptions.employers.length > 0) {
        configs.push({ 
          columnId: "employer", 
          title: "Employer", 
          options: allFilterOptions.employers 
        })
      } else {
        // Even if no options, show the filter
        configs.push({ 
          columnId: "employer", 
          title: "Employer", 
          options: [] 
        })
      }
    }
    
    return configs
  }, [allFilterOptions, filtersLoaded, filtersLoading, enableExternalHire])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-muted-foreground">
            Manage staff, teams, and timesheets.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <DataTable
        mode="virtual"
        columns={columns}
        fetchPage={fetchEmployeesPage}
        pageSize={50}
        filterConfig={filterConfig}
        enableRowSelection={true}
        onRowClick={handleRowClick}
        emptyMessage="No employees yet. Click Add Employee to create one."
        getRowId={(row) => row.id}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        toolbar={(table, search, setSearch, columnFilters, setColumnFilters) => (
          <CustomEmployeeToolbar
            table={table}
            searchValue={search || ""}
            onSearchChange={setSearch || (() => {})}
            filterConfig={filterConfig}
            columnFilters={columnFilters || []}
            onColumnFiltersChange={setColumnFilters || (() => {})}
            onFilterInteraction={handleFilterInteraction}
          />
        )}
      />

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={refreshData}
      />

      {editEmployee && (
        <EditEmployeeDialog
          key={`edit-${editEmployee.id}`}
          employee={editEmployee}
          open={!!editEmployee}
          onOpenChange={(open) => !open && setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null)
            refreshData()
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
            refreshData()
          }}
        />
      )}
    </div>
  )
}
