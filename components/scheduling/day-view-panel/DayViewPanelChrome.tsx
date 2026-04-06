'use client';

import { useMemo } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Settings as SettingsIcon } from 'lucide-react';
import {
  DOW_MON_FIRST,
  MONTHS_SHORT,
  isToday as isTodayFn,
  toDateISO,
  type Block,
} from '@shadcn-scheduler/core';
import { useSchedulerContext } from '@shadcn-scheduler/shell';
import { SchedulingWeatherDayBadge } from '@/components/scheduling/weather/SchedulingWeatherDayBadge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils/cn';
import { ChangeVisibleHoursInput } from '@/components/scheduling/packages/shadcn-scheduler/src/core/components/settings/ChangeVisibleHoursInput';
import { ChangeWorkingHoursInput } from '@/components/scheduling/packages/shadcn-scheduler/src/core/components/settings/ChangeWorkingHoursInput';
import type { BadgeVariant, RowMode, Settings } from '@/components/scheduling/packages/shadcn-scheduler/src/core/types';

type DayViewPanelChromeProps = {
  selectedDate: Date;
  weekDates: Date[];
  onSelectDay: (d: Date) => void;
  children: React.ReactNode;
  /** Open-Meteo: location lat/lng from selected site */
  weatherCoords?: { lat: number; lng: number } | null;
  /** Shifts for staff-count chart (same scope as the grid, e.g. filtered by employee picker). */
  shifts?: Block[];
  /** Persist scheduler settings (visible hours, badge style, row layout) from the Day view panel. */
  onSettingsChange?: (partial: Partial<Settings>) => void;
  /** Match the grid sidebar width so the chart starts at the same x-position. */
  gridSidebarWidth?: number;
};

const staffStepChartConfig = {
  staff: {
    label: 'Staff on shift',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

function staffCountAtTime(dayShifts: Block[], t: number, step: number): number {
  const ids = new Set<string>();
  for (const s of dayShifts) {
    if (s.startH < t + step && s.endH > t) ids.add(s.employeeId);
  }
  return ids.size;
}

type StaffSlotRow = {
  start: number;
  slotEnd: number;
  label: string;
  staff: number;
};

export function DayViewPanelChrome({
  selectedDate,
  weekDates,
  onSelectDay,
  children,
  weatherCoords,
  shifts = [],
  onSettingsChange,
  gridSidebarWidth,
}: DayViewPanelChromeProps) {
  const { settings, getTimeLabel } = useSchedulerContext();
  const rangeStart = weekDates[0];
  const rangeEnd = weekDates.length > 0 ? weekDates[weekDates.length - 1] : undefined;

  const iso = toDateISO(selectedDate);
  const chartModel = useMemo(() => {
    const isoForShift = (s: Block): string => {
      const d = (s as unknown as { date: unknown }).date
      if (typeof d === 'string') return d.slice(0, 10)
      if (d instanceof Date) return toDateISO(d)
      return String(d).slice(0, 10)
    }
    const dayShifts = shifts.filter((s) => isoForShift(s) === iso);
    const from = settings.visibleFrom;
    const to = settings.visibleTo;
    const step = 0.5;
    const chartData: StaffSlotRow[] = [];
    for (let t = from; t < to - 1e-9; t += step) {
      chartData.push({
        start: t,
        slotEnd: t + step,
        label: getTimeLabel(iso, t),
        staff: staffCountAtTime(dayShifts, t, step),
      });
    }
    const maxC = Math.max(1, ...chartData.map((d) => d.staff), 1);
    const totalH = dayShifts.reduce((a, s) => a + (s.endH - s.startH), 0);
    const uniqueStaff = new Set(dayShifts.map((s) => s.employeeId)).size;
    const xTicks = Array.from(
      { length: Math.max(0, Math.floor(to) - Math.ceil(from) + 1) },
      (_, i) => Math.ceil(from) + i,
    );
    return { chartData, maxC, totalH, uniqueStaff, from, to, xTicks };
  }, [shifts, iso, settings.visibleFrom, settings.visibleTo, getTimeLabel]);

  const { chartData, maxC, totalH, uniqueStaff, from, to, xTicks } = chartModel;
  const lineData =
    chartData.length > 0
      ? chartData
      : ([{ start: from, slotEnd: from + 0.5, label: getTimeLabel(iso, from), staff: 0 }] satisfies StaffSlotRow[]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">

      {/* ── Week strip ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-muted/40 px-2 py-1">
        {weekDates.map((d) => {
          const selected = isSameDay(d, selectedDate);
          const today = isTodayFn(d);
          const dow = DOW_MON_FIRST[(d.getDay() + 6) % 7];
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelectDay(startOfDay(d))}
              className={cn(
                'relative flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-center transition-all',
                selected
                  ? 'border-primary bg-primary/12 text-foreground shadow-sm ring-1 ring-primary/25'
                  : 'border-transparent bg-background hover:bg-muted/90',
                today && !selected && 'ring-1 ring-muted-foreground/20'
              )}
            >
              <span className="text-[12px] font-semibold tabular-nums leading-none">
                {dow} {d.getDate()}
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {MONTHS_SHORT[d.getMonth()]}
              </span>
              {today && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
              <span
                className="inline-flex shrink-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <SchedulingWeatherDayBadge
                  date={d}
                  coords={weatherCoords ?? null}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  iconClassName="size-4"
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Stats + chart panel ─────────────────────────────────────────── */}
      <div className="flex w-full min-w-0 shrink-0 items-stretch border-b border-border bg-muted/20 md:flex-row">

        {/* Left: compact stats + settings popover, width-aligned with grid sidebar */}
        <div
          className="flex shrink-0 flex-col justify-center gap-2 px-3 py-2"
          style={
            gridSidebarWidth
              ? { width: gridSidebarWidth, minWidth: gridSidebarWidth }
              : { width: 140, minWidth: 140 }
          }
        >
          {/* Stats */}
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Day summary</span>
            <span className="text-[11px] font-semibold text-foreground">{uniqueStaff} on roster</span>
            <span className="text-[10px] text-muted-foreground">
              {totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h &middot; peak {maxC}
            </span>
          </div>

          {onSettingsChange && (
            <>
              {/* Shift style */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Shift style</label>
                <Select
                  value={(settings.badgeVariant ?? 'both') as BadgeVariant}
                  onValueChange={(v) => onSettingsChange({ badgeVariant: v as BadgeVariant })}
                >
                  <SelectTrigger className="h-7 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="drag">Drag &amp; drop</SelectItem>
                    <SelectItem value="resize">Resizable</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row layout */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Row layout</label>
                <Select
                  value={(settings.rowMode ?? 'category') as RowMode}
                  onValueChange={(v) => onSettingsChange({ rowMode: v as RowMode })}
                >
                  <SelectTrigger className="h-7 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">By category</SelectItem>
                    <SelectItem value="individual">By employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gear → Sheet for visible hours + working hours */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Visible &amp; working hours"
                    aria-label="Visible &amp; working hours"
                  >
                    <SettingsIcon size={13} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[360px] p-0">
                  <div className="p-5">
                    <SheetHeader className="mb-4">
                      <SheetTitle className="text-sm">Hours settings</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-5">
                      <ChangeVisibleHoursInput
                        visibleFrom={settings.visibleFrom}
                        visibleTo={settings.visibleTo}
                        onChange={(from, to) => onSettingsChange({ visibleFrom: from, visibleTo: to })}
                        label="Visible hours"
                        className="space-y-1.5"
                      />
                      <ChangeWorkingHoursInput
                        workingHours={settings.workingHours}
                        onChange={(wh) => onSettingsChange({ workingHours: wh })}
                        label="Working hours"
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>

        {/* Right: full 250px chart */}
        <div className="min-h-0 min-w-0 flex-1 px-2 py-2 md:px-3">
          <div className="mb-1 flex items-center gap-2 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            <span>Staff count</span>
            <span className="tabular-nums">0–{maxC}</span>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-[8px] bottom-[22px] w-10 text-[10px] text-muted-foreground">
              <div className="absolute left-0 top-0">{maxC}</div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2">{Math.max(0, Math.round(maxC / 2))}</div>
              <div className="absolute left-0 bottom-0">0</div>
            </div>
            <ChartContainer
              config={staffStepChartConfig}
              className="aspect-auto h-[250px] w-full max-w-full [&_.recharts-surface]:outline-none"
            >
              <LineChart
                data={lineData}
                margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                accessibilityLayer
              >
                <CartesianGrid vertical strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  type="number"
                  dataKey="start"
                  domain={[from, to]}
                  ticks={xTicks.length ? xTicks : [from, to]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(v) => getTimeLabel(iso, Number(v))}
                  className="text-[10px]"
                />
                <YAxis hide domain={[0, maxC]} allowDecimals={false} />
                <ChartTooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as StaffSlotRow | undefined;
                        if (!row) return '';
                        const endLbl = getTimeLabel(iso, row.slotEnd);
                        return `${row.label} – ${endLbl}`;
                      }}
                    />
                  }
                />
                <Line
                  type="stepAfter"
                  dataKey="staff"
                  stroke="var(--color-staff)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  isAnimationActive={chartData.length <= 64}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">{children}</div>
    </div>
  );
}
