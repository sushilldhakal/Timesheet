"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { ServerDataTable } from "@/components/ui/data-table"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import type { EmployeeRow } from "./page"

type Props = {
  employees: EmployeeRow[]
  total: number
  loading: boolean
  search: string
  onSearchChange: (v: string) => void
  pageIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  sortBy: string | null
  sortOrder: "asc" | "desc"
  onSortChange: (columnId: string, order: "asc" | "desc") => void
  onRowClick: (row: EmployeeRow) => void
  onEdit: (e: EmployeeRow) => void
  onDelete: (e: EmployeeRow) => void
}

export function EmployeesTable({
  employees,
  total,
  loading,
  search,
  onSearchChange,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
  onRowClick,
  onEdit,
  onDelete,
}: Props) {
  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "—"}</span>
        ),
      },
      {
        accessorKey: "pin",
        header: "PIN",
        cell: ({ row }) => row.original.pin,
      },
      {
        accessorKey: "role",
        accessorFn: (row) => {
          // Use roleAssignments if available, fallback to role array
          if (row.roleAssignments && row.roleAssignments.length > 0) {
            return row.roleAssignments.map(ra => ra.roleName).join(", ")
          }
          return (row.role ?? []).join(", ")
        },
        header: "Roles",
        cell: ({ row }) => {
          const roleAssignments = row.original.roleAssignments
          
          // Use roleAssignments if available
          if (roleAssignments && roleAssignments.length > 0) {
            const activeRoles = roleAssignments.filter(ra => ra.isActive)
            
            if (activeRoles.length === 0) {
              return <span className="text-muted-foreground">—</span>
            }
            
            if (activeRoles.length === 1) {
              const role = activeRoles[0]
              return (
                <div className="flex items-center gap-2">
                  {role.roleColor && (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: role.roleColor }}
                    />
                  )}
                  <span>{role.roleName}</span>
                </div>
              )
            }
            
            // Multiple roles - show first 2 with hover card
            const displayRoles = activeRoles.slice(0, 2)
            const remainingCount = activeRoles.length - 2
            
            return (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer">
                    {displayRoles.map((role, idx) => (
                      <Badge
                        key={role.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {role.roleColor && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: role.roleColor }}
                          />
                        )}
                        {role.roleName}
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
                          {role.roleColor && (
                            <div
                              className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: role.roleColor }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{role.roleName}</div>
                            <div className="text-xs text-muted-foreground">
                              {role.locationName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )
          }
          
          // Fallback to old role array
          return row.original.role?.length ? row.original.role.join(", ") : "—"
        },
      },
      {
        accessorKey: "employer",
        accessorFn: (row) => (row.employer ?? []).join(", "),
        header: "Employers",
        cell: ({ row }) =>
          row.original.employer?.length ? row.original.employer.join(", ") : "—",
      },
      {
        accessorKey: "location",
        accessorFn: (row) => (row.location ?? []).join(", "),
        header: "Locations",
        cell: ({ row }) =>
          row.original.location?.length
            ? row.original.location.join(", ")
            : "—",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "—",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone || "—",
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(e)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(e)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )
        },
      },
    ],
    [onEdit, onDelete]
  )

  return (
    <ServerDataTable<EmployeeRow, unknown>
      columns={columns}
      data={employees}
      totalCount={total}
      loading={loading}
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search employees..."
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      sortableColumnIds={["name", "pin", "email", "phone", "roles", "location", "employer"]}
      getRowId={(row) => row.id}
      emptyMessage="No employees yet. Click Add Employee to create one."
      onRowClick={onRowClick}
    />
  )
}
