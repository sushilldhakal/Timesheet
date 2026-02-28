import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths } from "date-fns";
import type { TCalendarView } from "@/components/calendar/types";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate the date range for a calendar view based on the selected date
 * @param selectedDate - The currently selected date in the calendar
 * @param view - The calendar view type (day, week, month, year, agenda)
 * @param agendaMonths - Number of months to show in agenda view (default: 3)
 * @returns DateRange object with startDate and endDate
 */
export function calculateDateRange(
  selectedDate: Date,
  view: TCalendarView,
  agendaMonths: number = 3
): DateRange {
  switch (view) {
    case "day":
      // Day view: 00:00:00 to 23:59:59 of selected day
      return {
        startDate: startOfDay(selectedDate),
        endDate: endOfDay(selectedDate),
      };

    case "week":
      // Week view: Sunday 00:00:00 to Saturday 23:59:59 of selected week
      return {
        startDate: startOfWeek(selectedDate),
        endDate: endOfWeek(selectedDate),
      };

    case "month":
      // Month view: First day 00:00:00 to last day 23:59:59 of month
      return {
        startDate: startOfMonth(selectedDate),
        endDate: endOfMonth(selectedDate),
      };

    case "year":
      // Year view: January 1st 00:00:00 to December 31st 23:59:59
      return {
        startDate: startOfYear(selectedDate),
        endDate: endOfYear(selectedDate),
      };

    case "agenda":
      // Agenda view: Selected date to (selected date + agendaMonths)
      const agendaStart = startOfDay(selectedDate);
      const agendaEnd = endOfDay(addMonths(selectedDate, agendaMonths));
      return {
        startDate: agendaStart,
        endDate: agendaEnd,
      };

    default:
      // Fallback to day view
      return {
        startDate: startOfDay(selectedDate),
        endDate: endOfDay(selectedDate),
      };
  }
}
