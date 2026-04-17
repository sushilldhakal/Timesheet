"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

type Props = {
  teamGroups: CategoryRow[]
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function TeamGroupsTable({ teamGroups, onEdit, onDelete }: Props) {
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Group name" />,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex items-center gap-2">
              {c.color && (
                <div
                  className="h-5 w-5 rounded border-2 border-gray-300 shrink-0"
                  style={{ backgroundColor: c.color }}
                />
              )}
              <span className="font-medium">{c.name}</span>
            </div>
          )
        },
      },
      {
        id: "description",
        header: () => <span>Description</span>,
        cell: ({ row }) => {
          const v = row.original.description
          return v ? (
            <span className="text-sm text-muted-foreground max-w-[320px] truncate block">{v}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )
        },
        enableSorting: false,
      },
      {
        id: "active",
        header: () => <span>Status</span>,
        cell: ({ row }) => {
          const active = row.original.isActive !== false
          return <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(c)}
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
    [onEdit, onDelete]
  )

  return (
    <DataTable
      columns={columns}
      data={teamGroups}
      searchKey="name"
      searchPlaceholder="Search team groups..."
      getRowId={(row) => row.id}
      emptyMessage="No team groups yet. Click Add Team Group to create one."
    />
  )
}

