"use client"

import { useMemo, useState, useCallback } from "react"
import { ColumnDef, type SortingState } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Power, PowerOff, GripVertical } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import type { CategoryRow } from "@/components/dashboard/master-data/types"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils/cn"

const DEFAULT_TEAM_TABLE_SORT: SortingState = [
  { id: "order", desc: false },
  { id: "name", desc: false },
]

type Props = {
  teams: CategoryRow[]
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
  onToggleActive?: (row: CategoryRow) => void
  onSelectionChange?: (selectedRows: CategoryRow[]) => void
  onReorder?: (teamId: string, newOrder: number) => Promise<void>
  enableDragReorder?: boolean
}

export function TeamsTable({
  teams,
  onEdit,
  onDelete,
  onToggleActive,
  onSelectionChange,
  onReorder,
  enableDragReorder = true,
}: Props) {
  const [orderedTeams, setOrderedTeams] = useState<CategoryRow[]>(teams)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update orderedTeams when teams prop changes
  useMemo(() => {
    setOrderedTeams(teams)
  }, [teams])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = orderedTeams.findIndex((t) => t.id === active.id)
        const newIndex = orderedTeams.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(orderedTeams, oldIndex, newIndex)
          setOrderedTeams(newOrder)

          // Update order values and make API calls
          if (onReorder) {
            setIsReordering(true)
            try {
              // Update order values for all affected teams
              const updates = newOrder.map((team, index) => ({
                id: team.id,
                newOrder: index,
              }))

              // Make API calls for teams that changed position
              await Promise.all(
                updates
                  .filter(
                    (update) =>
                      update.newOrder !==
                      teams.findIndex((t) => t.id === update.id)
                  )
                  .map((update) => onReorder(update.id, update.newOrder))
              )
            } finally {
              setIsReordering(false)
            }
          }
        }
      }
    },
    [orderedTeams, teams, onReorder]
  )
  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      ...(enableDragReorder
        ? [
            {
              id: "drag-handle",
              header: () => null,
              cell: ({ row }: { row: any }) => {
                return <DragHandleCell teamId={row.original.id} isReordering={isReordering} />
              },
              enableSorting: false,
              enableHiding: false,
              size: 40,
            } as ColumnDef<CategoryRow>,
          ]
        : []),
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Team name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "order",
        accessorFn: (row) => row.order ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.order ?? 0}</span>
        ),
        enableSorting: true,
        enableHiding: true,
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
          const active = c.isActive !== false
          return (
            <div className="flex gap-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${active ? "text-amber-500 hover:text-amber-600" : "text-green-600 hover:text-green-700"}`}
                      onClick={() => onToggleActive?.(c)}
                    >
                      {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      <span className="sr-only">{active ? "Deactivate" : "Activate"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{active ? "Deactivate" : "Activate"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
    [onEdit, onDelete, onToggleActive]
  )

  const teamIds = orderedTeams.map((t) => t.id)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={teamIds} strategy={verticalListSortingStrategy}>
        <DataTable
          columns={columns}
          data={orderedTeams}
          searchKey="name"
          searchPlaceholder="Search teams..."
          getRowId={(row) => row.id}
          emptyMessage="No teams yet. Click Add to create one."
          initialSorting={DEFAULT_TEAM_TABLE_SORT}
          initialColumnVisibility={{ order: false }}
          enableRowSelection
          onRowSelectionChange={onSelectionChange}
          toolbar={(table) => (
            <div className="flex items-center justify-end gap-2 py-1">
              {enableDragReorder && (
                <div className="text-xs text-muted-foreground">
                  {isReordering ? "Updating order..." : "Drag to reorder teams"}
                </div>
              )}
              <DataTableViewOptions table={table} />
            </div>
          )}
        />
      </SortableContext>
    </DndContext>
  )
}

/**
 * Draggable handle cell for reordering teams
 */
function DragHandleCell({
  teamId,
  isReordering,
}: {
  teamId: string
  isReordering: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: teamId,
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex h-8 w-8 items-center justify-center cursor-grab active:cursor-grabbing rounded hover:bg-accent transition-colors",
        isDragging && "bg-accent opacity-50",
        isReordering && "opacity-50 cursor-not-allowed"
      )}
      title="Drag to reorder teams"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}
