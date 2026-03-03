import { useEffect, useState } from "react";
import { startOfWeek, addDays, format, parseISO, isSameDay } from "date-fns";

import { useCalendar } from "@/components/calendar/contexts/calendar-context";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AddEventDialog } from "@/components/calendar/components/dialogs/add-event-dialog";
import { WeekViewMultiDayEventsRow } from "@/components/calendar/components/week-and-day-view/week-view-multi-day-events-row";

import { cn } from "@/lib/utils";

import type { IEvent } from "@/components/calendar/interfaces";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

interface IRole {
  _id: string;
  name: string;
  color?: string;
}

export function CalendarWeekViewByRole({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, selectedLocationIds } = useCalendar();
  const [roles, setRoles] = useState<IRole[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch roles from API based on selected locations
  useEffect(() => {
    async function fetchRoles() {
      try {
        setIsLoading(true);
        
        // If locations are selected, fetch roles for those locations
        if (selectedLocationIds && selectedLocationIds.length > 0) {
          // Fetch roles for each location and combine them
          const allRolesMap = new Map<string, IRole>();
          
          for (const locationId of selectedLocationIds) {
            const response = await fetch(`/api/locations/${locationId}/roles`);
            if (response.ok) {
              const data = await response.json();
              const locationRoles = data.data?.roles || [];
              
              // Add roles to map (using roleId as key to avoid duplicates)
              locationRoles.forEach((r: any) => {
                if (!allRolesMap.has(r.roleId)) {
                  allRolesMap.set(r.roleId, {
                    _id: r.roleId,
                    name: r.roleName,
                    color: r.roleColor,
                  });
                }
              });
            }
          }
          
          const uniqueRoles = Array.from(allRolesMap.values());
          setRoles(uniqueRoles);
          
          // Expand all roles by default
          const initialExpanded: Record<string, boolean> = {};
          uniqueRoles.forEach((r: IRole) => {
            initialExpanded[r._id] = true;
          });
          setExpandedRoles(initialExpanded);
        } else {
          // No location selected - fetch all roles
          const response = await fetch('/api/categories?type=role');
          if (response.ok) {
            const data = await response.json();
            setRoles(data.categories || []);
            // Expand all roles by default
            const initialExpanded: Record<string, boolean> = {};
            data.categories.forEach((r: IRole) => {
              initialExpanded[r._id] = true;
            });
            setExpandedRoles(initialExpanded);
          }
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoles();
  }, [selectedLocationIds]);

  const toggleRole = (roleId: string) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  // Group events by role
  const getEventsForRole = (roleId: string, day: Date) => {
    return singleDayEvents.filter(event => {
      const matchesDay = isSameDay(parseISO(event.startDate), day);
      return matchesDay && (event as any).roleId === roleId;
    });
  };

  // Calculate total hours for all staff in a day
  const getTotalHoursForDay = (day: Date) => {
    const dayEvents = singleDayEvents.filter(event => 
      isSameDay(parseISO(event.startDate), day)
    );
    
    return dayEvents.reduce((sum, event) => {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center border-b py-4 text-sm text-muted-foreground sm:hidden">
        <p>Weekly view is not available on smaller devices.</p>
        <p>Please switch to daily or monthly view.</p>
      </div>

      <div className="hidden flex-col sm:flex">
        <div>
          <WeekViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} />

          {/* Week header with total hours */}
          <div className="relative z-20 flex border-b">
            <div className="w-48 border-r"></div>
            <div className="grid flex-1 grid-cols-7 divide-x border-l">
              {weekDays.map((day, index) => {
                const totalHours = getTotalHoursForDay(day);
                return (
                  <div key={index} className="py-2 text-center">
                    <div className="text-xs font-medium text-muted-foreground">
                      {format(day, "EE")} <span className="ml-1 font-semibold text-foreground">{format(day, "d")}</span>
                    </div>
                    {totalHours > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                        {totalHours.toFixed(1)}h total
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <ScrollArea className="h-[736px]" type="always">
          <div className="flex flex-col">
            {roles.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <p>No roles found. Please add roles in the Categories section.</p>
              </div>
            ) : (
              roles.map((role) => {
                const isExpanded = expandedRoles[role._id];

                return (
                  <div key={role._id} className="border-b">
                    {/* Role header */}
                    <div className="flex">
                      <button
                        onClick={() => toggleRole(role._id)}
                        className="flex w-48 items-center gap-2 border-r px-4 py-3 text-left hover:bg-accent sticky left-0 bg-background z-10 flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                          {role.color && (
                            <div
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: role.color }}
                            />
                          )}
                          <span className="text-sm font-medium truncate">{role.name}</span>
                        </div>
                      </button>

                      {/* Day columns for this role */}
                      <div className="grid flex-1 grid-cols-7 divide-x">
                        {weekDays.map((day, dayIndex) => {
                          const dayEvents = getEventsForRole(role._id, day);
                          const totalHours = dayEvents.reduce((sum, event) => {
                            const start = parseISO(event.startDate);
                            const end = parseISO(event.endDate);
                            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                          }, 0);

                          return (
                            <div
                              key={dayIndex}
                              className="relative min-h-[60px] p-2 text-xs text-muted-foreground"
                            >
                              {totalHours > 0 && (
                                <span className="text-xs font-medium">{totalHours.toFixed(1)}h</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expanded shift details */}
                    {isExpanded && (
                      <div className="flex bg-muted/30">
                        <div className="w-48 border-r sticky left-0 bg-muted/30 z-10 flex-shrink-0"></div>
                        <div className="grid flex-1 grid-cols-7 divide-x">
                          {weekDays.map((day, dayIndex) => {
                            const dayEvents = getEventsForRole(role._id, day);

                            return (
                              <div key={dayIndex} className="relative min-h-[100px] p-2">
                                <div className="space-y-1">
                                  {dayEvents.map((event) => {
                                    const start = parseISO(event.startDate);
                                    const end = parseISO(event.endDate);
                                    const timeStr = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;

                                    return (
                                      <div
                                        key={event.id}
                                        className={cn(
                                          "rounded border bg-background p-2 text-xs hover:shadow-sm cursor-pointer transition-shadow",
                                          event.color === "blue" && "border-l-4 border-l-blue-600",
                                          event.color === "green" && "border-l-4 border-l-green-600",
                                          event.color === "red" && "border-l-4 border-l-red-600",
                                          event.color === "yellow" && "border-l-4 border-l-yellow-600",
                                          event.color === "purple" && "border-l-4 border-l-purple-600",
                                          event.color === "orange" && "border-l-4 border-l-orange-600"
                                        )}
                                      >
                                        <div className="font-medium">{timeStr}</div>
                                        {event.user && (
                                          <div className="text-muted-foreground mt-1">
                                            {event.user.name}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  <AddEventDialog startDate={day} startTime={{ hour: 9, minute: 0 }}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-8 border-dashed text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add shift
                                    </Button>
                                  </AddEventDialog>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
