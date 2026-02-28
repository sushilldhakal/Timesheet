import { useEffect, useState } from "react";
import { format, parseISO, isSameDay } from "date-fns";

import { useCalendar } from "@/components/calendar/contexts/calendar-context";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AddEventDialog } from "@/components/calendar/components/dialogs/add-event-dialog";

import { cn } from "@/lib/utils";
import { getVisibleHours, isWorkingHour } from "@/components/calendar/helpers";

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

export function CalendarDayViewByRole({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, workingHours, visibleHours, setLocalEvents } = useCalendar();
  const [roles, setRoles] = useState<IRole[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [draggingEvent, setDraggingEvent] = useState<{
    id: string;
    startX: number;
    originalLeft: number;
  } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    id: string;
    edge: 'left' | 'right';
    startX: number;
    originalLeft: number;
    originalWidth: number;
  } | null>(null);

  console.log('CalendarDayViewByRole - singleDayEvents:', singleDayEvents);
  console.log('CalendarDayViewByRole - selectedDate:', selectedDate);

  const { hours, earliestEventHour } = getVisibleHours(visibleHours, singleDayEvents, false); // false = strict hours, no auto-expand

  console.log('CalendarDayViewByRole - visibleHours from context:', visibleHours);
  console.log('CalendarDayViewByRole - hours array:', hours);

  // Fetch roles from API
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await fetch('/api/categories?type=role');
        if (response.ok) {
          const data = await response.json();
          
          const rolesData = data.categories || [];
          setRoles(rolesData);
          
          // Expand all roles by default
          const initialExpanded: Record<string, boolean> = {};
          rolesData.forEach((r: IRole) => {
            initialExpanded[r._id] = true;
          });
          setExpandedRoles(initialExpanded);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoles();
  }, []);

  const toggleRole = (roleId: string) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  // Group events by role and detect overlaps
  const getEventsForRoleWithLanes = (roleId: string) => {
    const events = singleDayEvents.filter(event => {
      const matchesDay = isSameDay(parseISO(event.startDate), selectedDate);
      const matchesRole = (event as any).roleId === roleId;
      
      if (matchesDay) {
        console.log('Event day match:', {
          eventId: event.id,
          eventRoleId: (event as any).roleId,
          targetRoleId: roleId,
          matchesRole,
          event
        });
      }
      
      return matchesDay && matchesRole;
    });

    // Sort by start time
    const sortedEvents = [...events].sort((a, b) => 
      parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
    );

    // Assign lanes to avoid overlaps
    const lanes: IEvent[][] = [];
    
    sortedEvents.forEach(event => {
      const eventStart = parseISO(event.startDate);
      const eventEnd = parseISO(event.endDate);
      
      // Find a lane where this event doesn't overlap
      let assignedLane = -1;
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const hasOverlap = lane.some(laneEvent => {
          const laneStart = parseISO(laneEvent.startDate);
          const laneEnd = parseISO(laneEvent.endDate);
          return eventStart < laneEnd && eventEnd > laneStart;
        });
        
        if (!hasOverlap) {
          assignedLane = i;
          break;
        }
      }
      
      // If no suitable lane found, create a new one
      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push([]);
      }
      
      lanes[assignedLane].push(event);
    });

    // Flatten with lane info
    return lanes.flatMap((lane, laneIndex) => 
      lane.map(event => ({ event, lane: laneIndex, totalLanes: lanes.length }))
    );
  };

  // Calculate event position and width based on hours
  const getEventStyle = (event: IEvent, lane: number, totalLanes: number) => {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();

    // Calculate position from the earliest visible hour
    const startOffset = (startHour - earliestEventHour) + (startMinute / 60);
    const endOffset = (endHour - earliestEventHour) + (endMinute / 60);
    const duration = endOffset - startOffset;

    // Each hour column is 96px wide
    const hourWidth = 96;
    const left = startOffset * hourWidth;
    const width = duration * hourWidth;

    // Calculate vertical position based on lane
    const laneHeight = 70; // Height per lane
    const top = lane * laneHeight + 8;

    return {
      left: `${left}px`,
      width: `${width}px`,
      top: `${top}px`,
    };
  };

  // Handle drag start
  const handleDragStart = (eventId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setDraggingEvent({
      id: eventId,
      startX: e.clientX,
      originalLeft: (e.currentTarget as HTMLElement).getBoundingClientRect().left,
    });
  };

  // Handle drag move
  useEffect(() => {
    if (!draggingEvent && !resizingEvent) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingEvent) {
        const deltaX = e.clientX - draggingEvent.startX;
        
        const hourWidth = 96;
        const hoursChanged = Math.round(deltaX / hourWidth);
        
        if (hoursChanged !== 0) {
          // Update event time
          setLocalEvents((prevEvents) => 
            prevEvents.map((ev) => {
              if (ev.id.toString() === draggingEvent.id) {
                const newStart = new Date(parseISO(ev.startDate));
                const newEnd = new Date(parseISO(ev.endDate));
                newStart.setHours(newStart.getHours() + hoursChanged);
                newEnd.setHours(newEnd.getHours() + hoursChanged);
                
                return {
                  ...ev,
                  startDate: newStart.toISOString(),
                  endDate: newEnd.toISOString(),
                };
              }
              return ev;
            })
          );
          
          // Reset drag state to new position
          setDraggingEvent({
            ...draggingEvent,
            startX: e.clientX,
          });
        }
      } else if (resizingEvent) {
        const deltaX = e.clientX - resizingEvent.startX;
        
        const hourWidth = 96;
        const hoursChanged = Math.round(deltaX / hourWidth);
        
        if (hoursChanged !== 0) {
          setLocalEvents((prevEvents) => 
            prevEvents.map((ev) => {
              if (ev.id.toString() === resizingEvent.id) {
                if (resizingEvent.edge === 'left') {
                  const newStart = new Date(parseISO(ev.startDate));
                  newStart.setHours(newStart.getHours() + hoursChanged);
                  
                  // Prevent start from going past end
                  if (newStart < parseISO(ev.endDate)) {
                    return {
                      ...ev,
                      startDate: newStart.toISOString(),
                    };
                  }
                } else {
                  const newEnd = new Date(parseISO(ev.endDate));
                  newEnd.setHours(newEnd.getHours() + hoursChanged);
                  
                  // Prevent end from going before start
                  if (newEnd > parseISO(ev.startDate)) {
                    return {
                      ...ev,
                      endDate: newEnd.toISOString(),
                    };
                  }
                }
              }
              return ev;
            })
          );
          
          // Reset resize state to new position
          setResizingEvent({
            ...resizingEvent,
            startX: e.clientX,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingEvent(null);
      setResizingEvent(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingEvent, resizingEvent, setLocalEvents]);

  // Handle resize start
  const handleResizeStart = (eventId: string, edge: 'left' | 'right') => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const target = e.currentTarget.parentElement as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    setResizingEvent({
      id: eventId,
      edge,
      startX: e.clientX,
      originalLeft: rect.left,
      originalWidth: rect.width,
    });
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
    <div className="flex flex-col h-full">
      {/* Multi-day events row */}
      {multiDayEvents.length > 0 && (
        <div className="border-b p-4">
          <div className="space-y-2">
            {multiDayEvents.map(event => {
              const start = parseISO(event.startDate);
              const end = parseISO(event.endDate);
              
              return (
                <div
                  key={event.id}
                  className={cn(
                    "rounded-md border-l-4 bg-card p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                    event.color === "blue" && "border-l-blue-600 bg-blue-50 dark:bg-blue-950/30",
                    event.color === "green" && "border-l-green-600 bg-green-50 dark:bg-green-950/30",
                    event.color === "red" && "border-l-red-600 bg-red-50 dark:bg-red-950/30",
                    event.color === "yellow" && "border-l-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
                    event.color === "purple" && "border-l-purple-600 bg-purple-50 dark:bg-purple-950/30",
                    event.color === "orange" && "border-l-orange-600 bg-orange-50 dark:bg-orange-950/30",
                    event.color === "gray" && "border-l-gray-600 bg-gray-50 dark:bg-gray-950/30"
                  )}
                >
                  <div className="text-sm font-semibold">{event.user?.name || "Vacant"}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(start, "MMM d")} - {format(end, "MMM d")}
                  </div>
                  {event.title && <div className="text-xs mt-1">{event.title}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hours header - Fixed */}
      <div className="relative z-20 flex border-b bg-background sticky top-0">
        <div className="w-48 border-r flex items-center justify-center flex-shrink-0">
          <AddEventDialog startDate={selectedDate} startTime={{ hour: 9, minute: 0 }}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Shift
            </Button>
          </AddEventDialog>
        </div>
        <div className="flex flex-1 divide-x min-w-0">
          {hours.map((hour, index) => (
            <div key={hour} className="flex-shrink-0 px-2 py-2 text-center" style={{ width: "96px" }}>
              <span className="text-xs font-medium text-muted-foreground">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content area - both vertical and horizontal */}
      <div className="flex-1 overflow-auto h-[600px]">
        <div className="flex flex-col min-w-max">
          {roles.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <p>No roles found. Please add roles in the Categories section.</p>
            </div>
          ) : (
            roles.map((role) => {
              const isExpanded = expandedRoles[role._id];
              
              const roleEventsWithLanes = getEventsForRoleWithLanes(role._id);
              
              const maxLanes = Math.max(1, ...roleEventsWithLanes.map(e => e.totalLanes));
              const rowHeight = maxLanes * 70 + 16; // 70px per lane + padding

              return (
                <div key={role._id} className="border-b flex">
                  {/* Role name column - sticky */}
                  <button
                    onClick={() => toggleRole(role._id)}
                    className="flex w-48 items-center gap-2 border-r px-4 py-3 text-left hover:bg-accent flex-shrink-0 sticky left-0 bg-background z-10"
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

                  {/* Time grid for this role */}
                  <div className="relative flex-1">
                    <div className="flex divide-x">
                      {hours.map((hour, index) => {
                        const isDisabled = !isWorkingHour(selectedDate, hour, workingHours);
                        
                        return (
                          <div
                            key={hour}
                            className={cn("relative flex-shrink-0", isDisabled && "bg-calendar-disabled-hour")}
                            style={{ width: "96px", height: `${rowHeight}px` }}
                          >
                            {index !== 0 && (
                              <div className="pointer-events-none absolute inset-y-0 left-0 border-l"></div>
                            )}
                            
                            {/* Clickable area to add shift */}
                            <AddEventDialog 
                              startDate={selectedDate} 
                              startTime={{ hour, minute: 0 }}
                            >
                              <div className="absolute inset-0 cursor-pointer transition-colors hover:bg-accent/50" />
                            </AddEventDialog>
                          </div>
                        );
                      })}
                    </div>

                    {/* Events overlay */}
                    {roleEventsWithLanes.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {roleEventsWithLanes.map(({ event, lane, totalLanes }) => {
                          const style = getEventStyle(event, lane, totalLanes);
                          const start = parseISO(event.startDate);
                          const end = parseISO(event.endDate);
                          const isDragging = draggingEvent?.id === event.id.toString();
                          const isResizing = resizingEvent?.id === event.id.toString();
                          
                          return (
                            <div
                              key={event.id}
                              className="absolute pointer-events-auto group"
                              style={{
                                ...style,
                                height: "60px",
                                cursor: isDragging ? 'grabbing' : 'grab',
                              }}
                              onMouseDown={handleDragStart(event.id.toString())}
                            >
                              {/* Resize handle - left */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 transition-opacity z-10"
                                onMouseDown={handleResizeStart(event.id.toString(), 'left')}
                                onClick={(e) => e.stopPropagation()}
                              />

                              <div
                                className={cn(
                                  "h-full rounded-md border-l-4 bg-card p-2 shadow-sm hover:shadow-md transition-shadow overflow-hidden",
                                  isDragging && "opacity-50 shadow-lg",
                                  isResizing && "ring-2 ring-blue-500",
                                  event.color === "blue" && "border-l-blue-600 bg-blue-50 dark:bg-blue-950/30",
                                  event.color === "green" && "border-l-green-600 bg-green-50 dark:bg-green-950/30",
                                  event.color === "red" && "border-l-red-600 bg-red-50 dark:bg-red-950/30",
                                  event.color === "yellow" && "border-l-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
                                  event.color === "purple" && "border-l-purple-600 bg-purple-50 dark:bg-purple-950/30",
                                  event.color === "orange" && "border-l-orange-600 bg-orange-50 dark:bg-orange-950/30",
                                  event.color === "gray" && "border-l-gray-600 bg-gray-50 dark:bg-gray-950/30"
                                )}
                              >
                                <div className="text-xs font-semibold truncate">
                                  {event.user?.name || "Vacant"}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {format(start, "h:mm a")} - {format(end, "h:mm a")}
                                </div>
                                {event.title && (
                                  <div className="text-xs text-muted-foreground mt-1 truncate">
                                    {event.title}
                                  </div>
                                )}
                              </div>

                              {/* Resize handle - right */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/20 transition-opacity z-10"
                                onMouseDown={handleResizeStart(event.id.toString(), 'right')}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
