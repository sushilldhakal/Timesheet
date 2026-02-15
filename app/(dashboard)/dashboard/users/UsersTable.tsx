"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/ui/data-table"
import { RIGHT_LABELS } from "@/lib/config/rights"
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
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Username" />
        ),
        cell: ({ row }) => row.original.username,
        enableHiding: true,
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.role === "admin" ? "default" : "secondary"}
          >
            {row.original.role}
          </Badge>
        ),
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
              : "—"}
          </span>
        ),
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "rights",
        accessorFn: (row) =>
          (row.rights ?? [])
            .map((r) => RIGHT_LABELS[r as keyof typeof RIGHT_LABELS] ?? r)
            .join(", "),
        header: "Rights",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.rights?.length ? (
              row.original.rights.map((r) => (
                <Badge key={r} variant="outline" className="text-xs">
                  {RIGHT_LABELS[r as keyof typeof RIGHT_LABELS] ?? r}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
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
      searchKey="username"
      searchPlaceholder="Search users..."
      getRowId={(row) => row.id}
      emptyMessage="No users yet. Click Add User to create one."
    />
  )
}
