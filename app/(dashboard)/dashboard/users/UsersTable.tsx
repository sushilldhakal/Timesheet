"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import type { UserRow } from "./page"

type Props = {
  users: UserRow[]
  currentUserId?: string
  onEdit: (user: UserRow) => void
  onDelete: (user: UserRow) => void
  onRefresh: () => void
}

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onDelete,
}: Props) {
  const [sortBy, setSortBy] = useState<string | null>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "—"}</span>
        ),
        enableHiding: true,
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.email || "—"}</span>
        ),
        enableHiding: true,
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => {
          const role = row.original.role
          let variant: "default" | "secondary" | "outline" | "destructive" = "secondary"
          let label: string = role
          
          if (role === "admin") {
            variant = "destructive"
            label = "Admin"
          } else if (role === "manager") {
            variant = "default"
            label = "Manager"
          } else if (role === "supervisor") {
            variant = "secondary"
            label = "Supervisor"
          } else if (role === "accounts") {
            variant = "outline"
            label = "Accounts"
          } else if (role === "employee") {
            variant = "secondary"
            label = "Employee"
          } else if (role === "user") {
            variant = "secondary"
            label = "User"
          }
          
          return (
            <Badge variant={variant}>
              {label}
            </Badge>
          )
        },
        enableHiding: true,
      },
      {
        accessorKey: "location",
        accessorFn: (row) => (row.location ?? []).join(", "),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Locations" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.location?.length
              ? row.original.location.join(", ")
              : "All"}
          </span>
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const u = row.original
          const isSelf = u.id === currentUserId
          return (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(u)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(u)}
                disabled={isSelf}
                title={isSelf ? "Cannot delete your own account" : "Delete"}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [currentUserId, onEdit, onDelete]
  )

  return (
    <DataTable
      columns={columns}
      data={users}
      searchKey="email"
      searchPlaceholder="Search by email..."
      getRowId={(row) => row.id}
      emptyMessage="No users yet. Click Add User to create one."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={(columnId: string, order: "asc" | "desc") => {
        setSortBy(columnId)
        setSortOrder(order)
      }}
      sortableColumnIds={["name", "email", "role"]}
    />
  )
}
