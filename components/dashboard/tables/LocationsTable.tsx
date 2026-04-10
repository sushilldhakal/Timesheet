"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Settings } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import type { CategoryRow } from "@/components/dashboard/master-data/types"

function LocationMapThumb({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.008
  const minLon = lng - d
  const minLat = lat - d
  const maxLon = lng + d
  const maxLat = lat + d
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=map&marker=${lat}%2C${lng}`
  return (
    <div className="w-[100px] h-[56px] rounded border overflow-hidden bg-muted shrink-0">
      <iframe title="Map preview" src={src} className="w-full h-full border-0 pointer-events-none" loading="lazy" />
    </div>
  )
}

type Props = {
  locations: CategoryRow[]
  teamsAssignedByLocationId: Record<string, number>
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function LocationsTable({
  locations,
  teamsAssignedByLocationId,
  onEdit,
  onDelete,
}: Props) {
  const router = useRouter()

  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        id: "map",
        header: () => <span className="sr-only">Map</span>,
        cell: ({ row }) => {
          const c = row.original
          if (c.lat != null && c.lng != null) {
            return <LocationMapThumb lat={c.lat} lng={c.lng} />
          }
          return <span className="text-muted-foreground/60 text-xs">No coords</span>
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
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => router.push(`/dashboard/locations/${c.id}/teams`)}
              >
                <Settings className="h-4 w-4" />
                Manage Teams
              </Button>
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
    [onEdit, onDelete, router, teamsAssignedByLocationId]
  )

  return (
    <DataTable
      columns={columns}
      data={locations}
      searchKey="name"
      searchPlaceholder="Search locations..."
      getRowId={(row) => row.id}
      emptyMessage="No locations yet. Click Add to create one."
    />
  )
}
