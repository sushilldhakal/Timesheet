'use client';

import { useMemo } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import {
  DOW_MON_FIRST,
  MONTHS_SHORT,
  isToday as isTodayFn,
  toDateISO,
  type Block,
} from '@shadcn-scheduler/core';
import { useSchedulerContext } from '@shadcn-scheduler/shell';
import { SchedulingWeatherDayBadge } from '@/components/scheduling/weather/SchedulingWeatherDayBadge';
import { cn } from '@/lib/utils/cn';

type DayViewPanelChromeProps = {
  selectedDate: Date;
  weekDates: Date[];
  onSelectDay: (d: Date) => void;
  children: React.ReactNode;
  /** Open-Meteo: location lat/lng from selected site */
  weatherCoords?: { lat: number; lng: number } | null;
  /** Shifts for staff-count chart (same scope as the grid, e.g. filtered by employee picker). */
  shifts?: Block[];
};

/**
 * Week strip (Mon–Sun) above the day grid. Time labels come from GridView’s own header.
 */
function staffCountAtTime(dayShifts: Block[], t: number, step: number): number {
  const ids = new Set<string>();
  for (const s of dayShifts) {
    if (s.startH < t + step && s.endH > t) ids.add(s.employeeId);
  }
  return ids.size;
}

export function DayViewPanelChrome({
  selectedDate,
  weekDates,
  onSelectDay,
  children,
  weatherCoords,
  shifts = [],
}: DayViewPanelChromeProps) {
  const { settings, getTimeLabel } = useSchedulerContext();
  const rangeStart = weekDates[0];
  const rangeEnd = weekDates.length > 0 ? weekDates[weekDates.length - 1] : undefined;

  const iso = toDateISO(selectedDate);
  const chart = useMemo(() => {
    const dayShifts = shifts.filter((s) => s.date === iso);
    const from = settings.visibleFrom;
    const to = settings.visibleTo;
    const step = 0.5;
    const buckets: number[] = [];
    const times: number[] = [];
    for (let t = from; t < to - 1e-9; t += step) {
      times.push(t);
      buckets.push(staffCountAtTime(dayShifts, t, step));
    }
    const maxC = Math.max(1, ...buckets, 1);
    const totalH = dayShifts.reduce((a, s) => a + (s.endH - s.startH), 0);
    const uniqueStaff = new Set(dayShifts.map((s) => s.employeeId)).size;
    const W = 100;
    const H = 36;
    const padL = 2;
    const padR = 2;
    const padT = 4;
    const padB = 10;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const n = buckets.length;
    if (n === 0) {
      return {
        maxC,
        totalH,
        uniqueStaff,
        fillPaths: [] as string[],
        lineD: '',
        ticks: [] as { t: number; label: string }[],
      };
    }
    const segW = innerW / n;
    const fillPaths: string[] = [];
    let lineD = '';
    const yBase = padT + innerH;
    for (let i = 0; i < n; i++) {
      const x0 = padL + i * segW;
      const x1 = x0 + segW;
      const y = padT + innerH * (1 - buckets[i]! / maxC);
      fillPaths.push(`M ${x0} ${yBase} L ${x0} ${y} L ${x1} ${y} L ${x1} ${yBase} Z`);
      if (i === 0) lineD += `M ${x0} ${y}`;
      lineD += ` L ${x1} ${y}`;
      if (i < n - 1) {
        const yN = padT + innerH * (1 - buckets[i + 1]! / maxC);
        lineD += ` L ${x1} ${yN}`;
      }
    }
    const tickStep = Math.max(1, Math.ceil(n / 8));
    const ticks: { t: number; label: string }[] = [];
    for (let i = 0; i < n; i += tickStep) {
      const t = times[i]!;
      ticks.push({ t, label: getTimeLabel(iso, t) });
    }
    return { maxC, totalH, uniqueStaff, fillPaths, lineD, ticks };
  }, [shifts, iso, settings.visibleFrom, settings.visibleTo, getTimeLabel]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
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
                'flex min-w-0 flex-1 flex-col items-center rounded-xl border px-2 py-2 text-center transition-all',
                selected
                  ? 'border-primary bg-primary/12 text-foreground shadow-sm ring-1 ring-primary/25'
                  : 'border-transparent bg-background hover:bg-muted/90',
                today && !selected && 'ring-1 ring-muted-foreground/20'
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{dow}</span>
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-[13px] font-bold tabular-nums">
                  {d.getDate()} {MONTHS_SHORT[d.getMonth()]}
                </span>
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
                  />
                </span>
              </div>
              {today && (
                <span className="mt-0.5 text-[9px] font-medium text-primary">Today</span>
              )}
            </button>
          );
        })}
      </div>

      {/*
        Fixed vertical budget: without an explicit SVG height, width:100% + wide viewBox
        made the chart as tall as ~width/2.5 — stealing space from the grid under 100vh.
      */}
      <div className="flex w-full min-w-0 shrink-0 border-b border-border bg-muted/20 py-1.5">
        <div className="flex w-[132px] min-w-[132px] shrink-0 flex-col justify-center gap-0.5 border-r border-border/80 px-2 py-0.5">
          <div className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Day summary</div>
          <div className="text-[10px] font-semibold leading-tight text-foreground">{chart.uniqueStaff} on roster</div>
          <div className="text-[9px] leading-tight text-muted-foreground">
            {chart.totalH % 1 === 0 ? chart.totalH : chart.totalH.toFixed(1)}h · peak {chart.maxC}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-2 py-0">
          <div className="mb-px flex items-center justify-between text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            <span>Staff count</span>
            <span className="tabular-nums">0–{chart.maxC}</span>
          </div>
          <div className="relative w-full shrink-0">
            <svg
              className="block h-9 w-full text-primary"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              aria-hidden
            >
              {chart.fillPaths.map((p, i) => (
                <path
                  key={i}
                  d={p}
                  fill="currentColor"
                  fillOpacity={0.12 + (i % 3) * 0.02}
                  className="text-primary"
                />
              ))}
              {chart.lineD ? (
                <path
                  d={chart.lineD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.45"
                  vectorEffect="non-scaling-stroke"
                  className="text-primary"
                />
              ) : null}
            </svg>
            <div className="mt-px flex justify-between gap-0.5 text-[7px] leading-none text-muted-foreground">
              {chart.ticks.map((tk) => (
                <span key={tk.t} className="min-w-0 flex-1 truncate text-center tabular-nums" title={tk.label}>
                  {tk.label}
                </span>
              ))}
            </div>
            <div
              className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, hsl(var(--primary) / 0.35), hsl(var(--warning) / 0.4), hsl(var(--chart-4) / 0.45), hsl(var(--chart-1) / 0.35))',
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">{children}</div>
    </div>
  );
}
