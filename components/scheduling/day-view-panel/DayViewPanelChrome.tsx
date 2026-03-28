'use client';

import { isSameDay, startOfDay } from 'date-fns';
import { DOW_MON_FIRST, MONTHS_SHORT, isToday as isTodayFn } from '@shadcn-scheduler/core';
import { SchedulingWeatherDayBadge } from '@/components/scheduling/weather/SchedulingWeatherDayBadge';
import { cn } from '@/lib/utils/cn';

type DayViewPanelChromeProps = {
  selectedDate: Date;
  weekDates: Date[];
  onSelectDay: (d: Date) => void;
  children: React.ReactNode;
  /** Open-Meteo: location lat/lng from selected site */
  weatherCoords?: { lat: number; lng: number } | null;
};

/**
 * Week strip (Mon–Sun) above the day grid. Time labels come from GridView’s own header.
 */
export function DayViewPanelChrome({
  selectedDate,
  weekDates,
  onSelectDay,
  children,
  weatherCoords,
}: DayViewPanelChromeProps) {
  const rangeStart = weekDates[0];
  const rangeEnd = weekDates.length > 0 ? weekDates[weekDates.length - 1] : undefined;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1.5 border-b border-border bg-muted/40 px-3 py-2.5">
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
