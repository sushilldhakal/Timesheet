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
  teams: CategoryRow[]
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function TeamsTable({ teams, onEdit, onDelete }: Props) {
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Team name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "team_group",
        header: () => <span>Team group</span>,
        cell: ({ row }) => {
          const g = row.original.teamGroup
          return g ? (
            <span className="text-sm text-muted-foreground">{g}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )
        },
        enableSorting: false,
      },
      {
        id: "staff",
        accessorKey: "staffCount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Staff" />,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.staffCount ?? 0}</span>
        ),
        enableSorting: true,
      },
      {
        id: "managers",
        accessorKey: "managerCount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Managers" />,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{row.original.managerCount ?? 0}</span>
        ),
        enableSorting: true,
      },
      {
        id: "colour",
        header: () => <span>Colour</span>,
        cell: ({ row }) => {
          const c = row.original.color
          if (!c) return <span className="text-muted-foreground/60">—</span>
          return (
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded border-2 border-gray-300 shrink-0"
                style={{ backgroundColor: c }}
                title={c}
              />
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[88px]">{c}</span>
            </div>
          )
        },
        enableSorting: false,
      },
      {
        id: "active",
        header: () => <span>Status</span>,
        cell: ({ row }) => {
          const active = row.original.isActive !== false
          return (
            <Badge variant={active ? "default" : "secondary"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          )
        },
        enableSorting: false,
      },
      {
        id: "hours",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hours/Week" />,
        cell: ({ row }) => {
          const hours = row.original.defaultScheduleTemplate?.standardHoursPerWeek
          if (hours != null) {
            return <span className="text-sm font-medium">{hours} hrs</span>
          }
          return <span className="text-muted-foreground/60">—</span>
        },
        enableSorting: true,
      },
      {
        id: "working_days",
        header: () => <span>Working Days</span>,
        cell: ({ row }) => {
          const days = row.original.defaultScheduleTemplate?.shiftPattern?.dayOfWeek
          if (days && Array.isArray(days) && days.length > 0) {
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            const sortedDays = [...days].sort()
            return (
              <div className="flex flex-wrap gap-1">
                {sortedDays.map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                  >
                    {dayNames[day]}
                  </span>
                ))}
              </div>
            )
          }
          return <span className="text-muted-foreground/60">—</span>
        },
        enableSorting: false,
      },
      {
        id: "shift_hours",
        header: () => <span>Shift Hours</span>,
        cell: ({ row }) => {
          const pattern = row.original.defaultScheduleTemplate?.shiftPattern
          if (pattern?.startHour != null && pattern?.endHour != null) {
            const formatHour = (hour: number) => {
              if (hour === 0) return "12 AM"
              if (hour < 12) return `${hour} AM`
              if (hour === 12) return "12 PM"
              if (hour === 24) return "12 AM"
              return `${hour - 12} PM`
            }
            return (
              <span className="text-sm text-muted-foreground">
                {formatHour(pattern.startHour)} - {formatHour(pattern.endHour)}
              </span>
            )
          }
          return <span className="text-muted-foreground/60">—</span>
        },
        enableSorting: false,
      },
      {
        id: "description",
        header: () => <span>Description</span>,
        cell: ({ row }) => {
          const description = row.original.defaultScheduleTemplate?.shiftPattern?.description
          if (description) {
            return (
              <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                {description}
              </span>
            )
          }
          return <span className="text-muted-foreground/60">—</span>
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
      data={teams}
      searchKey="name"
      searchPlaceholder="Search teams..."
      getRowId={(row) => row.id}
      emptyMessage="No teams yet. Click Add to create one."
    />
  )
}
