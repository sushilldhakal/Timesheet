"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { ServerDataTable } from "@/components/ui/data-table"
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
  sortBy: string
  sortOrder: "asc" | "desc"
  onSort: (column: string) => void
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
  onSort,
  onRowClick,
  onEdit,
  onDelete,
}: Props) {
  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => onSort(column)}
    >
      {label}
      {sortBy === column ? (
        sortOrder === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUp className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => <SortableHeader column="name" label="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "—"}</span>
        ),
      },
      {
        accessorKey: "pin",
        header: () => <SortableHeader column="pin" label="PIN" />,
        cell: ({ row }) => row.original.pin,
      },
      {
        accessorKey: "role",
        accessorFn: (row) => (row.role ?? []).join(", "),
        header: () => <SortableHeader column="role" label="Roles" />,
        cell: ({ row }) =>
          row.original.role?.length ? row.original.role.join(", ") : "—",
      },
      {
        accessorKey: "employer",
        accessorFn: (row) => (row.employer ?? []).join(", "),
        header: () => <SortableHeader column="employer" label="Employers" />,
        cell: ({ row }) =>
          row.original.employer?.length ? row.original.employer.join(", ") : "—",
      },
      {
        accessorKey: "location",
        accessorFn: (row) => (row.location ?? []).join(", "),
        header: () => <SortableHeader column="location" label="Locations" />,
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
    [onEdit, onDelete, sortBy, sortOrder, onSort]
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
      getRowId={(row) => row.id}
      emptyMessage="No employees yet. Click Add Employee to create one."
      onRowClick={onRowClick}
    />
  )
}
