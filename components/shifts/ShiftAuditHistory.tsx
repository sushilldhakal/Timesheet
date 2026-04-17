"use client"

import { useShiftHistory } from "@/lib/hooks/use-shift-history"
import type { ShiftHistoryEvent, ShiftEventAction } from "@/lib/hooks/use-shift-history"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Trash2,
  Clock,
  Coffee,
  User,
  Briefcase,
  MapPin,
  RefreshCw,
  LogIn,
  LogOut,
  Pause,
  Play,
  Edit,
  type LucideIcon,
} from "lucide-react"

// ── Action metadata ────────────────────────────────────────────────────────────
const ACTION_META: Record<ShiftEventAction, { icon: LucideIcon; label: string }> = {
  created:            { icon: Plus,       label: "Shift created" },
  deleted:            { icon: Trash2,     label: "Shift deleted" },
  time_changed:       { icon: Clock,      label: "Time updated" },
  break_changed:      { icon: Coffee,     label: "Break updated" },
  employee_changed:   { icon: User,       label: "Employee changed" },
  role_changed:       { icon: Briefcase,  label: "Role changed" },
  location_changed:   { icon: MapPin,     label: "Location changed" },
  status_changed:     { icon: RefreshCw,  label: "Status changed" },
  pay_calculated:     { icon: RefreshCw,  label: "Pay calculated" },
  pay_approved:       { icon: RefreshCw,  label: "Pay approved" },
  clocked_in:         { icon: LogIn,      label: "Clocked in" },
  clocked_out:        { icon: LogOut,     label: "Clocked out" },
  break_started:      { icon: Pause,      label: "Break started" },
  break_ended:        { icon: Play,       label: "Break ended" },
  multi_field_change: { icon: Edit,       label: "Multiple fields updated" },
}

const SYSTEM_ACTIONS: ShiftEventAction[] = ["clocked_in", "clocked_out", "break_started", "break_ended"]

// ── Actor badge ────────────────────────────────────────────────────────────────
function ActorBadge({ actorType }: { actorType: "user" | "employee" | "system" }) {
  if (actorType === "user") {
    return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">User</Badge>
  }
  if (actorType === "employee") {
    return <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Employee</Badge>
  }
  return <Badge variant="secondary" className="text-xs">System</Badge>
}

// ── Diff display ───────────────────────────────────────────────────────────────
function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "string") {
    // ISO date string → show time only
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      try {
        return new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } catch {
        return val
      }
    }
    return val
  }
  return String(val)
}

function DiffDisplay({
  before,
  after,
  changedFields,
}: {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  changedFields: string[]
}) {
  if (!before && !after) return null
  const fields = changedFields.length > 0 ? changedFields : Object.keys({ ...before, ...after })
  const diffs = fields.filter((f) => {
    const b = JSON.stringify(before?.[f])
    const a = JSON.stringify(after?.[f])
    return b !== a
  })
  if (diffs.length === 0) return null

  return (
    <div className="mt-1.5 space-y-0.5">
      {diffs.map((field) => (
        <div key={field} className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground capitalize">{field.replace(/([A-Z])/g, " $1").trim()}:</span>
          {before?.[field] !== undefined && (
            <span className="text-muted-foreground line-through">
              {formatFieldValue(before[field])}
            </span>
          )}
          <span className="text-muted-foreground">→</span>
          {after?.[field] !== undefined && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {formatFieldValue(after[field])}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Date grouping ──────────────────────────────────────────────────────────────
function getDateGroupLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function groupEventsByDate(events: ShiftHistoryEvent[]): Array<{ label: string; events: ShiftHistoryEvent[] }> {
  const groups: Map<string, ShiftHistoryEvent[]> = new Map()
  for (const event of events) {
    const label = getDateGroupLabel(event.occurredAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(event)
  }
  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }))
}

// ── Event row ──────────────────────────────────────────────────────────────────
function EventRow({ event }: { event: ShiftHistoryEvent }) {
  const meta = ACTION_META[event.action] ?? ACTION_META.multi_field_change
  const Icon = meta.icon
  const isSystem = SYSTEM_ACTIONS.includes(event.action)

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{meta.label}</span>
          <ActorBadge actorType={event.actorType} />
          {isSystem && (
            <span className="text-xs italic text-muted-foreground">System generated</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
            {new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <DiffDisplay
          before={event.before}
          after={event.after}
          changedFields={event.changedFields}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ShiftAuditHistory({ shiftId }: { shiftId: string }) {
  const { data, isLoading, isError } = useShiftHistory(shiftId)

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Failed to load shift history
      </div>
    )
  }

  if (!data?.events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium text-sm">No history recorded yet</p>
      </div>
    )
  }

  const groups = groupEventsByDate(data.events)

  return (
    <div className="space-y-4">
      {groups.map(({ label, events }) => (
        <div key={label}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <div className="divide-y rounded-lg border">
            {events.map((event) => (
              <div key={event._id} className="px-3">
                <EventRow event={event} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
