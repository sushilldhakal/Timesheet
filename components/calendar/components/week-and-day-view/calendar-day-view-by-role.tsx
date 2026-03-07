import { useEffect, useState } from "react";
import { format, parseISO, isSameDay } from "date-fns";

import { useCalendar } from "@/components/calendar/contexts/calendar-context";
import { useCategories, useCategoriesByType } from "@/lib/queries/categories";
import { useLocationRoles } from "@/lib/queries/locations";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { AddEventDialog } from "@/components/calendar/components/dialogs/add-event-dialog";
import { EventBlock } from "@/components/calendar/components/week-and-day-view/event-block";

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
  const { selectedDate, workingHours, visibleHours, setLocalEvents, selectedLocationIds } = useCalendar();
  const [roles, setRoles] = useState<IRole[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
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

  const { hours, earliestEventHour } = getVisibleHours(visibleHours, singleDayEvents, false); // false = strict hours, no auto-expand

  // TanStack Query hooks
  const allRolesQuery = useCategoriesByType('role');
  
  // Get location roles for each selected location
  const locationRoleQueries = (selectedLocationIds || []).map(locationId => 
    useLocationRoles(locationId)
  );

  // Fetch roles from API based on selected locations
  useEffect(() => {
    if (selectedLocationIds && selectedLocationIds.length > 0) {
      // Combine roles from all location queries
      const allRolesMap = new Map<string, IRole>();
      
      locationRoleQueries.forEach(query => {
        if (query.data?.data) {
          query.data.data.forEach((r: any) => {
            if (!allRolesMap.has(r.roleId)) {
              allRolesMap.set(r.roleId, {
                _id: r.roleId,
                name: r.roleName,
                color: r.roleColor,
              });
            }
          });
        }
      });
      
      const uniqueRoles = Array.from(allRolesMap.values());
      setRoles(uniqueRoles);
      
      // Expand all roles by default
      const initialExpanded: Record<string, boolean> = {};
      uniqueRoles.forEach((r: IRole) => {
        initialExpanded[r._id] = true;
      });
      setExpandedRoles(initialExpanded);
    } else if (allRolesQuery.data?.categories) {
      // No location selected - use all roles
      const rolesData = allRolesQuery.data.categories.map(cat => ({
        _id: cat.id,
        name: cat.name,
        color: cat.color,
      }));
      setRoles(rolesData);
      
      // Expand all roles by default
      const initialExpanded: Record<string, boolean> = {};
      rolesData.forEach((r: IRole) => {
        initialExpanded[r._id] = true;
      });
      setExpandedRoles(initialExpanded);
    }
  }, [selectedLocationIds, allRolesQuery.data, ...locationRoleQueries.map(q => q.data)]);

  const toggleRole = (roleId: string) => {
    console.log("roleid", roleId)
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  // Group events by role and detect overlaps
  const getEventsForRoleWithLanes = (roleId: string) => {
    const events = singleDayEvents.filter(event => {
      const matchesDay = isSameDay(parseISO(event.startDate), selectedDate);
      const eventRoleId = (event as any).roleId;
      const matchesRole = eventRoleId === roleId;
      
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
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    setDraggingEvent({
      id: eventId,
      startX: e.clientX,
      originalLeft: rect.left,
    });
  };

  // Handle drag move
  useEffect(() => {
    if (!draggingEvent && !resizingEvent) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingEvent) {
        // For smooth dragging, we'll use CSS transform instead of updating state
        const deltaX = e.clientX - draggingEvent.startX;
        
        // Find the dragging element and apply transform
        const element = document.querySelector(`[data-event-id="${draggingEvent.id}"]`) as HTMLElement;
        if (element) {
          element.style.transform = `translateX(${deltaX}px)`;
        }
      } else if (resizingEvent) {
        // For smooth resizing, we'll use CSS width/left instead of updating state
        const deltaX = e.clientX - resizingEvent.startX;
        
        const element = document.querySelector(`[data-event-id="${resizingEvent.id}"]`) as HTMLElement;
        if (element) {
          if (resizingEvent.edge === 'left') {
            element.style.left = `${resizingEvent.originalLeft + deltaX}px`;
            element.style.width = `${resizingEvent.originalWidth - deltaX}px`;
          } else {
            element.style.width = `${resizingEvent.originalWidth + deltaX}px`;
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (draggingEvent) {
        // Snap to nearest 15-minute increment
        const dragElement = document.querySelector(`[data-event-id="${draggingEvent.id}"]`) as HTMLElement;
        const deltaX = dragElement ? parseInt(dragElement.style.transform?.match(/translateX\((.+)px\)/)?.[1] || '0') : 0;
        
        const hourWidth = 96;
        const minutesChanged = Math.round((deltaX / hourWidth) * 60 / 15) * 15; // Snap to 15-min
        
        if (minutesChanged !== 0) {
          // Update event time
          setLocalEvents((prevEvents) => 
            prevEvents.map((ev) => {
              if (ev.id.toString() === draggingEvent.id) {
                const newStart = new Date(parseISO(ev.startDate));
                const newEnd = new Date(parseISO(ev.endDate));
                newStart.setMinutes(newStart.getMinutes() + minutesChanged);
                newEnd.setMinutes(newEnd.getMinutes() + minutesChanged);
                
                return {
                  ...ev,
                  startDate: newStart.toISOString(),
                  endDate: newEnd.toISOString(),
                };
              }
              return ev;
            })
          );
        }
        
        // Reset transform
        if (dragElement) {
          dragElement.style.transform = '';
        }
      } else if (resizingEvent) {
        // Snap to nearest 15-minute increment
        const resizeElement = document.querySelector(`[data-event-id="${resizingEvent.id}"]`) as HTMLElement;
        if (resizeElement) {
          const newWidth = parseInt(resizeElement.style.width || '0');
          const deltaWidth = newWidth - resizingEvent.originalWidth;
          
          const hourWidth = 96;
          const minutesChanged = Math.round((deltaWidth / hourWidth) * 60 / 15) * 15; // Snap to 15-min
          
          if (minutesChanged !== 0) {
            setLocalEvents((prevEvents) => 
              prevEvents.map((ev) => {
                if (ev.id.toString() === resizingEvent.id) {
                  if (resizingEvent.edge === 'left') {
                    const newStart = new Date(parseISO(ev.startDate));
                    newStart.setMinutes(newStart.getMinutes() + minutesChanged);
                    
                    // Prevent start from going past end
                    if (newStart < parseISO(ev.endDate)) {
                      return {
                        ...ev,
                        startDate: newStart.toISOString(),
                      };
                    }
                  } else {
                    const newEnd = new Date(parseISO(ev.endDate));
                    newEnd.setMinutes(newEnd.getMinutes() + minutesChanged);
                    
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
          }
          
          // Reset styles
          resizeElement.style.left = '';
          resizeElement.style.width = '';
        }
      }
      
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

  const isLoading = allRolesQuery.isLoading || locationRoleQueries.some(q => q.isLoading);

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
            {multiDayEvents.map(event => (
              <EventBlock 
                key={event.id}
                event={event}
                layout="compact"
                showTime={false}
                enableDragDrop={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scrollable content area - both vertical and horizontal */}
      <div className="flex-1 overflow-auto h-[600px]">
        <div className="flex flex-col min-w-max">
          {/* Hours header - scrolls with content */}
          <div className="relative z-20 flex border-b bg-background sticky top-0">
            <div className="w-48 border-r flex items-center justify-center flex-shrink-0 sticky left-0 bg-background z-30">
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
                  <Button
                    variant="ghost"
                    onClick={() => toggleRole(role._id)}
                    className="flex w-48 items-center gap-2 border-r px-4 py-3 text-left hover:bg-accent flex-shrink-0 sticky left-0 bg-background z-10 justify-start h-auto"
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
                  </Button>

                  {/* Time grid for this role - only show if expanded */}
                  {isExpanded && (
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
                          {roleEventsWithLanes.map(({ event, lane }) => {
                            const style = getEventStyle(event, lane, 1);
                            const isDragging = draggingEvent?.id === event.id.toString();
                            const isResizing = resizingEvent?.id === event.id.toString();
                            
                            return (
                              <div
                                key={event.id}
                                data-event-id={event.id}
                                className={cn(
                                  "absolute pointer-events-auto group",
                                  isDragging && "opacity-50 shadow-lg",
                                  isResizing && "ring-2 ring-blue-500"
                                )}
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

                                <EventBlock 
                                  event={event} 
                                  layout="horizontal"
                                  customStyle={{ height: "100%" }}
                                  showTime={true}
                                  enableDragDrop={false}
                                  className="h-full"
                                />

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
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
