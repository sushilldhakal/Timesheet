import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths } from "date-fns";
import type { ViewString } from "@/components/scheduling/types";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Calculate the date range for a calendar view based on the selected date
 * @param selectedDate - The currently selected date in the calendar
 * @param view - The calendar view type (day, week, month, year, agenda)
 * @param agendaMonths - Number of months to show in agenda view (default: 3)
 * @returns DateRange object with start and end
 */
export function calculateDateRange(
  selectedDate: Date,
  view: ViewString,
  agendaMonths: number = 3
): DateRange {
  switch (view) {
    case "day":
      // Day view: 00:00:00 to 23:59:59 of selected day
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      };

    case "week":
      // Week view: Sunday 00:00:00 to Saturday 23:59:59 of selected week
      return {
        start: startOfWeek(selectedDate),
        end: endOfWeek(selectedDate),
      };

    case "month":
      // Month view: First day 00:00:00 to last day 23:59:59 of month
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      };

    case "year":
      // Year view: January 1st 00:00:00 to December 31st 23:59:59
      return {
        start: startOfYear(selectedDate),
        end: endOfYear(selectedDate),
      };

    case "listday":
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      };
      case "listweek":
      return {
        start: startOfWeek(selectedDate),
        end: endOfWeek(selectedDate),
      };

       case "listmonth":
      return {
         start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      };

       case "listyear":
      return {
          start: startOfYear(selectedDate),
        end: endOfYear(selectedDate),
      };

    default:
      // Fallback to day view
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      };
  }
}
