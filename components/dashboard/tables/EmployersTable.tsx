"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

type Props = {
  employers: CategoryRow[]
  awardNameById: Record<string, string>
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function EmployersTable({ employers, awardNameById, onEdit, onDelete }: Props) {
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex items-center gap-2">
              {c.color && (
                <div
                  className="h-5 w-5 rounded border-2 border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
              )}
              <span className="font-medium">{c.name}</span>
            </div>
          )
        },
      },
      {
        id: "abn",
        header: () => <span>ABN</span>,
        cell: ({ row }) => {
          const v = row.original.abn
          return v ? (
            <span className="text-sm text-muted-foreground font-mono">{v}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )
        },
        enableSorting: false,
      },
      {
        id: "contact",
        header: () => <span>Contact</span>,
        cell: ({ row }) => {
          const email = row.original.contactEmail
          return email ? (
            <a href={`mailto:${email}`} className="text-sm text-primary hover:underline">
              {email}
            </a>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )
        },
        enableSorting: false,
      },
      {
        id: "award",
        header: () => <span>Award</span>,
        cell: ({ row }) => {
          const id = row.original.defaultAwardId
          if (!id) return <span className="text-muted-foreground/60">—</span>
          const name = awardNameById[id]
          return <span className="text-sm text-muted-foreground">{name || id}</span>
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
    [awardNameById, onEdit, onDelete]
  )

  return (
    <DataTable
      columns={columns}
      data={employers}
      searchKey="name"
      searchPlaceholder="Search employers..."
      getRowId={(row) => row.id}
      emptyMessage="No employers yet. Click Add to create one."
    />
  )
}
