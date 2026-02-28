"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { useCalendar } from "@/components/calendar/contexts/calendar-context";

import { Button } from "@/components/ui/button";
import { TimeInput } from "@/components/ui/time-input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import type { TimeValue } from "react-aria-components";

export function ChangeVisibleHoursInput() {
  const { visibleHours, setVisibleHours } = useCalendar();

  const [from, setFrom] = useState<{ hour: number; minute: number }>({ hour: visibleHours.from, minute: 0 });
  const [to, setTo] = useState<{ hour: number; minute: number }>({ hour: visibleHours.to, minute: 0 });

  const handleApply = () => {
    const toHour = to.hour === 0 ? 24 : to.hour;
    console.log('ChangeVisibleHoursInput - Applying hours:', { from: from.hour, to: toHour });
    setVisibleHours({ from: from.hour, to: toHour });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">Change visible hours</p>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger>
              <Info className="size-3" />
            </TooltipTrigger>

            <TooltipContent className="max-w-80 text-center">
              <p>Set the time range to display in the calendar. Events outside this range will not be shown.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-4">
        <p>From</p>
        <TimeInput id="start-time" hourCycle={12} granularity="hour" value={from as TimeValue} onChange={setFrom as (value: TimeValue | null) => void} />
        <p>To</p>
        <TimeInput id="end-time" hourCycle={12} granularity="hour" value={to as TimeValue} onChange={setTo as (value: TimeValue | null) => void} />
      </div>

      <Button className="mt-4 w-fit" onClick={handleApply}>
        Apply
      </Button>
    </div>
  );
}
