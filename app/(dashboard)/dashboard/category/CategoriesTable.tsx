"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Settings } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import type { CategoryRow, EntityType } from "./page"

type Props = {
  type: EntityType
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
  const router = useRouter()
  
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => {
      const base: ColumnDef<CategoryRow>[] = [
        {
          accessorKey: "name",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Name" />
          ),
          cell: ({ row }) => {
            const c = row.original
            // Show color badge with name for roles and employers
            if ((type === "team" || type === "employer") && c.color) {
              return (
                <div className="flex items-center gap-2">
                  <div 
                    className="h-5 w-5 rounded border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="font-medium">{c.name}</span>
                </div>
              )
            }
            return <span className="font-medium">{c.name}</span>
          },
        },
      ]
      
      // Add detailed columns for teams
      if (type === "team") {
        base.push(
          {
            id: "hours",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Hours/Week" />
            ),
            cell: ({ row }) => {
              const c = row.original
              const hours = c.defaultScheduleTemplate?.standardHoursPerWeek
              if (hours != null) {
                return (
                  <span className="text-sm font-medium">
                    {hours} hrs
                  </span>
                )
              }
              return <span className="text-muted-foreground/60">—</span>
            },
            enableSorting: true,
          },
          {
            id: "working_days",
            header: () => <span>Working Days</span>,
            cell: ({ row }) => {
              const c = row.original
              const days = c.defaultScheduleTemplate?.shiftPattern?.dayOfWeek
              if (days && Array.isArray(days) && days.length > 0) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
              const c = row.original
              const pattern = c.defaultScheduleTemplate?.shiftPattern
              if (pattern?.startHour != null && pattern?.endHour != null) {
                const formatHour = (hour: number) => {
                  if (hour === 0) return '12 AM'
                  if (hour < 12) return `${hour} AM`
                  if (hour === 12) return '12 PM'
                  if (hour === 24) return '12 AM'
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
              const c = row.original
              const description = c.defaultScheduleTemplate?.shiftPattern?.description
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
          }
        )
      }
      
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
          },
          {
            id: "operating_hours",
            header: () => <span>Operating Hours</span>,
            cell: ({ row }) => {
              const c = row.original
              if (c.openingHour != null && c.closingHour != null) {
                const formatHour = (hour: number) => {
                  if (hour === 0) return '12 AM'
                  if (hour < 12) return `${hour} AM`
                  if (hour === 12) return '12 PM'
                  if (hour === 24) return '12 AM'
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
              {/* Manage teams button for locations */}
              {type === "location" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => router.push(`/dashboard/locations/${c.id}/teams`)}
                >
                  <Settings className="h-4 w-4" />
                  Manage Teams
                </Button>
              )}
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
    [type, onEdit, onDelete, router]
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
