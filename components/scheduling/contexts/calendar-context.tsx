"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { calculateDateRange, type DateRange } from "@/components/scheduling/utils/date-range-calculator";
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/lib/queries/calendar";
import type { CreateCalendarEventRequest, UpdateCalendarEventRequest } from "@/lib/api/calendar";

import type { Dispatch, SetStateAction } from "react";
import type { TBadgeVariant, TVisibleHours, TWorkingHours, ViewString, IEvent, IUser } from "@/components/scheduling/types";

function mapCalendarEventToIEvent(event: any): IEvent {
  const startDate = event?.startDate ?? event?.start;
  const endDate = event?.endDate ?? event?.end;
  const user = event?.user ?? {
    id: event?.employeeId ?? "vacant",
    name: event?.employeeName ?? event?.title ?? "Employee",
    picturePath: null,
  };

  return {
    id: event?.id ?? event?._id ?? `${startDate ?? ""}-${endDate ?? ""}`,
    startDate,
    endDate,
    title: event?.title ?? "",
    color: event?.color ?? "blue",
    description: event?.description ?? "",
    user,
    ...(event?.locationId ? { locationId: event.locationId } : {}),
    ...(event?.roleId ? { roleId: event.roleId } : {}),
    ...(event?.shiftStatus ? { shiftStatus: event.shiftStatus } : {}),
    ...(event?.employerBadge ? { employerBadge: event.employerBadge } : {}),
  } as IEvent;
}

interface ICalendarContext {
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
  selectedUserIds: string[];
  setSelectedUserIds: (userIds: string[]) => void;
  badgeVariant: TBadgeVariant;
  setBadgeVariant: (variant: TBadgeVariant) => void;
  users: IUser[];
  roles: any[]; // Database roles
  employees: any[]; // Raw employee data
  workingHours: TWorkingHours;
  setWorkingHours: Dispatch<SetStateAction<TWorkingHours>>;
  visibleHours: TVisibleHours;
  setVisibleHours: Dispatch<SetStateAction<TVisibleHours>>;
  events: IEvent[];
  allEvents: IEvent[];
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;
  refetchEvents: () => void;
  currentView: ViewString;
  setCurrentView: (view: ViewString) => void;
  selectedLocationId?: string;
  selectedLocationIds?: string[];
  selectedLocationName?: string;
  // CRUD operations
  createEvent: (data: CreateCalendarEventRequest) => Promise<void>;
  updateEvent: (id: string, data: UpdateCalendarEventRequest) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

const CalendarContext = createContext({} as ICalendarContext);

const WORKING_HOURS = {
  0: { from: 0, to: 0 },
  1: { from: 8, to: 17 },
  2: { from: 8, to: 17 },
  3: { from: 8, to: 17 },
  4: { from: 8, to: 17 },
  5: { from: 8, to: 17 },
  6: { from: 0, to: 0 },
};

const DEFAULT_VISIBLE_HOURS = { from: 7, to: 18 };

interface CalendarProviderProps {
  children: React.ReactNode;
  users?: IUser[];
  roles?: any[];
  employees?: any[];
  events?: IEvent[];
  initialView?: ViewString;
  initialVisibleHours?: TVisibleHours;
  selectedLocationId?: string;
  selectedLocationIds?: string[];
  selectedLocationName?: string;
  refetchEvents?: () => void;
}

export function CalendarProvider({
  children,
  users = [],
  roles = [],
  employees = [],
  events: providedEvents = [],
  initialView = "week",
  initialVisibleHours = DEFAULT_VISIBLE_HOURS,
  selectedLocationId,
  selectedLocationIds = [],
  selectedLocationName,
  refetchEvents: externalRefetch
}: CalendarProviderProps) {
  const handleSetSelectedDate = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  }, []);
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>("dot");
  const [workingHours, setWorkingHours] = useState<TWorkingHours>(WORKING_HOURS);
  const [visibleHours, setVisibleHours] = useState<TVisibleHours>(initialVisibleHours);
  const [currentView, setCurrentView] = useState<ViewString>(initialView);

  // Calculate date range based on current view and selected date
  const dateRange = useMemo(() => {
    return calculateDateRange(selectedDate, currentView);
  }, [selectedDate, currentView]);

  // Fetch events from API
  const { 
    data: eventsData, 
    isLoading, 
    error: queryError,
    refetch: apiRefetch
  } = useCalendarEvents({
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    userId: "all",
    locationId: selectedLocationId || "all",
    publishedOnly: false,
  });

  // Mutations
  const createEventMutation = useCreateCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();

  // Transform API events to IEvent format
  const allEvents = useMemo(() => {
    if (providedEvents.length > 0) {
      return providedEvents;
    }
    
    const raw = (eventsData as { events?: unknown[] } | undefined)?.events;
    if (!raw?.length) return [];

    return raw.map((event: any) => mapCalendarEventToIEvent(event));
  }, [eventsData, providedEvents]);

  // Filter events based on selected users
  const events = useMemo(() => {
    if (selectedUserIds.length === 0) return allEvents;
    return allEvents.filter(event => selectedUserIds.includes(event.user?.id || ''));
  }, [allEvents, selectedUserIds]);

  // CRUD operations
  const createEvent = useCallback(async (data: CreateCalendarEventRequest) => {
    try {
      await createEventMutation.mutateAsync(data);
      if (externalRefetch) {
        externalRefetch();
      } else {
        apiRefetch();
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }, [createEventMutation, externalRefetch, apiRefetch]);

  const updateEvent = useCallback(async (id: string, data: UpdateCalendarEventRequest) => {
    try {
      await updateEventMutation.mutateAsync({ id, data });
      if (externalRefetch) {
        externalRefetch();
      } else {
        apiRefetch();
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }, [updateEventMutation, externalRefetch, apiRefetch]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await deleteEventMutation.mutateAsync(id);
      if (externalRefetch) {
        externalRefetch();
      } else {
        apiRefetch();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }, [deleteEventMutation, externalRefetch, apiRefetch]);

  const refetchEvents = useCallback(() => {
    if (externalRefetch) {
      externalRefetch();
    } else {
      apiRefetch();
    }
  }, [externalRefetch, apiRefetch]);

  // Update visible hours when initialVisibleHours changes
  useEffect(() => {
    setVisibleHours(prev => {
      // Only update if the values are actually different
      if (prev.from !== initialVisibleHours.from || prev.to !== initialVisibleHours.to) {
        return initialVisibleHours;
      }
      return prev;
    });
  }, [initialVisibleHours.from, initialVisibleHours.to]);

  const contextValue: ICalendarContext = {
    selectedDate,
    setSelectedDate: handleSetSelectedDate,
    selectedUserIds,
    setSelectedUserIds,
    badgeVariant,
    setBadgeVariant,
    users,
    roles,
    employees,
    workingHours,
    setWorkingHours,
    visibleHours,
    setVisibleHours,
    events,
    allEvents,
    dateRange,
    isLoading,
    error: queryError?.message || null,
    refetchEvents,
    currentView,
    setCurrentView,
    selectedLocationId,
    selectedLocationIds,
    selectedLocationName,
    createEvent,
    updateEvent,
    deleteEvent,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}