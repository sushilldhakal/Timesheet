import { useMemo, useState } from "react";
import { formatDate } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import { useCalendar } from "@/components/calendar/contexts/calendar-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { getEventsCount, navigateDate, rangeText } from "@/components/calendar/helpers";

import type { IEvent } from "@/components/calendar/interfaces";
import type { TCalendarView } from "@/components/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

export function DateNavigator({ view, events }: IProps) {
  const { selectedDate, setSelectedDate } = useCalendar();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const month = formatDate(selectedDate, "MMMM");
  const year = selectedDate.getFullYear();

  const eventCount = useMemo(() => getEventsCount(events, selectedDate, view), [events, selectedDate, view]);

  const handlePrevious = () => setSelectedDate(navigateDate(selectedDate, view, "previous"));
  const handleNext = () => setSelectedDate(navigateDate(selectedDate, view, "next"));

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">
          {month} {year}
        </span>
        <Badge variant="outline" className="px-1.5">
          {eventCount} events
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={handlePrevious}>
          <ChevronLeft />
        </Button>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {rangeText(view, selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={handleNext}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
