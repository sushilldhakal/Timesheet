"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { calculateDateRange, type DateRange } from "@/components/calendar/utils/date-range-calculator";

import type { Dispatch, SetStateAction } from "react";
import type { IEvent, IUser } from "@/components/calendar/interfaces";
import type { TBadgeVariant, TVisibleHours, TWorkingHours, TCalendarView } from "@/components/calendar/types";

interface ICalendarContext {
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
  selectedUserIds: string[];
  setSelectedUserIds: (userIds: string[]) => void;
  badgeVariant: TBadgeVariant;
  setBadgeVariant: (variant: TBadgeVariant) => void;
  users: IUser[];
  workingHours: TWorkingHours;
  setWorkingHours: Dispatch<SetStateAction<TWorkingHours>>;
  visibleHours: TVisibleHours;
  setVisibleHours: Dispatch<SetStateAction<TVisibleHours>>;
  events: IEvent[];
  allEvents: IEvent[];
  setLocalEvents: Dispatch<SetStateAction<IEvent[]>>;
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;
  refetchEvents: () => Promise<void>;
  currentView: TCalendarView;
  setCurrentView: (view: TCalendarView) => void;
  selectedLocationId?: string;
  selectedLocationIds?: string[];
  selectedLocationName?: string;
}

const CalendarContext = createContext({} as ICalendarContext);

const WORKING_HOURS = {
  0: { from: 0, to: 0 },
  1: { from: 8, to: 17 },
  2: { from: 8, to: 17 },
  3: { from: 8, to: 17 },
  4: { from: 8, to: 17 },
  5: { from: 8, to: 17 },
  6: { from: 8, to: 12 },
};

const VISIBLE_HOURS = { from: 7, to: 18 };

export function CalendarProvider({ 
  children, 
  users, 
  events: initialEvents,
  initialView = "week",
  initialVisibleHours,
  selectedLocationId,
  selectedLocationIds,
  selectedLocationName,
}: { 
  children: React.ReactNode; 
  users: IUser[]; 
  events: IEvent[];
  initialView?: TCalendarView;
  initialVisibleHours?: TVisibleHours;
  selectedLocationId?: string;
  selectedLocationIds?: string[];
  selectedLocationName?: string;
}) {
  const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>("colored");
  const [visibleHours, setVisibleHours] = useState<TVisibleHours>(initialVisibleHours || VISIBLE_HOURS);
  const [workingHours, setWorkingHours] = useState<TWorkingHours>(WORKING_HOURS);

  // Update visible hours when initialVisibleHours changes (location change)
  useEffect(() => {
    if (initialVisibleHours) {
      console.log('CalendarContext - Updating visibleHours from props:', initialVisibleHours);
      setVisibleHours(initialVisibleHours);
    }
  }, [initialVisibleHours]);

  // Log when visibleHours state changes
  useEffect(() => {
    console.log('CalendarContext - visibleHours state updated:', visibleHours);
  }, [visibleHours]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<TCalendarView>(initialView);

  // API integration state
  const [allEvents, setAllEvents] = useState<IEvent[]>(initialEvents);
  const [localEvents, setLocalEvents] = useState<IEvent[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side filter events by selected users
  const filteredEvents = useMemo(() => {
    if (selectedUserIds.length === 0) {
      return localEvents;
    }
    return localEvents.filter(event => 
      event.user && selectedUserIds.includes(event.user.id)
    );
  }, [localEvents, selectedUserIds]);

  // Memoize date range to prevent recalculation on every render
  const dateRange = useMemo(() => {
    return calculateDateRange(selectedDate, currentView);
  }, [selectedDate, currentView]);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });

      // Add location filter if specified
      if (selectedLocationId) {
        params.append('locationId', selectedLocationId);
      }

      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch events");
      }

      const data = await response.json();
      console.log('Fetched events:', data.events);
      setAllEvents(data.events || []);
      setLocalEvents(data.events || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load events";
      setError(message);
      console.error("Error fetching calendar events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, selectedLocationId]);

  // Fetch events when date range or location changes (NOT when user selection changes)
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate.getTime(), dateRange.endDate.getTime(), selectedLocationId]);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
  };

  return (
    <CalendarContext.Provider
      value={{
        selectedDate,
        setSelectedDate: handleSelectDate,
        selectedUserIds,
        setSelectedUserIds,
        badgeVariant,
        setBadgeVariant,
        users,
        visibleHours,
        setVisibleHours,
        workingHours,
        setWorkingHours,
        events: filteredEvents,
        allEvents,
        setLocalEvents,
        dateRange,
        isLoading,
        error,
        refetchEvents: fetchEvents,
        currentView,
        setCurrentView,
        selectedLocationId,
        selectedLocationIds,
        selectedLocationName,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): ICalendarContext {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar must be used within a CalendarProvider.");
  return context;
}
