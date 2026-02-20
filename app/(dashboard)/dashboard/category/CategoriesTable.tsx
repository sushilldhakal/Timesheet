"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/ui/data-table"
import type { CategoryRow } from "./page"
import type { CategoryType } from "@/lib/config/category-types"

type Props = {
  type: CategoryType
  categories: CategoryRow[]
  onEdit: (category: CategoryRow) => void
  onDelete: (category: CategoryRow) => void
  onRefresh: () => void
}

export function CategoriesTable({
  type,
  categories,
  onEdit,
  onDelete,
}: Props) {
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => {
      const base: ColumnDef<CategoryRow>[] = [
        {
          accessorKey: "name",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Name" />
          ),
          cell: ({ row }) => (
            <span className="font-medium">{row.original.name}</span>
          ),
        },
      ]
      if (type === "location") {
        base.push(
          {
            id: "coordinates",
            header: () => <span>Coordinates</span>,
            cell: ({ row }) => {
              const c = row.original
              if (c.lat != null && c.lng != null) {
                return (
                  <span className="text-muted-foreground text-sm font-mono">
                    {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                  </span>
                )
              }
              return <span className="text-muted-foreground/60">—</span>
            },
            enableSorting: false,
          },
          {
            id: "range",
            header: () => <span>Range (m)</span>,
            cell: ({ row }) => {
              const c = row.original
              return (
                <span className="text-muted-foreground text-sm">
                  {c.radius != null ? `${c.radius}m` : "—"}
                </span>
              )
            },
            enableSorting: false,
          }
        )
      }
      base.push({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(c)}
              >
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
      })
      return base
    },
    [type, onEdit, onDelete]
  )

  return (
    <DataTable
      columns={columns}
      data={categories}
      searchKey="name"
      searchPlaceholder={`Search ${type}...`}
      getRowId={(row) => row.id}
      emptyMessage={`No ${type}s yet. Click Add to create one.`}
    />
  )
}
