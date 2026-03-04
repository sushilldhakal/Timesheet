"use client";

import { CalendarRange, List, Columns, Grid3x3, Grid2x2 } from "lucide-react";
import { useCalendar } from "@/components/calendar/contexts/calendar-context";
import type { TCalendarView } from "@/components/calendar/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as TCalendarView)}>
      <TabsList>
        {tabs.map(({ icon: Icon, name, value }) => {
          const isActive = currentView === value;
          
          return (
            <TabsTrigger key={value} value={value} aria-label={`View by ${name.toLowerCase()}`}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {isActive && <span>{name}</span>}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
