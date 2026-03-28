'use client';

// NOTE: This page now renders the copied Kanban demo composition (same header + KanbanView)
// using the local packages under `components/scheduling/packages/*`.

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SchedulerProvider,
  SchedulerSettings,
  createSchedulerConfig,
  type Block,
  type Settings,
  type Resource,
} from '@/components/scheduling/packages/shadcn-scheduler/src';
import { KanbanView } from '@/components/scheduling/packages/view-kanban/src/KanbanView';
import { DayView } from '@/components/scheduling/packages/view-day/src/DayView';
import { UserSelect, AddShiftModal } from '@/components/scheduling/packages/grid-engine/src';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlignJustify,
  Columns,
  LayoutGrid,
  Grid,
  Calendar,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useMe } from '@/lib/queries/auth';
import { useCategoriesByType } from '@/lib/queries/categories';
import { useEmployees } from '@/lib/queries/employees';
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '@/lib/queries/calendar';
import useDashboardStore from '@/lib/store';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function SchedulingPage() {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<Block[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Kanban demo state (MUST be defined before any early returns) ─────────────
  type KView = 'day' | 'week' | 'month' | 'year'
  const [mounted, setMounted] = useState(false)
  const [date, setDate] = useState<Date | null>(null)
  const [view, setView] = useState<KView>('week')
  const [selEmps, setSelEmps] = useState<Set<string>>(() => new Set())
  const [headerAddOpen, setHeaderAddOpen] = useState(false)
  const [settingsOverride, setSettingsOverride] = useState<Partial<Settings>>({})

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


  const schedulerCategories: Resource[] = useMemo(
    () =>
      roles.map((r: any, idx: number) => ({
        id: r.id,
        name: r.name,
        kind: 'category' as const,
        colorIdx: idx,
      })),
    [roles],
  )

  const schedulerEmployees: Resource[] = useMemo(
    () =>
      employees.map((e: any, idx: number) => {
        const firstRoleId =
          e.roles?.[0]?.role?.id ??
          e.roleId ??
          (Array.isArray(e.roleIds) ? e.roleIds[0] : undefined) ??
          roles?.[0]?.id ??
          undefined

        const fromParts = [e.firstName, e.lastName].filter(Boolean).join(' ').trim()
        const displayName =
          fromParts ||
          (typeof e.name === 'string' ? e.name.trim() : '') ||
          (typeof e.email === 'string' ? e.email.trim() : '') ||
          'Employee'

        return {
          id: e.id,
          name: displayName,
          kind: 'employee' as const,
          // This is what lets the scheduler "load staff by roles"
          categoryId: firstRoleId,
          colorIdx: idx,
          avatar: e.avatarUrl ?? e.img ?? undefined,
        }
      }),
    [employees, roles],
  )

  const schedulerConfig = useMemo(
    () =>
      createSchedulerConfig({
        snapMinutes: 30,
        defaultSettings: { rowMode: 'individual', ...settingsOverride },
      }),
    [settingsOverride],
  )

  const getWeekDates = useCallback((anchor: Date): Date[] => {
    const dow = anchor.getDay()
    const off = dow === 0 ? -6 : 1 - dow
    const mon = new Date(anchor)
    mon.setDate(anchor.getDate() + off)
    mon.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      return d
    })
  }, [])

  const monthTitle = useMemo(() => {
    if (!date) return ''
    if (view === 'year') return `${date.getFullYear()}`
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [date, view])

  const rangeLabel = useMemo(() => {
    if (!date) return ''
    if (view === 'day') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    }
    if (view === 'week') {
      const wd = getWeekDates(date)
      const s = wd[0]!
      const e = wd[6]!
      const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
      return sameMonth
        ? `${s.toLocaleString('en-US', { month: 'short' })} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
        : `${s.toLocaleString('en-US', { month: 'short' })} ${s.getDate()} – ${e.toLocaleString('en-US', { month: 'short' })} ${e.getDate()}, ${e.getFullYear()}`
    }
    if (view === 'month') return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    return `${date.getFullYear()}`
  }, [date, view, getWeekDates])

  const weekDates = useMemo(() => (date ? getWeekDates(date) : []), [date, getWeekDates])
  const filteredShifts = useMemo(() => shifts.filter((s) => selEmps.has(s.employeeId)), [shifts, selEmps])

  const toggleEmp = useCallback((empId: string) => {
    setSelEmps((prev) => {
      const next = new Set(prev)
      next.has(empId) ? next.delete(empId) : next.add(empId)
      return next
    })
  }, [])

  const handleSettingsChange = useCallback((partial: Partial<Settings>) => {
    setSettingsOverride((prev) => ({ ...prev, ...partial }))
  }, [])

  const navigate = useCallback((dir: number) => {
    setDate((prev) => {
      if (!prev) return prev
      const nd = new Date(prev)
      if (view === 'day') nd.setDate(nd.getDate() + dir)
      if (view === 'week') nd.setDate(nd.getDate() + dir * 7)
      if (view === 'month') nd.setMonth(nd.getMonth() + dir)
      if (view === 'year') nd.setFullYear(nd.getFullYear() + dir)
      return nd
    })
  }, [view])

  const goToToday = useCallback(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setDate(d)
  }, [])

  const handleMonthDrill = useCallback((y: number, m: number) => {
    const nd = new Date(y, m, 1)
    nd.setHours(0, 0, 0, 0)
    setDate(nd)
    setView('month')
  }, [])

  useEffect(() => {
    setMounted(true)
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setDate(d)
  }, [])

  useEffect(() => {
    if (schedulerEmployees.length) setSelEmps(new Set(schedulerEmployees.map((e) => e.id)))
  }, [schedulerEmployees])

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

  const apiSchedulerEmployees: Resource[] = useMemo(() => {
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

  // (Kanban demo hooks are defined above, before early returns.)

  const VIEW_TABS: { k: KView; l: string; Icon: LucideIcon }[] = [
    { k: 'day', l: 'Day', Icon: AlignJustify },
    { k: 'week', l: 'Week', Icon: Columns },
    { k: 'month', l: 'Month', Icon: LayoutGrid },
    { k: 'year', l: 'Year', Icon: Grid },
  ]

  const iconBtn: React.CSSProperties = {
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--foreground)',
  }

  if (!mounted || !date) return null

  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] min-h-0 w-full flex-col">
      {/* Page header — title, locations, employee count */}
      <div className="flex shrink-0 flex-col">
        <div className="flex shrink-0 items-center justify-between p-6 pb-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              Scheduling / Rostering
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage employee schedules and roster assignments
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <MultiSelect
                options={locations.map((loc: { id: string; name: string }) => ({
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

            <div className="rounded-lg border bg-muted px-4 py-3">
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
      </div>

      <SchedulerProvider categories={schedulerCategories} employees={schedulerEmployees} config={schedulerConfig}>
        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
          <div className="flex shrink-0 flex-col gap-2.5 border-b bg-background py-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={goToToday}
                  title="Go to today"
                  className="flex flex-col items-center w-11 h-11 rounded-md border bg-background overflow-hidden shadow-sm shrink-0"
                >
                  <span className="w-full bg-primary text-primary-foreground text-[9px] font-bold text-center py-[2px] uppercase tracking-[0.5px]">
                    {new Date().toLocaleString('en-US', { month: 'short' })}
                  </span>
                  <span className="flex-1 flex items-center justify-center text-base font-bold text-foreground">
                    {new Date().getDate()}
                  </span>
                </button>

                <div className="grid grid-cols-[auto_1fr] grid-rows-2 items-center gap-y-0.5 gap-x-2">
                  <div className="col-start-2 flex items-center gap-1.5">
                    <span className="text-[15px] font-bold text-foreground">{monthTitle}</span>
                  </div>
                  <div className="col-start-2 flex items-center gap-1">
                    <button onClick={() => navigate(-1)} style={iconBtn} title="Previous"><ChevronLeft size={14} /></button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-[13px] text-foreground px-1 min-w-[180px] text-center hover:underline"
                          title="Pick date"
                        >
                          {rangeLabel}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0 w-auto">
                        {view === 'year' ? (
                          <div className="p-2.5">
                            <div className="text-xs font-medium mb-2">Pick year</div>
                            <div className="grid grid-cols-3 gap-2">
                              {Array.from({ length: 12 }, (_, i) => date.getFullYear() - 5 + i).map((y) => (
                                <button
                                  key={y}
                                  type="button"
                                  className={[
                                    "px-2 py-1 rounded-md border text-xs",
                                    y === date.getFullYear() ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
                                  ].join(" ")}
                                  onClick={() => {
                                    const nd = new Date(date)
                                    nd.setFullYear(y)
                                    nd.setMonth(0, 1)
                                    nd.setHours(0, 0, 0, 0)
                                    setDate(nd)
                                  }}
                                >
                                  {y}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          view === 'week' ? (
                            <DatePickerCalendar
                              mode="range"
                              selected={{ from: getWeekDates(date)[0], to: getWeekDates(date)[6] }}
                              onSelect={(sel: any) => {
                                const from = sel?.from as Date | undefined
                                if (!from) return
                                const d = new Date(from)
                                d.setHours(0, 0, 0, 0)
                                setDate(d)
                              }}
                            />
                          ) : (
                            <DatePickerCalendar
                              mode="single"
                              selected={date}
                              onSelect={(d: Date | undefined) => {
                                if (!d) return
                                const nd = new Date(d)
                                nd.setHours(0, 0, 0, 0)
                                setDate(nd)
                              }}
                            />
                          )
                        )}
                      </PopoverContent>
                    </Popover>
                    <button onClick={() => navigate(1)} style={iconBtn} title="Next"><ChevronRight size={14} /></button>
                  </div>
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
                  {VIEW_TABS.map(({ k, l, Icon }) => {
                    const active = view === k
                    return (
                      <button
                        key={k}
                        onClick={() => setView(k)}
                        title={l}
                        className={[
                          "flex items-center justify-center rounded-md h-7 overflow-hidden transition-all duration-200 ease-in-out gap-1 text-xs",
                          active ? "w-[76px] bg-background text-foreground shadow-sm font-semibold" : "w-8 bg-transparent text-muted-foreground font-normal",
                        ].join(" ")}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span
                          className={[
                            "overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out",
                            active ? "max-w-[44px] opacity-100" : "max-w-0 opacity-0",
                          ].join(" ")}
                        >
                          {l}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="w-px h-6 bg-border shrink-0" />
                <UserSelect
                  selEmps={selEmps}
                  onToggle={toggleEmp}
                  onAll={() => setSelEmps(new Set(schedulerEmployees.map((e) => e.id)))}
                  onNone={() => setSelEmps(new Set())}
                />
                <div className="w-px h-6 bg-border shrink-0" />
                <SchedulerSettings onSettingsChange={handleSettingsChange} shifts={filteredShifts} />
                <button
                  onClick={() => setHeaderAddOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold shrink-0"
                >
                  <Plus size={15} /> Add Shift
                </button>
              </div>
            </div>
          </div>

          <div className="w-full not-prose flex-1 min-h-0 overflow-hidden">
            {view === 'day' ? (
              <DayView
                date={date}
                shifts={filteredShifts}
                setShifts={setShifts}
                selEmps={selEmps}
                onShiftClick={() => {}}
                onAddShift={() => setHeaderAddOpen(true)}
                initialScrollToNow
                readOnly={false}
              />
            ) : (
              <div className="h-full flex flex-col overflow-y-auto">
                <KanbanView
                  date={date}
                  shifts={filteredShifts}
                  setShifts={setShifts}
                  mode={view}
                  dates={view === 'week' ? weekDates : undefined}
                  onMonthDrill={handleMonthDrill}
                  onGoToDay={(d) => { setDate(d); setView('day') }}
                />
              </div>
            )}
          </div>

          {headerAddOpen && (
            <AddShiftModal
              date={date}
              onAdd={(block) => setShifts((prev) => [...prev, block])}
              onClose={() => setHeaderAddOpen(false)}
            />
          )}
        </div>
      </SchedulerProvider>
    </div>
  );
}