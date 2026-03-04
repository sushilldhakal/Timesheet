"use client";

import { useMemo } from "react";
import { isSameDay, parseISO } from "date-fns";

import { useCalendar } from "@/components/calendar/contexts/calendar-context";

import { DndProviderWrapper } from "@/components/calendar/components/dnd/dnd-provider";

import { CalendarHeader } from "@/components/calendar/components/header/calendar-header";
import { CalendarYearView } from "@/components/calendar/components/year-view/calendar-year-view";
import { CalendarMonthView } from "@/components/calendar/components/month-view/calendar-month-view";
import { CalendarAgendaView } from "@/components/calendar/components/agenda-view/calendar-agenda-view";
import { CalendarDayViewByRole } from "@/components/calendar/components/week-and-day-view/calendar-day-view-by-role";
import { CalendarWeekViewByRole } from "@/components/calendar/components/week-and-day-view/calendar-week-view-by-role";

export function ClientContainer() {
  const { events, isLoading, error, currentView } = useCalendar();

  // Separate single-day and multi-day events
  // No date range or user filtering needed - filtering is done in context
  const singleDayEvents = useMemo(() => {
    return events.filter(event => {
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);
      return isSameDay(startDate, endDate);
    });
  }, [events]);

  const multiDayEvents = useMemo(() => {
    return events.filter(event => {
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);
      return !isSameDay(startDate, endDate);
    });
  }, [events]);

  // For year view, we only care about the start date
  // by using the same date for both start and end,
  // we ensure only the start day will show a dot
  const eventStartDates = useMemo(() => {
    return events.map(event => ({ ...event, endDate: event.startDate }));
  }, [events]);

  // Error state
  if (error) {
    return (
      <div className="overflow-scroll rounded-xl border">
        <CalendarHeader view={currentView} events={events} />
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md px-4">
            <div className="text-red-500 mb-2">
              <svg className="inline-block h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load events</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-scroll rounded-xl border">
      <CalendarHeader view={currentView} events={events} />

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      ) : (
        <DndProviderWrapper>
          {currentView === "day" && <CalendarDayViewByRole singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
          {currentView === "month" && <CalendarMonthView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
          {currentView === "week" && <CalendarWeekViewByRole singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
          {currentView === "year" && <CalendarYearView allEvents={eventStartDates} />}
          {currentView === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        </DndProviderWrapper>
      )}
    </div>
  );
}
