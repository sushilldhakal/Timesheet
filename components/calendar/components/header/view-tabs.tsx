"use client";

import { CalendarRange, List, Columns, Grid3x3, Grid2x2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/components/calendar/contexts/calendar-context";
import type { TCalendarView } from "@/components/calendar/types";

const tabs = [
  {
    name: "Day",
    value: "day" as TCalendarView,
    icon: List,
  },
  {
    name: "Week",
    value: "week" as TCalendarView,
    icon: Columns,
  },
  {
    name: "Month",
    value: "month" as TCalendarView,
    icon: Grid2x2,
  },
  {
    name: "Year",
    value: "year" as TCalendarView,
    icon: Grid3x3,
  },
  {
    name: "Shift",
    value: "agenda" as TCalendarView,
    icon: CalendarRange,
  },
];

export function ViewTabs() {
  const { currentView, setCurrentView } = useCalendar();

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {tabs.map(({ icon: Icon, name, value }) => {
        const isActive = currentView === value;

        return (
          <button
            key={value}
            onClick={() => setCurrentView(value)}
            aria-label={`View by ${name.toLowerCase()}`}
            className={cn(
              "relative flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              "hover:bg-background/60",
              isActive && "bg-background text-foreground shadow-sm",
              !isActive && "text-muted-foreground hover:text-foreground"
            )}
            style={{
              minWidth: isActive ? "auto" : "40px",
              width: isActive ? "auto" : "40px",
            }}
          >
            <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.8} />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-200 overflow-hidden",
                isActive ? "opacity-100 max-w-[100px]" : "opacity-0 max-w-0"
              )}
            >
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
