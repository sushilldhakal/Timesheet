'use client';

import { useEffect, useState } from 'react';
import { Settings, Calendar, Clock, MapPin } from 'lucide-react';
import { CalendarProvider } from '@/components/calendar/contexts/calendar-context';
import { ClientContainer } from '@/components/calendar/components/client-container';
import { ChangeBadgeVariantInput } from '@/components/calendar/components/change-badge-variant-input';
import { ChangeVisibleHoursInput } from '@/components/calendar/components/change-visible-hours-input';
import { ChangeWorkingHoursInput } from '@/components/calendar/components/change-working-hours-input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useMe } from '@/lib/queries/auth';
import { useCategoriesByType } from '@/lib/queries/categories';
import { useEmployees } from '@/lib/queries/employees';
import type { IUser } from '@/components/calendar/interfaces';

interface ILocation {
  id: string;
  name: string;
  openingHour?: number;
  closingHour?: number;
}

export default function SchedulingPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]); // For multi-select
  const [locationHours, setLocationHours] = useState<{ from: number; to: number }>({ from: 7, to: 18 });
  const [totalEmployeeCount, setTotalEmployeeCount] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // TanStack Query hooks
  const userInfoQuery = useMe();
  const locationsQuery = useCategoriesByType('location');
  const employeesQuery = useEmployees(1000);
  const employeeCountQuery = useEmployees(1);

  const userInfo = userInfoQuery.data?.user;
  const locations = locationsQuery.data?.categories || [];
  const employees = employeesQuery.data?.employees || [];

  // Hydration check
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Filter locations based on user permissions
  useEffect(() => {
    if (userInfo && locations.length > 0) {
      const isRestricted = userInfo.role !== 'admin' && 
        userInfo.role !== 'super_admin' &&
        (userInfo.location?.length ?? 0) > 0;

      if (isRestricted && userInfo.location) {
        // Filter locations to only show user's assigned locations
        const filteredLocations = locations.filter((loc: any) => 
          userInfo.location?.includes(loc.name)
        );
        
        // Pre-select locations for restricted users
        if (filteredLocations.length > 0) {
          const userLocationIds = filteredLocations.map((loc: any) => (loc as any)._id || loc.id);
          setSelectedLocations(userLocationIds);
        }
      }
    }
  }, [userInfo, locations]);

  // Set total employee count from query
  useEffect(() => {
    if (employeeCountQuery.data?.total !== undefined) {
      setTotalEmployeeCount(employeeCountQuery.data.total);
    }
  }, [employeeCountQuery.data?.total]);

  // Transform employees to users format
  useEffect(() => {
    if (employees.length > 0) {
      const transformedUsers: IUser[] = employees.map((emp: any) => {
        // Extract location names from the detailed locations array
        const locationNames = emp.locations?.map((loc: any) => loc.name) || emp.location || [];
        // Extract role names from the detailed roles array
        const roleNames = emp.roles?.map((r: any) => r.role?.name).filter(Boolean) || emp.role || [];
        // Extract employer names from the detailed employers array
        const employerNames = emp.employers?.map((e: any) => e.name) || emp.employer || [];
        
        return {
          id: String(emp._id || emp.id),
          name: emp.name,
          picturePath: emp.img || null,
          location: locationNames,
          role: roleNames,
          employer: employerNames,
        };
      });
      setUsers(transformedUsers);
    }
  }, [employees]);

  // Update hours when location changes
  useEffect(() => {
    if (selectedLocations.length === 1) {
      // Single location selected - use its hours
      const location = locations.find((loc: any) => loc.id === selectedLocations[0]);
      if (location && location.openingHour !== undefined && location.closingHour !== undefined) {
        const newHours = {
          from: location.openingHour,
          to: location.closingHour
        };
        setLocationHours(newHours);
      }
    } else if (selectedLocations.length > 1) {
      // Multiple locations - find the widest time range
      const selectedLocs = locations.filter((loc: any) => selectedLocations.includes(loc.id));
      const openingHours = selectedLocs
        .filter((loc: any) => loc.openingHour !== undefined)
        .map((loc: any) => loc.openingHour!);
      const closingHours = selectedLocs
        .filter((loc: any) => loc.closingHour !== undefined)
        .map((loc: any) => loc.closingHour!);
      
      if (openingHours.length > 0 && closingHours.length > 0) {
        const newHours = {
          from: Math.min(...openingHours),
          to: Math.max(...closingHours)
        };
        setLocationHours(newHours);
      }
    } else {
      // No locations selected - reset to default
      setLocationHours({ from: 7, to: 18 });
    }
  }, [selectedLocations, locations]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userInfoQuery.isLoading || locationsQuery.isLoading || employeesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Events will be fetched by CalendarProvider based on date range
  const filteredEvents: any[] = [];

  // Get selected location names for display
  const selectedLocationNames = selectedLocations.length > 0
    ? locations.filter((loc: any) => selectedLocations.includes(loc.id)).map((loc: any) => loc.name).join(', ')
    : undefined;

  return (
    <CalendarProvider 
      users={users} 
      events={filteredEvents} 
      initialView="week"
      initialVisibleHours={locationHours}
      selectedLocationId={selectedLocations.length === 1 ? selectedLocations[0] : undefined}
      selectedLocationIds={selectedLocations}
      selectedLocationName={selectedLocationNames}
    >
      <div className="flex flex-col h-full">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-shrink-0 p-6 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              Scheduling / Rostering
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Manage employee schedules and roster assignments
            </p>
          </div>

          {/* Quick Stats and Location Selector */}
          <div className="flex gap-4 items-center">
            {/* Location Multi-Selector */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <MultiSelect
                options={locations.map((loc: any) => ({
                  label: loc.name,
                  value: loc.id,
                }))}
                onValueChange={(values) => {
                  setSelectedLocations(values);
                }}
                defaultValue={selectedLocations}
                placeholder="Select locations"
                maxCount={2}
                className="w-[250px] border-0 bg-transparent"
                disabled={
                  !!userInfo && 
                  userInfo.role !== 'admin' && 
                  userInfo.role !== 'super_admin' &&
                  (userInfo.location?.length ?? 0) > 0
                }
                resetOnDefaultValueChange={true}
              />
            </div>

            <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {totalEmployeeCount}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Employees</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 min-h-0 px-6">
          <ClientContainer />
        </div>

        {/* Calendar Settings - Collapsible */}
        <div className="flex-shrink-0 px-6 py-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="settings" className="border-none">
              <AccordionTrigger className="flex-none gap-2 py-0 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings className="size-4" />
                  <p className="text-base font-semibold">Calendar settings</p>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="mt-4 flex flex-col gap-6">
                  <ChangeBadgeVariantInput />
                  <ChangeVisibleHoursInput />
                  <ChangeWorkingHoursInput />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </CalendarProvider>
  );
}
