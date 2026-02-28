import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { UserSelect } from "@/components/calendar/components/header/user-select";
import { TodayButton } from "@/components/calendar/components/header/today-button";
import { DateNavigator } from "@/components/calendar/components/header/date-navigator";
import { AddEventDialog } from "@/components/calendar/components/dialogs/add-event-dialog";
import { RosterActions } from "@/components/calendar/components/header/roster-actions";
import { ViewTabs } from "@/components/calendar/components/header/view-tabs";

import type { IEvent } from "@/components/calendar/interfaces";
import type { TCalendarView } from "@/components/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

export function CalendarHeader({ view, events }: IProps) {
  return (
    <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <TodayButton />
        <DateNavigator view={view} events={events} />
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
        <div className="flex w-full items-center gap-2">
          <ViewTabs />
          <UserSelect />
        </div>

        <div className="flex w-full sm:w-auto gap-2">
          <RosterActions />
          
          <AddEventDialog>
            <Button className="w-full sm:w-auto">
              <Plus />
              Add Schedule
            </Button>
          </AddEventDialog>
        </div>
      </div>
    </div>
  );
}
