'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Scheduler, RosterActions, SchedulerSettings, type Block, type Resource } from '@/components/scheduling';
import { CalendarProvider } from '@/components/scheduling/contexts/calendar-context';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useMe } from '@/lib/queries/auth';
import { useCategoriesByType } from '@/lib/queries/categories';
import { useEmployees } from '@/lib/queries/employees';
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '@/lib/queries/calendar';
import useDashboardStore from '@/lib/store';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export default function SchedulingPage() {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<Block[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Dashboard store for sidebar management
  const { setSidebarCollapsed } = useDashboardStore();

  // TanStack Query hooks
  const userInfoQuery = useMe();
  const locationsQuery = useCategoriesByType('location');
  const rolesQuery = useCategoriesByType('role');
  const employeesQuery = useEmployees(1000);

  const userInfo = userInfoQuery.data?.user;
  const locations = locationsQuery.data?.categories || [];
  const roles = rolesQuery.data?.categories || [];
  const employees = employeesQuery.data?.employees || [];

  // Fetch events for current week
  const currentDate = new Date();
  const weekStart = startOfDay(new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1)));
  const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));

  const { data: eventsData, refetch: refetchEvents, error: eventsError } = useCalendarEvents({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    userId: 'all',
    locationId: selectedLocations.length === 1 ? selectedLocations[0] : 'all'
  });

  // Log any API errors
  useEffect(() => {
    if (eventsError) {
      console.error('Calendar events error:', eventsError);
      toast.error(`Failed to load events: ${eventsError.message}`);
    }
  }, [eventsError]);

  // Mutations
  const createEventMutation = useCreateCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();

  // Hydration check
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auto-close sidebar when entering scheduling page
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Filter locations based on user permissions
  useEffect(() => {
    if (userInfo && locations.length > 0) {
      const isRestricted = userInfo.role !== 'admin' && 
        userInfo.role !== 'super_admin' &&
        (userInfo.location?.length ?? 0) > 0;

      if (isRestricted && userInfo.location) {
        const filteredLocations = locations.filter((loc: any) => 
          userInfo.location?.includes(loc.name)
        );
        
        if (filteredLocations.length > 0) {
          const userLocationIds = filteredLocations.map((loc: any) => loc.id);
          setSelectedLocations(userLocationIds);
        }
      }
    }
  }, [userInfo, locations]);

  // Transform data for scheduler
  const categories: Resource[] = useMemo(() => {
    if (!roles) return [];
    
    return roles.map((role: any, index: number) => ({
      id: role.id,
      name: role.name,
      colorIdx: index % 8, // Cycle through 8 colors
      kind: "category" as const
    }));
  }, [roles]);

  const schedulerEmployees: Resource[] = useMemo(() => {
    if (!employees) return [];
    
    return employees.map((employee: any) => {
      // Get the first role for category assignment
      const firstRole = employee.roles?.[0]?.role;
      const categoryId = firstRole?.id || roles[0]?.id || 'default';
      
      // Create avatar from initials
      const nameParts = employee.name.split(' ');
      const avatar = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : employee.name.substring(0, 2).toUpperCase();

      return {
        id: employee.id || employee._id,
        name: employee.name,
        kind: "employee" as const,
        categoryId,
        avatar,
        colorIdx: categories.findIndex(cat => cat.id === categoryId) % 8
      };
    });
  }, [employees, categories, roles]);

  // Transform employees for CalendarProvider (IUser interface)
  const calendarUsers = useMemo(() => {
    return employees.map((employee: any) => ({
      id: employee.id || employee._id,
      name: employee.name,
      picturePath: employee.avatar || null,
      location: employee.locations?.map((loc: any) => loc.name) || [],
      role: employee.roles?.map((role: any) => role.role?.name) || [],
      employer: employee.employers?.map((emp: any) => emp.name) || []
    }));
  }, [employees]);

  // Transform events to shifts
  useEffect(() => {
    if (eventsData?.data?.events) {
      const transformedShifts: Block[] = eventsData.data.events.map((event: any) => {
        const startDate = parseISO(event.startDate);
        const endDate = parseISO(event.endDate);
        
        // Convert to hours (decimal for minutes)
        const startH = startDate.getHours() + startDate.getMinutes() / 60;
        const endH = endDate.getHours() + endDate.getMinutes() / 60;

        // Find role/category
        const roleId = event.roleId || roles[0]?.id || 'default';
        
        return {
          id: event.id,
          categoryId: roleId,
          employeeId: event.user?.id || 'unassigned',
          date: format(startDate, 'yyyy-MM-dd'), // Convert to ISO date string
          startH,
          endH,
          employee: event.user?.name || 'Unassigned',
          status: 'published' as const
        };
      });
      
      setShifts(transformedShifts);
    }
  }, [eventsData, roles]);

  // Handle shifts change
  const handleShiftsChange = async (newShifts: Block[]) => {
    setShifts(newShifts);
    
    // Find changes and sync with backend
    const currentShiftIds = shifts.map(s => s.id);
    const newShiftIds = newShifts.map(s => s.id);
    
    // Handle new shifts (created)
    const createdShifts = newShifts.filter(s => !currentShiftIds.includes(s.id));
    for (const shift of createdShifts) {
      try {
        const employerId = employees?.find((emp: any) => emp.id === shift.employeeId)?.employers?.[0]?.id || 'default';
        
        // Convert decimal hours back to time
        const startHour = Math.floor(shift.startH);
        const startMinute = Math.round((shift.startH - startHour) * 60);
        const endHour = Math.floor(shift.endH);
        const endMinute = Math.round((shift.endH - endHour) * 60);
        
        await createEventMutation.mutateAsync({
          employeeId: shift.employeeId !== 'unassigned' ? shift.employeeId : undefined,
          roleId: shift.categoryId,
          locationId: selectedLocations[0] || locations[0]?.id,
          employerId,
          startDate: format(shift.date, 'yyyy-MM-dd'),
          startTime: { hour: startHour, minute: startMinute },
          endDate: format(shift.date, 'yyyy-MM-dd'),
          endTime: { hour: endHour, minute: endMinute },
          notes: ''
        });
        
        toast.success('Shift created successfully');
      } catch (error) {
        console.error('Failed to create shift:', error);
        toast.error('Failed to create shift');
      }
    }
    
    // Handle deleted shifts
    const deletedShifts = shifts.filter(s => !newShiftIds.includes(s.id));
    for (const shift of deletedShifts) {
      try {
        await deleteEventMutation.mutateAsync(shift.id);
        toast.success('Shift deleted successfully');
      } catch (error) {
        console.error('Failed to delete shift:', error);
        toast.error('Failed to delete shift');
      }
    }
    
    // Handle updated shifts
    const updatedShifts = newShifts.filter(s => {
      const original = shifts.find(orig => orig.id === s.id);
      return original && (
        original.startH !== s.startH ||
        original.endH !== s.endH ||
        original.employeeId !== s.employeeId ||
        original.categoryId !== s.categoryId
      );
    });
    
    for (const shift of updatedShifts) {
      try {
        const startHour = Math.floor(shift.startH);
        const startMinute = Math.round((shift.startH - startHour) * 60);
        const endHour = Math.floor(shift.endH);
        const endMinute = Math.round((shift.endH - endHour) * 60);
        
        await updateEventMutation.mutateAsync({
          id: shift.id,
          data: {
            employeeId: shift.employeeId !== 'unassigned' ? shift.employeeId : undefined,
            roleId: shift.categoryId,
            startDate: format(shift.date, 'yyyy-MM-dd'),
            startTime: { hour: startHour, minute: startMinute },
            endDate: format(shift.date, 'yyyy-MM-dd'),
            endTime: { hour: endHour, minute: endMinute }
          }
        });
        
        toast.success('Shift updated successfully');
      } catch (error) {
        console.error('Failed to update shift:', error);
        toast.error('Failed to update shift');
      }
    }
    
    // Refetch to ensure consistency
    await refetchEvents();
  };

  // Copy last week functionality
  const handleCopyLastWeek = () => {
    // This would copy shifts from the previous week
    toast.info('Copy last week functionality to be implemented');
  };

  // Publish all drafts
  const handlePublishAllDrafts = () => {
    const draftShifts = shifts.filter(s => s.status === 'draft');
    const publishedShifts = shifts.map(s => ({ ...s, status: 'published' as const }));
    setShifts(publishedShifts);
    toast.success(`Published ${draftShifts.length} draft shifts`);
  };

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

  if (userInfoQuery.isLoading || locationsQuery.isLoading || rolesQuery.isLoading || employeesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const draftCount = shifts.filter(s => s.status === 'draft').length;

  return (
    <CalendarProvider 
      users={calendarUsers} 
      roles={roles}
      employees={calendarUsers}
      events={[]} 
      initialView="week"
      selectedLocationIds={selectedLocations}
      refetchEvents={refetchEvents}
    >
      <div className="flex flex-col h-full">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-shrink-0 p-6 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              Scheduling / Rostering
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage employee schedules and roster assignments
            </p>
          </div>

          {/* Quick Stats and Location Selector */}
          <div className="flex gap-4 items-center">
            {/* Location Multi-Selector */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-card">
              <MapPin className="h-5 w-5 text-primary" />
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

            <div className="px-4 py-3 bg-muted rounded-lg border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {employees.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Employees</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduler */}
        <div className="flex-1 min-h-0 px-6">
          <Scheduler
            categories={categories}
            employees={schedulerEmployees}
            shifts={shifts}
            onShiftsChange={handleShiftsChange}
            initialView="week"
            config={{
              labels: {
                category: 'Role',
                employee: 'Staff',
                shift: 'Shift',
                staff: 'Staff',
                roster: 'Roster',
                addShift: 'Add Shift',
                publish: 'Publish',
                draft: 'Draft',
                published: 'Published'
              },
              defaultSettings: {
                visibleFrom: 7,
                visibleTo: 19
              }
            }}
            headerActions={({ copyLastWeek, publishAllDrafts, draftCount }) => (
              <RosterActions
                onCopyLastWeek={handleCopyLastWeek}
                onFillFromSchedules={() => toast.info('Fill from schedules to be implemented')}
                onPublishAll={handlePublishAllDrafts}
                draftCount={draftCount}
              />
            )}
            footerSlot={({ onSettingsChange }) => (
              <SchedulerSettings onSettingsChange={onSettingsChange} />
            )}
          />
        </div>
      </div>
    </CalendarProvider>
  );
}