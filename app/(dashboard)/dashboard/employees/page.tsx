"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { UserPlus, Pencil, Trash2 } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableToolbar } from "@/components/ui/data-table/data-table-toolbar"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import type { FilterConfig } from "@/components/ui/data-table/data-table-toolbar"
import { AddEmployeeDialog } from "./AddEmployeeDialog"
import { EditEmployeeDialog } from "./EditEmployeeDialog"
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog"

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
  }, [debouncedSearch, pageIndex, pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch])

  const handleRowClick = (row: EmployeeRow) => {
    router.push(`/dashboard/employees/${row.id}`)
  }

  const handleSortChange = (columnId: string, order: "asc" | "desc") => {
    setSortBy(columnId)
    setSortOrder(order)
    setPageIndex(0)
  }

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
        enableSorting: true,
      },
      {
        accessorKey: "pin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PIN" />
        ),
        cell: ({ row }) => row.original.pin,
        enableHiding: false,
        enableSorting: true,
      },
      {
        accessorKey: "role",
        accessorFn: (row) => {
          if (row.roles && row.roles.length > 0) {
            return row.roles.map((r) => r.role.name).join(", ")
          }
          return "—"
        },
        filterFn: (row, columnId, filterValue) => {
          const employeeRoles = row.original.roles
            ?.filter((r) => r.isActive)
            .map((r) => r.role.name) || []
          return filterValue.some((selectedRole: string) => 
            employeeRoles.includes(selectedRole)
          )
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
        enableSorting: true,
      },
      {
        accessorKey: "employer",
        accessorFn: (row) => (row.employers ?? []).map(e => e.name).join(", "),
        filterFn: (row, columnId, filterValue) => {
          const employeeEmployers = row.original.employers?.map(e => e.name) || []
          return filterValue.some((selectedEmployer: string) => 
            employeeEmployers.includes(selectedEmployer)
          )
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employers" />
        ),
        cell: ({ row }) =>
          row.original.employers?.length ? row.original.employers.map(e => e.name).join(", ") : "—",
        enableSorting: true,
      },
      {
        accessorKey: "location",
        accessorFn: (row) => (row.locations ?? []).map(l => l.name).join(", "),
        filterFn: (row, columnId, filterValue) => {
          const employeeLocations = row.original.locations?.map(l => l.name) || []
          return filterValue.some((selectedLocation: string) => 
            employeeLocations.includes(selectedLocation)
          )
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Locations" />
        ),
        cell: ({ row }) =>
          row.original.locations?.length
            ? row.original.locations.map(l => l.name).join(", ")
            : "—",
        enableSorting: true,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => row.original.email || "—",
        enableSorting: true,
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => row.original.phone || "—",
        enableSorting: true,
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
    []
  )

  // Extract unique filter options from data
  const filterConfig = useMemo<FilterConfig[]>(() => {
    const roles = Array.from(
      new Set(
        employees.flatMap((emp) =>
          emp.roles?.filter((r) => r.isActive).map((r) => r.role.name) || []
        )
      )
    ).map((role) => ({ label: role, value: role }))

    const employers = Array.from(
      new Set(employees.flatMap((emp) => emp.employers?.map((e) => e.name) || []))
    ).map((employer) => ({ label: employer, value: employer }))

    const locations = Array.from(
      new Set(employees.flatMap((emp) => emp.locations?.map((l) => l.name) || []))
    ).map((location) => ({ label: location, value: location }))

    return [
      { columnId: "role", title: "Role", options: roles },
      { columnId: "employer", title: "Employer", options: employers },
      { columnId: "location", title: "Location", options: locations },
    ].filter((config) => config.options.length > 0)
  }, [employees])

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
            sortableColumnIds={["name", "pin", "email", "phone", "role", "employer", "location"]}
            filterConfig={filterConfig}
            enableRowSelection={true}
            onRowClick={handleRowClick}
            emptyMessage="No employees yet. Click Add Employee to create one."
            getRowId={(row) => row.id}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            toolbar={(table) => (
              <DataTableToolbar
                table={table}
                searchKey="name"
                searchPlaceholder="Search employees..."
                filterConfig={filterConfig}
                searchValue={search}
                onSearchChange={setSearch}
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
