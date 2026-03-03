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
import type { IUser } from '@/components/calendar/interfaces';

interface ILocation {
  _id: string;
  name: string;
  openingHour?: number;
  closingHour?: number;
}

export default function SchedulingPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]); // For multi-select
  const [locationHours, setLocationHours] = useState<{ from: number; to: number }>({ from: 7, to: 18 });
  const [totalEmployeeCount, setTotalEmployeeCount] = useState<number>(0);
  const [userInfo, setUserInfo] = useState<{
    location: string[];
    role: string;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Fetch current user info to get their location and role
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          
          // The API returns { user: { location: [...], role: ... } }
          const userData = data.user;
          
          setUserInfo({
            location: userData.location || [],
            role: userData.role || 'user',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    }

    fetchUserInfo();
  }, []);

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch('/api/categories?type=location');
        if (response.ok) {
          const data = await response.json();
          let locationList = data.categories || [];
          
          // Check if user is restricted to specific locations
          const isRestricted = userInfo && 
            userInfo.role !== 'admin' && 
            userInfo.role !== 'payable' && 
            userInfo.role !== 'accounts' &&
            userInfo.location.length > 0;

          if (isRestricted && userInfo) {
            // Filter locations to only show user's assigned locations
            locationList = locationList.filter((loc: ILocation) => 
              userInfo.location.includes(loc.name)
            );
          }
          
          setLocations(locationList);
          
          // Pre-select locations for restricted users
          if (isRestricted && userInfo && locationList.length > 0) {
            // Map user's location names to location IDs
            const userLocationIds = locationList
              .filter((loc: ILocation) => userInfo.location.includes(loc.name))
              .map((loc: ILocation) => loc._id);
            
            if (userLocationIds.length > 0) {
              setSelectedLocations(userLocationIds);
            }
          }
          
          // Mark location loading as complete
          setIsLoadingLocation(false);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        setIsLoadingLocation(false);
      }
    }

    if (userInfo) {
      fetchLocations();
    }
  }, [userInfo]);

  // Update hours when location changes
  useEffect(() => {
    if (selectedLocations.length === 1) {
      // Single location selected - use its hours
      const location = locations.find(loc => loc._id === selectedLocations[0]);
      if (location && location.openingHour !== undefined && location.closingHour !== undefined) {
        const newHours = {
          from: location.openingHour,
          to: location.closingHour
        };
        console.log('Scheduling page - Setting location hours:', newHours);
        setLocationHours(newHours);
      }
    } else if (selectedLocations.length > 1) {
      // Multiple locations - find the widest time range
      const selectedLocs = locations.filter(loc => selectedLocations.includes(loc._id));
      const openingHours = selectedLocs
        .filter(loc => loc.openingHour !== undefined)
        .map(loc => loc.openingHour!);
      const closingHours = selectedLocs
        .filter(loc => loc.closingHour !== undefined)
        .map(loc => loc.closingHour!);
      
      if (openingHours.length > 0 && closingHours.length > 0) {
        const newHours = {
          from: Math.min(...openingHours),
          to: Math.max(...closingHours)
        };
        console.log('Scheduling page - Setting combined location hours:', newHours);
        setLocationHours(newHours);
      }
    } else {
      // No locations selected - reset to default
      setLocationHours({ from: 7, to: 18 });
    }
  }, [selectedLocations, locations]);

  // Fetch employee count based on selected location(s)
  useEffect(() => {
    async function fetchEmployeeCount() {
      try {
        const params = new URLSearchParams({
          limit: "1",
          offset: "0",
        });

        // Add location filter if specific locations are selected
        if (selectedLocations.length > 0) {
          // For multiple locations, we'll need to fetch counts for each and sum them
          // For now, we'll use the first location as a filter
          const locationNames = locations
            .filter(loc => selectedLocations.includes(loc._id))
            .map(loc => loc.name);
          
          if (locationNames.length > 0) {
            // Note: This will only filter by first location
            // You may want to enhance the API to support multiple locations
            params.append('location', locationNames[0]);
          }
        }

        const response = await fetch(`/api/employees?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setTotalEmployeeCount(data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch employee count:', error);
      }
    }

    if (locations.length > 0) {
      fetchEmployeeCount();
    }
  }, [selectedLocations, locations]);

  // Fetch users for calendar
  useEffect(() => {
    async function fetchUsers() {
      try {
        // Fetch users with a reasonable limit
        const response = await fetch('/api/employees?limit=1000&offset=0');
        if (response.ok) {
          const data = await response.json();
          const transformedUsers: IUser[] = data.employees.map((emp: any) => {
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
        } else {
          console.error('Failed to fetch users:', response.status, response.statusText);
          setUsers([]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    }

    fetchUsers();
  }, []);

  if (isLoadingUsers || isLoadingLocation) {
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
    ? locations.filter(loc => selectedLocations.includes(loc._id)).map(loc => loc.name).join(', ')
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
                options={locations.map(loc => ({
                  label: loc.name,
                  value: loc._id,
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
                  userInfo.role !== 'payable' && 
                  userInfo.role !== 'accounts' &&
                  userInfo.location.length > 0
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
