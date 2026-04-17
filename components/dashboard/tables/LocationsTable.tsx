"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import type { CategoryRow } from "@/components/dashboard/master-data/types"
import type { LocationTeam } from "@/lib/api/locations"

type Props = {
  locations: CategoryRow[]
  teamsAssignedByLocationId: Record<string, number>
  teamsByLocationId: Record<string, LocationTeam[] | undefined>
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function LocationsTable({
  locations,
  teamsAssignedByLocationId,
  teamsByLocationId,
  onEdit,
  onDelete,
}: Props) {
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        id: "expand",
        header: () => <span className="sr-only">Expand</span>,
        cell: ({ row }) => {
          const canExpand = row.getCanExpand()
          const isExpanded = row.getIsExpanded()
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canExpand}
              onClick={(e) => {
                e.stopPropagation()
                row.toggleExpanded()
              }}
              aria-label={isExpanded ? "Collapse location teams" : "Expand location teams"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
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
      },
      {
        id: "geofence",
        header: () => <span>Geofence</span>,
        cell: ({ row }) => {
          const mode = row.original.geofenceMode
          if (!mode) return <span className="text-muted-foreground/60">—</span>
          return (
            <Badge variant={mode === "hard" ? "destructive" : "secondary"}>
              {mode === "hard" ? "Hard" : "Soft"}
            </Badge>
          )
        },
        enableSorting: false,
      },
      {
        id: "operating_hours",
        header: () => <span>Operating Hours</span>,
        cell: ({ row }) => {
          const c = row.original
          if (c.openingHour != null && c.closingHour != null) {
            const formatHour = (hour: number) => {
              if (hour === 0) return "12 AM"
              if (hour < 12) return `${hour} AM`
              if (hour === 12) return "12 PM"
              if (hour === 24) return "12 AM"
              return `${hour - 12} PM`
            }
            return (
              <span className="text-muted-foreground text-sm">
                {formatHour(c.openingHour)} - {formatHour(c.closingHour)}
              </span>
            )
          }
          return <span className="text-muted-foreground/60">—</span>
        },
        enableSorting: false,
      },
      {
        id: "teams",
        header: () => <span>Teams</span>,
        cell: ({ row }) => {
          const n = teamsAssignedByLocationId[row.original.id]
          if (n === undefined) return <span className="text-muted-foreground/60 text-sm">…</span>
          return <span className="text-sm font-medium tabular-nums">{n}</span>
        },
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex flex-wrap gap-1">
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
    [onEdit, onDelete, teamsAssignedByLocationId]
  )

  return (
    <DataTable
      columns={columns}
      data={locations}
      searchKey="name"
      searchPlaceholder="Search locations..."
      getRowId={(row) => row.id}
      emptyMessage="No locations yet. Click Add to create one."
      getRowCanExpand={(row) => {
        const teams = teamsByLocationId[row.id]
        // Expandable even while loading so the user can open it.
        if (teams === undefined) return true
        return teams.length > 0
      }}
      renderExpandedRow={(row) => {
        const teams = teamsByLocationId[row.id]

        if (teams === undefined) {
          return (
            <div className="text-sm text-muted-foreground">
              Loading teams…
            </div>
          )
        }

        if (teams.length === 0) {
          return (
            <div className="text-sm text-muted-foreground">
              No teams assigned.
            </div>
          )
        }

        const active = teams.filter((t) => t.isActive)
        const inactive = teams.filter((t) => !t.isActive)

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Teams</span>
              <Badge variant="secondary">{active.length} active</Badge>
              {inactive.length > 0 && <Badge variant="outline">{inactive.length} inactive</Badge>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((t) => (
                <div
                  key={t.teamId}
                  className="rounded-md border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.teamName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t.employeeCount} employee{t.employeeCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <Badge variant={t.isActive ? "secondary" : "outline"}>
                      {t.isActive ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }}
    />
  )
}
