/**
 * @shadcn-scheduler/scheduler — backward-compatible fat bundle.
 *
 * Composes all @shadcn-scheduler/* packages into a single Scheduler component
 * that matches the original @sushill/shadcn-scheduler API.
 *
 * All views (day, week, month, year, timeline, list) are now production-grade —
 * they wrap the real GridView from @shadcn-scheduler/grid-engine with full
 * virtualization, drag/resize, conflict detection, etc.
 */
import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'
import type { Block, Resource, SchedulerConfig, SchedulerSlots, SchedulerMarker, ShiftDependency, EmployeeAvailability, HistogramConfig } from '@shadcn-scheduler/core'
import { DEFAULT_SETTINGS, nextUid as coreNextUid, toDateISO } from '@shadcn-scheduler/core'
import { SchedulerProvider } from '@shadcn-scheduler/shell'
import { MonthView } from '@shadcn-scheduler/view-month'
import { YearView } from '@shadcn-scheduler/view-year'
import { ListView } from '@shadcn-scheduler/view-list'
import { DayView } from '@shadcn-scheduler/view-day'
import { WeekView } from '@shadcn-scheduler/view-week'
import { TimelineView } from '@shadcn-scheduler/view-timeline'

export interface SchedulerProps {
  shifts: Block[]
  onShiftsChange?: (shifts: Block[]) => void
  categories: Resource[]
  employees: Resource[]
  config?: SchedulerConfig
  slots?: Partial<SchedulerSlots>
  initialView?: string
  readOnly?: boolean
  isLoading?: boolean
  markers?: SchedulerMarker[]
  onMarkersChange?: (markers: SchedulerMarker[]) => void
  dependencies?: ShiftDependency[]
  onDependenciesChange?: (deps: ShiftDependency[]) => void
  availability?: EmployeeAvailability[]
  histogramConfig?: HistogramConfig
  onShiftClick?: (block: Block, resource: Resource) => void
  onBlockCreate?: (block: Block) => void
  onBlockDelete?: (block: Block) => void
  onBlockMove?: (block: Block) => void
  onBlockResize?: (block: Block) => void
  onBlockPublish?: (block: Block) => void
}

function SchedulerInner({
  shifts,
  onShiftsChange,
  categories,
  config,
  slots: _slots,
  initialView = 'week',
  readOnly,
  isLoading,
  onShiftClick,
  onBlockCreate,
  onBlockDelete,
  onBlockMove,
  onBlockResize,
  onBlockPublish,
  markers = [],
  onMarkersChange,
  dependencies = [],
  onDependenciesChange,
  availability = [],
}: SchedulerProps): React.ReactElement {
  const [internalShifts, setInternalShifts] = useState<Block[]>(shifts)
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState(initialView)
  const [selEmps] = useState<Set<string>>(new Set())

  const setShifts = useCallback(
    (updater: React.SetStateAction<Block[]>) => {
      const next = typeof updater === 'function' ? updater(internalShifts) : updater
      setInternalShifts(next)
      onShiftsChange?.(next)
    },
    [internalShifts, onShiftsChange]
  )

  const handleShiftClick = useCallback(
    (block: Block, resource: Resource) => onShiftClick?.(block, resource),
    [onShiftClick]
  )

  const handleAddShift = useCallback(
    (d: Date, categoryId?: string | null, _empId?: string | null) => {
      const cat = categories.find(c => c.id === categoryId) ?? categories[0]
      if (!cat) return
      const newShift: Block = {
        id: coreNextUid(),
        categoryId: cat.id,
        employeeId: '',
        date: toDateISO(d),
        startH: config?.defaultSettings?.visibleFrom ?? DEFAULT_SETTINGS.visibleFrom,
        endH: (config?.defaultSettings?.visibleFrom ?? DEFAULT_SETTINGS.visibleFrom) + 8,
        employee: '',
        status: 'draft',
      }
      const next = [...internalShifts, newShift]
      setInternalShifts(next)
      onShiftsChange?.(next)
      onBlockCreate?.(newShift)
    },
    [categories, config?.defaultSettings?.visibleFrom, internalShifts, onShiftsChange, onBlockCreate]
  )

  const handleMonthClick = useCallback(
    (year: number, month: number) => {
      setDate(new Date(year, month, 1))
      setView('month')
    },
    []
  )

  const handlePublish = useCallback(
    (...shiftIds: string[]) => {
      setShifts(prev => prev.map(s => shiftIds.includes(s.id) ? { ...s, status: 'published' as const } : s))
    },
    [setShifts]
  )

  const handleUnpublish = useCallback(
    (shiftId: string) => {
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'draft' as const } : s))
    },
    [setShifts]
  )

  const sharedGridProps = {
    shifts: internalShifts,
    setShifts,
    selEmps,
    onShiftClick: handleShiftClick,
    onAddShift: handleAddShift,
    readOnly,
    isLoading,
    markers,
    onMarkersChange,
    dependencies,
    onDependenciesChange,
    availability,
    onBlockCreate,
    onBlockDelete,
    onBlockMove,
    onBlockResize,
    onBlockPublish,
  }

  const renderView = (): React.ReactElement => {
    switch (view) {
      case 'day':
        return <DayView {...sharedGridProps} date={date} setDate={setDate} />
      case 'week':
        return <WeekView {...sharedGridProps} date={date} setDate={setDate} />
      case 'month':
        return (
          <MonthView
            date={date}
            shifts={internalShifts}
            setShifts={setShifts}
            onShiftClick={handleShiftClick}
            onAddShift={handleAddShift}
          />
        )
      case 'year':
        return <YearView date={date} shifts={internalShifts} onMonthClick={handleMonthClick} />
      case 'timeline': {
        const timelineDates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(date)
          d.setDate(d.getDate() + i)
          return d
        })
        return (
          <TimelineView
            date={date}
            dates={timelineDates}
            shifts={internalShifts}
            setShifts={setShifts}
            selEmps={selEmps}
            onShiftClick={handleShiftClick}
            onAddShift={handleAddShift}
            readOnly={readOnly}
            isLoading={isLoading}
            markers={markers}
            onMarkersChange={onMarkersChange}
            dependencies={dependencies}
            onDependenciesChange={onDependenciesChange}
            availability={availability}
            onBlockCreate={onBlockCreate}
            onBlockDelete={onBlockDelete}
            onBlockMove={onBlockMove}
            onBlockResize={onBlockResize}
            onBlockPublish={onBlockPublish}
          />
        )
      }
      case 'list':
        return (
          <ListView
            shifts={internalShifts}
            setShifts={setShifts}
            onShiftClick={handleShiftClick}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onAddShift={handleAddShift}
            currentDate={date}
            view="weeklist"
          />
        )
      default:
        return (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Unknown view "{view}".
          </div>
        )
    }
  }

  return (
    <div className="flex h-full flex-col font-[inherit]">
      <div className="flex shrink-0 gap-2 border-b border-border bg-background px-3 py-2">
        {['day', 'week', 'month', 'year', 'timeline', 'list'].map(v => {
          const enabled = config?.views ? config.views[v as keyof typeof config.views] !== false : true
          if (!enabled) return null
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'cursor-pointer rounded-md border-none px-3 py-1 text-[13px]',
                view === v
                  ? 'bg-primary font-bold text-primary-foreground'
                  : 'bg-muted font-normal text-foreground'
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          )
        })}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        {renderView()}
      </div>
    </div>
  )
}

export function Scheduler(props: SchedulerProps): React.ReactElement {
  return (
    <SchedulerProvider
      categories={props.categories}
      employees={props.employees ?? []}
      config={props.config}
      slots={props.slots}
    >
      <SchedulerInner {...props} />
    </SchedulerProvider>
  )
}

export default Scheduler
