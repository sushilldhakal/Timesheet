"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table"

export interface InactiveEmployee {
  id: string
  name: string
  pin: string
  lastPunchDate: string | null
  daysInactive: number
}

type Props = {
  employees: InactiveEmployee[]
  onDelete: (id: string) => void
  deleting: boolean
}

export function InactiveEmployeesTable({ employees, onDelete, deleting }: Props) {
  const columns = useMemo<ColumnDef<InactiveEmployee>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/employees/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "pin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PIN" />
        ),
        cell: ({ row }) => row.original.pin,
      },
      {
        accessorKey: "lastPunchDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last punch" />
        ),
        cell: ({ row }) => row.original.lastPunchDate ?? "Never",
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.lastPunchDate
          const b = rowB.original.lastPunchDate
          if (!a && !b) return 0
          if (!a) return 1
          if (!b) return -1
          return a.localeCompare(b)
        },
      },
      {
        accessorKey: "daysInactive",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Days inactive" />
        ),
        cell: ({ row }) => (
          <div className="text-right">{row.original.daysInactive}</div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(row.original.id)}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onDelete, deleting]
  )

  return (
    <DataTable<InactiveEmployee, unknown>
      columns={columns}
      data={employees}
      getRowId={(row) => row.id}
      emptyMessage="No inactive employees (everyone has punched in the last 100 days)."
    />
  )
}
