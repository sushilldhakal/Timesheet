'use client';

// NOTE: This page now renders the copied Kanban demo composition (same header + KanbanView)
// using the local packages under `components/scheduling/packages/*`.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SchedulerProvider,
  SchedulerSettings,
  createSchedulerConfig,
  findConflicts,
  ListView,
  type Block,
  type Settings,
  type Resource,
} from '@/components/scheduling/packages/shadcn-scheduler/src';
import { KanbanView } from '@/components/scheduling/packages/view-kanban/src/KanbanView';
import { DayView } from '@/components/scheduling/packages/view-day/src/DayView';
import { DayViewPanelChrome } from '@/components/scheduling/day-view-panel/DayViewPanelChrome';
import { SchedulingWeatherDayBadge } from '@/components/scheduling/weather/SchedulingWeatherDayBadge';
import { UserSelect, AddShiftModal } from '@/components/scheduling/packages/grid-engine/src';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlignJustify,
  Columns,
  LayoutGrid,
  Grid,
  List,
  Calendar,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMe } from '@/lib/queries/auth';
import { useCategoriesByType } from '@/lib/queries/categories';
import { useEmployees } from '@/lib/queries/employees';
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '@/lib/queries/calendar';
import {
  useLocationRolesForScheduling,
  useUserSchedulingSettings,
  usePatchSchedulingSettings,
  useAutoFillRoster,
  usePublishRosterScoped,
  useSchedulingTemplates,
} from '@/lib/queries/scheduling-page';
import { useSchedulingSettingsStore } from '@/lib/store/scheduling-settings-store';
import useDashboardStore from '@/lib/store';
import { startOfDay, endOfDay, format, parseISO, getISOWeek, getISOWeekYear } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

type KViewBase = 'day' | 'week' | 'month' | 'year';
type KView = KViewBase | `list${KViewBase}`;

function weekIdFromDate(d: Date): string {
  const y = getISOWeekYear(d);
  const w = getISOWeek(d);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

const VIEW_TABS: { k: KViewBase; l: string; Icon: LucideIcon }[] = [
  { k: 'day', l: 'Day', Icon: AlignJustify },
  { k: 'week', l: 'Week', Icon: Columns },
  { k: 'month', l: 'Month', Icon: LayoutGrid },
  { k: 'year', l: 'Year', Icon: Grid },
];

/** Stable fallbacks — inline `[]` from `data ?? []` is a new reference every render and breaks useMemo / effects. */
const EMPTY_CATEGORIES: { id: string; name: string }[] = []
const EMPTY_EMPLOYEES: unknown[] = []
const EMPTY_LOCATION_ROLES: { roleId: string; roleName: string }[] = []

export default function SchedulingPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [shifts, setShifts] = useState<Block[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Dialog state (replaces window.confirm / window.prompt) ───────────────────
  const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
  const [deleteTemplateDialog, setDeleteTemplateDialog] = useState<{ open: boolean; templateId: string }>({ open: false, templateId: '' });
  const [applyTemplateDialog, setApplyTemplateDialog] = useState<{ open: boolean; templateId: string }>({ open: false, templateId: '' });
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');

  // ── Kanban demo state (MUST be defined before any early returns) ─────────────
  const [mounted, setMounted] = useState(false)
  const [date, setDate] = useState<Date | null>(null)
  const [view, setView] = useState<KView>('week')
  const viewBase = useMemo((): KViewBase => {
    return (view.startsWith('list') ? view.slice(4) : view) as KViewBase
  }, [view])
  const isGrid = !view.startsWith('list')
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
  const locationRolesQuery = useLocationRolesForScheduling(selectedLocationId || null);
  const userSchedulingSettingsQuery = useUserSchedulingSettings();
  const patchSettings = usePatchSchedulingSettings();
  const autoFillMutation = useAutoFillRoster();
  const publishScopedMutation = usePublishRosterScoped();
  const templatesQuery = useSchedulingTemplates();
  const setSettingsStore = useSchedulingSettingsStore((s) => s.setSchedulingSettings);

  const userInfo = userInfoQuery.data?.user;

  const locations = locationsQuery.data?.categories ?? EMPTY_CATEGORIES;
  const roles = rolesQuery.data?.categories ?? EMPTY_CATEGORIES;
  const employees = (employeesQuery.data?.employees ?? EMPTY_EMPLOYEES) as NonNullable<
    typeof employeesQuery.data
  >['employees'];
  const locationRoleRows = locationRolesQuery.data?.roles ?? EMPTY_LOCATION_ROLES;

  const locationOptions = useMemo(() => {
    const isAdmin = userInfo?.role === 'admin' || userInfo?.role === 'super_admin';
    if (isAdmin) return locations;
    const locNames = userInfo?.location ?? [];
    if (locNames.length === 0) return locations;
    return locations.filter((loc: { name: string }) => locNames.includes(loc.name));
  }, [userInfo, locations]);

  /** Open-Meteo: use geofence lat/lng on the selected location category when set */
  const weatherCoords = useMemo((): { lat: number; lng: number } | null => {
    if (!selectedLocationId) return null;
    const loc = locationOptions.find((l: { id: string }) => l.id === selectedLocationId) as
      | { lat?: number; lng?: number }
      | undefined;
    if (!loc) return null;
    const lat = typeof loc.lat === 'number' && Number.isFinite(loc.lat) ? loc.lat : null;
    const lng = typeof loc.lng === 'number' && Number.isFinite(loc.lng) ? loc.lng : null;
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [locationOptions, selectedLocationId]);

  const visibleRoleIds = useMemo(() => {
    const isAdmin = userInfo?.role === 'admin' || userInfo?.role === 'super_admin';
    const ids = new Set(locationRoleRows.map((r) => r.roleId));
    if (isAdmin || !userInfo?.managedRoles?.length) {
      return ids;
    }
    const managed = new Set(userInfo.managedRoles.map((n) => String(n).trim().toLowerCase()));
    const filtered = new Set<string>();
    for (const row of locationRoleRows) {
      if (managed.has(String(row.roleName).trim().toLowerCase())) {
        filtered.add(row.roleId);
      }
    }
    return filtered.size ? filtered : ids;
  }, [locationRoleRows, userInfo]);

  /** Roles shown in the grid + sidebar for the selected location. Falls back when /locations/:id/roles is empty or loading. */
  const roleIdsForScheduling = useMemo(() => {
    if (visibleRoleIds.size > 0) return visibleRoleIds;
    const isAdmin = userInfo?.role === 'admin' || userInfo?.role === 'super_admin';
    if (isAdmin || !userInfo?.managedRoles?.length) {
      return new Set(roles.map((r: { id: string }) => r.id));
    }
    const managed = new Set(userInfo.managedRoles.map((n) => String(n).trim().toLowerCase()));
    const fromNames = new Set<string>();
    for (const r of roles) {
      if (managed.has(String(r.name).trim().toLowerCase())) {
        fromNames.add(r.id);
      }
    }
    return fromNames.size > 0 ? fromNames : new Set(roles.map((r: { id: string }) => r.id));
  }, [visibleRoleIds, roles, userInfo]);

  const schedulerCategories: Resource[] = useMemo(() => {
    const list = roles.filter((r: { id: string }) => roleIdsForScheduling.has(r.id));
    const source = list.length ? list : roles;
    return source.map((r: { id: string; name: string }, idx: number) => ({
      id: r.id,
      name: r.name,
      kind: 'category' as const,
      colorIdx: idx,
    }));
  }, [roles, roleIdsForScheduling]);

  const schedulerEmployees: Resource[] = useMemo(() => {
    const locId = selectedLocationId;
    return employees
      .filter((e: { roles?: Array<{ location?: { id: string }; role?: { id: string } }> }) => {
        if (!locId) return false;
        return e.roles?.some(
          (a) =>
            a.location?.id === locId &&
            roleIdsForScheduling.has(a.role?.id ?? ''),
        );
      })
      .map((e: {
        id: string; firstName?: string; lastName?: string; name?: string; email?: string;
        roles?: Array<{ location?: { id: string }; role?: { id: string } }>;
        roleId?: string; avatarUrl?: string; img?: string; colorIdx?: number;
      }, idx: number) => {
        const assignment = e.roles?.find(
          (a) => a.location?.id === locId && roleIdsForScheduling.has(a.role?.id ?? ''),
        );
        const firstRoleId =
          assignment?.role?.id ??
          e.roles?.[0]?.role?.id ??
          e.roleId ??
          schedulerCategories[0]?.id;

        const fromParts = [e.firstName, e.lastName].filter(Boolean).join(' ').trim();
        const displayName =
          fromParts ||
          (typeof e.name === 'string' ? e.name.trim() : '') ||
          (typeof e.email === 'string' ? e.email.trim() : '') ||
          'Employee';

        return {
          id: e.id,
          name: displayName,
          kind: 'employee' as const,
          categoryId: firstRoleId,
          colorIdx: idx,
          avatar: e.avatarUrl ?? e.img ?? undefined,
        };
      });
  }, [employees, selectedLocationId, roleIdsForScheduling, schedulerCategories])

  const schedulerConfig = useMemo(
    () =>
      createSchedulerConfig({
        snapMinutes: 30,
        /** Roster UX: keep category headers + per-employee rows (not EPG flat timeline). */
        timelineSidebarFlat: false,
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
    if (viewBase === 'year') return `${date.getFullYear()}`
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [date, viewBase])

  const rangeLabel = useMemo(() => {
    if (!date) return ''
    if (viewBase === 'day') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    }
    if (viewBase === 'week') {
      const wd = getWeekDates(date)
      const s = wd[0]!
      const e = wd[6]!
      const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
      return sameMonth
        ? `${s.toLocaleString('en-US', { month: 'short' })} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
        : `${s.toLocaleString('en-US', { month: 'short' })} ${s.getDate()} – ${e.toLocaleString('en-US', { month: 'short' })} ${e.getDate()}, ${e.getFullYear()}`
    }
    if (viewBase === 'month') return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    return `${date.getFullYear()}`
  }, [date, viewBase, getWeekDates])

  const weekDates = useMemo(() => (date ? getWeekDates(date) : []), [date, getWeekDates])
  const filteredShifts = useMemo(() => shifts.filter((s) => selEmps.has(s.employeeId)), [shifts, selEmps])

  const publishShiftsList = useCallback((...ids: string[]) => {
    setShifts((prev) => {
      const conflictIds = findConflicts(prev)
      const allowedIds = ids.filter((id) => !conflictIds.has(id))
      if (allowedIds.length === 0) return prev
      return prev.map((s) =>
        allowedIds.includes(s.id) ? { ...s, status: 'published' as const } : s
      )
    })
  }, [])

  const unpublishShiftList = useCallback((id: string) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'draft' as const } : s))
    )
  }, [])

  const toggleEmp = useCallback((empId: string) => {
    setSelEmps((prev) => {
      const next = new Set(prev)
      next.has(empId) ? next.delete(empId) : next.add(empId)
      return next
    })
  }, [])

  const handleSettingsChange = useCallback(
    (partial: Partial<Settings>) => {
      setSettingsOverride((prev) => {
        const next = { ...prev, ...partial };
        const vf = next.visibleFrom;
        const vt = next.visibleTo;
        if (typeof vf === 'number' && typeof vt === 'number') {
          const wh = (next.workingHours ?? {}) as Record<string, { from: number; to: number } | null>;
          patchSettings.mutate(
            { visibleFrom: vf, visibleTo: vt, workingHours: wh },
            {
              onError: () => toast.error('Could not save scheduling settings'),
            },
          );
        }
        return next;
      });
    },
    [patchSettings],
  );

  const navigate = useCallback((dir: number) => {
    setDate((prev) => {
      if (!prev) return prev
      const nd = new Date(prev)
      if (viewBase === 'day') nd.setDate(nd.getDate() + dir)
      if (viewBase === 'week') nd.setDate(nd.getDate() + dir * 7)
      if (viewBase === 'month') nd.setMonth(nd.getMonth() + dir)
      if (viewBase === 'year') nd.setFullYear(nd.getFullYear() + dir)
      return nd
    })
  }, [viewBase])

  const goToToday = useCallback(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setDate(d)
  }, [])

  const scrollToNowRef = useRef<(() => void) | null>(null)

  const handleNow = useCallback(() => {
    goToToday()
    requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToNowRef.current?.())
    )
  }, [goToToday])

  const handleMonthDrill = useCallback((y: number, m: number) => {
    const nd = new Date(y, m, 1)
    nd.setHours(0, 0, 0, 0)
    setDate(nd)
    setView((v) => (v.startsWith('list') ? 'listmonth' : 'month'))
  }, [])

  const toggleGridList = useCallback(() => {
    setView((v) => {
      const grid = !v.startsWith('list')
      const base = (grid ? v : v.slice(4)) as KViewBase
      return (grid ? `list${base}` : base) as KView
    })
  }, [])

  useEffect(() => {
    setMounted(true)
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setDate(d)
  }, [])

  useEffect(() => {
    if (!schedulerEmployees.length) return
    const next = new Set(schedulerEmployees.map((e) => e.id))
    setSelEmps((prev) => {
      if (prev.size !== next.size) return next
      for (const id of next) {
        if (!prev.has(id)) return next
      }
      return prev
    })
  }, [schedulerEmployees])

  const calendarWeekRange = useMemo(() => {
    const anchor = date ?? new Date();
    const wd = getWeekDates(anchor);
    const s = wd[0];
    const e = wd[6];
    if (!s || !e) {
      const now = new Date();
      const ws = startOfDay(now);
      return { start: ws, end: endOfDay(new Date(ws.getTime() + 6 * 24 * 60 * 60 * 1000)) };
    }
    return { start: startOfDay(s), end: endOfDay(e) };
  }, [date, getWeekDates]);

  const { data: eventsData, refetch: refetchEvents, error: eventsError } = useCalendarEvents({
    startDate: calendarWeekRange.start.toISOString(),
    endDate: calendarWeekRange.end.toISOString(),
    userId: 'all',
    locationId: selectedLocationId || 'all',
    publishedOnly: false,
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

  useEffect(() => {
    if (!locations.length) return;
    if (selectedLocationId && locations.some((l: { id: string }) => l.id === selectedLocationId)) return;

    const isRestricted =
      userInfo &&
      userInfo.role !== 'admin' &&
      userInfo.role !== 'super_admin' &&
      (userInfo.location?.length ?? 0) > 0;
    if (isRestricted && userInfo?.location) {
      const filtered = locations.filter((loc: { id: string; name: string }) => userInfo.location?.includes(loc.name));
      if (filtered[0]) setSelectedLocationId(filtered[0].id);
      return;
    }
    setSelectedLocationId(locations[0]!.id);
  }, [userInfo, locations, selectedLocationId]);

  useEffect(() => {
    const s = userSchedulingSettingsQuery.data?.schedulingSettings;
    if (!s) return;
    setSettingsStore(s);
    setSettingsOverride((prev) => ({
      ...prev,
      visibleFrom: s.visibleFrom,
      visibleTo: s.visibleTo,
      workingHours: (s.workingHours ?? {}) as Settings['workingHours'],
    }));
  }, [userSchedulingSettingsQuery.data?.schedulingSettings, setSettingsStore]);

  // Transform employees for CalendarProvider (IUser interface)
  const calendarUsers = useMemo(() => {
    return employees.map((employee: {
      id?: string; _id?: string; name?: string; avatar?: string;
      locations?: Array<{ name: string }>; roles?: Array<{ role?: { name?: string } }>;
      employers?: Array<{ name: string }>;
    }) => ({
      id: employee.id || employee._id,
      name: employee.name,
      picturePath: employee.avatar || null,
      location: employee.locations?.map((loc) => loc.name) || [],
      role: employee.roles?.map((role) => role.role?.name ?? '') || [],
      employer: employee.employers?.map((emp) => emp.name) || []
    }));
  }, [employees]);

  // Transform events to shifts
  useEffect(() => {
    const ev = (eventsData as { events?: unknown[] } | undefined)?.events;
    if (ev?.length) {
      const transformedShifts: Block[] = ev.map((event: {
        id: string; startDate: string; endDate: string; roleId?: string;
        employerBadge?: string; user?: { id?: string; name?: string };
        shiftStatus?: string;
      }) => {
        const startDate = parseISO(event.startDate);
        const endDate = parseISO(event.endDate);
        
        // Convert to hours (decimal for minutes)
        const startH = startDate.getHours() + startDate.getMinutes() / 60;
        const endH = endDate.getHours() + endDate.getMinutes() / 60;

        // Find role/category
        const roleId = event.roleId || roles[0]?.id || 'default';
        
        const employerBadge = typeof event.employerBadge === 'string' ? event.employerBadge : 'Own staff';

        return {
          id: event.id,
          categoryId: roleId,
          employeeId: event.user?.id || 'unassigned',
          date: format(startDate, 'yyyy-MM-dd'), // Convert to ISO date string
          startH,
          endH,
          employee: event.user?.name || 'Unassigned',
          status: event.shiftStatus === 'draft' ? 'draft' : 'published',
          meta: { employerBadge },
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
        const employerId = employees?.find((emp: { id: string; employers?: Array<{ id: string }> }) => emp.id === shift.employeeId)?.employers?.[0]?.id || 'default';
        
        // Convert decimal hours back to time
        const startHour = Math.floor(shift.startH);
        const startMinute = Math.round((shift.startH - startHour) * 60);
        const endHour = Math.floor(shift.endH);
        const endMinute = Math.round((shift.endH - endHour) * 60);
        
        await createEventMutation.mutateAsync({
          employeeId: shift.employeeId !== 'unassigned' ? shift.employeeId : undefined,
          roleId: shift.categoryId,
          locationId: selectedLocationId || locations[0]?.id,
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

  const handlePublishScoped = async () => {
    if (!date || !selectedLocationId) {
      toast.error('Select a location');
      return;
    }
    const roleIds = [...roleIdsForScheduling];
    if (!roleIds.length) {
      toast.error('No roles in scope');
      return;
    }
    try {
      const wid = weekIdFromDate(date);
      await publishScopedMutation.mutateAsync({
        weekId: wid,
        locationId: selectedLocationId,
        roleIds,
      });
      toast.success('Published shifts in scope');
      await refetchEvents();
    } catch {
      toast.error('Publish failed');
    }
  };

  const handleFillSchedule = () => {
    if (!date || !selectedLocationId) {
      toast.error('Select a location and week');
      return;
    }
    const managedRoles = [...roleIdsForScheduling];
    if (!managedRoles.length) {
      toast.error('No managed roles for auto-fill');
      return;
    }
    setAutoFillDialogOpen(true);
  };

  const confirmAutoFill = async () => {
    if (!date || !selectedLocationId) return;
    const managedRoles = [...roleIdsForScheduling];
    setAutoFillDialogOpen(false);
    try {
      const wid = weekIdFromDate(date);
      const res = await autoFillMutation.mutateAsync({
        weekId: wid,
        locationId: selectedLocationId,
        managedRoles,
        employmentTypes: ['FULL_TIME', 'PART_TIME'],
      });
      const ok = res.successCount ?? 0;
      const sk = res.skippedCount ?? 0;
      const fail = res.failureCount ?? 0;
      toast.message(`Fill complete: ${ok} shifts created · ${sk} skipped · ${fail} need manual fixes`);
      await refetchEvents();
    } catch {
      toast.error('Auto-fill failed');
    }
  };

  const handleSaveWeekTemplate = () => {
    if (!date || !selectedLocationId) return;
    setTemplateNameInput('');
    setSaveTemplateDialog(true);
  };

  const confirmSaveTemplate = async () => {
    if (!date || !selectedLocationId || !templateNameInput.trim()) return;
    setSaveTemplateDialog(false);
    try {
      const wid = weekIdFromDate(date);
      const res = await fetch('/api/scheduling/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: templateNameInput.trim(),
          weekId: wid,
          locationId: selectedLocationId,
          roleIds: [...roleIdsForScheduling],
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Template saved');
      await templatesQuery.refetch();
    } catch {
      toast.error('Could not save template');
    }
  };

  const canDeleteTemplate = useCallback(
    (createdBy: string | undefined) => {
      if (userInfo?.role === 'admin' || userInfo?.role === 'super_admin') return true;
      if (!createdBy || !userInfo?.id) return false;
      return String(createdBy) === String(userInfo.id);
    },
    [userInfo],
  );

  const handleDeleteTemplate = (templateId: string) => {
    setDeleteTemplateDialog({ open: true, templateId });
  };

  const confirmDeleteTemplate = async () => {
    const { templateId } = deleteTemplateDialog;
    setDeleteTemplateDialog({ open: false, templateId: '' });
    try {
      const res = await fetch(`/api/scheduling/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      toast.success('Template deleted');
      await templatesQuery.refetch();
    } catch {
      toast.error('Could not delete template');
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setApplyTemplateDialog({ open: true, templateId });
  };

  const confirmApplyTemplate = async (mode: 'replace' | 'add') => {
    const { templateId } = applyTemplateDialog;
    setApplyTemplateDialog({ open: false, templateId: '' });
    if (!date || !selectedLocationId) return;
    try {
      const wid = weekIdFromDate(date);
      const res = await fetch(`/api/scheduling/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetWeekId: wid,
          mode,
          locationId: selectedLocationId,
          roleIds: [...roleIdsForScheduling],
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      const n = j?.data?.shiftsCreated ?? 0;
      toast.success(`Applied template (${n} shifts)`);
      await refetchEvents();
    } catch {
      toast.error('Apply failed');
    }
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
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Location</span>
              <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <Select
                  value={selectedLocationId || undefined}
                  onValueChange={(v) => setSelectedLocationId(v)}
                  disabled={locationOptions.length <= 1}
                >
                  <SelectTrigger className="w-[min(100%,280px)] min-w-[200px] border-0 bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((loc: { id: string; name: string }) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {userInfo &&
                userInfo.role !== 'admin' &&
                userInfo.role !== 'super_admin' &&
                (userInfo.location?.length ?? 0) > 0 && (
                  <p className="max-w-[320px] text-[11px] text-muted-foreground">
                    Only locations assigned to you are listed. Role scope follows your manager roles.
                  </p>
                )}
            </div>

            <div className="rounded-lg border bg-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {schedulerEmployees.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Staff at this location</div>
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
                    <SchedulingWeatherDayBadge
                      date={date}
                      coords={weatherCoords}
                      rangeStart={viewBase === 'week' && weekDates[0] ? weekDates[0] : undefined}
                      rangeEnd={viewBase === 'week' && weekDates[6] ? weekDates[6] : undefined}
                      iconClassName="size-4"
                    />
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
                        {viewBase === 'year' ? (
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
                          viewBase === 'week' ? (
                            <DatePickerCalendar
                              mode="range"
                              selected={{ from: getWeekDates(date)[0], to: getWeekDates(date)[6] }}
                              onSelect={(sel: { from?: Date; to?: Date } | undefined) => {
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
                {(viewBase === 'day' || viewBase === 'week') && (
                  <div className="mr-1 flex items-center gap-1">
                    <Button variant="outline" size="sm" type="button" onClick={handleNow}>
                      Now
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
                  {VIEW_TABS.map(({ k, l, Icon }) => {
                    const active = viewBase === k
                    return (
                      <button
                        key={k}
                        onClick={() =>
                          setView((v) => (v.startsWith('list') ? `list${k}` : k) as KView)
                        }
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

                <div className="h-6 w-px shrink-0 bg-border" aria-hidden />

                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className="relative h-9 w-9 shrink-0 overflow-hidden text-muted-foreground hover:text-foreground"
                  onClick={toggleGridList}
                  title={isGrid ? 'Switch to List view' : 'Switch to Grid view'}
                >
                  <div
                    className={cn(
                      'absolute flex items-center justify-center transition-all duration-300',
                      isGrid ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0',
                    )}
                  >
                    <List size={16} />
                  </div>
                  <div
                    className={cn(
                      'absolute flex items-center justify-center transition-all duration-300',
                      !isGrid ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0',
                    )}
                  >
                    <LayoutGrid size={16} />
                  </div>
                </Button>
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
                  type="button"
                  onClick={handleFillSchedule}
                  className="px-3 py-1.5 rounded-lg border text-[13px] font-medium shrink-0"
                >
                  Fill schedule
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border text-[13px] font-medium shrink-0"
                    >
                      Templates ▾
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[240px] max-h-[min(420px,70vh)] overflow-y-auto">
                    <DropdownMenuItem onClick={handleSaveWeekTemplate}>
                      Save current week as template…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(templatesQuery.data?.templates as
                      | Array<{ _id?: string; name?: string; createdBy?: string | { toString(): string } }>
                      | undefined)?.map((t) => {
                      const id = t._id ? String(t._id) : '';
                      const created =
                        t.createdBy != null && typeof t.createdBy === 'object' && 'toString' in t.createdBy
                          ? (t.createdBy as { toString(): string }).toString()
                          : String(t.createdBy ?? '');
                      return (
                        <div key={id || t.name} className="flex flex-col gap-0 py-1">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => id && handleApplyTemplate(id)}
                          >
                            Apply: {t.name ?? id}
                          </DropdownMenuItem>
                          {id && canDeleteTemplate(created) && (
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDeleteTemplate(id)}
                            >
                              Delete: {t.name ?? id}
                            </DropdownMenuItem>
                          )}
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={handlePublishScoped}
                  className="px-3 py-1.5 rounded-lg border text-[13px] font-medium shrink-0"
                >
                  Publish
                </button>
                <button
                  onClick={() => setHeaderAddOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold shrink-0"
                >
                  <Plus size={15} /> Add Shift
                </button>
              </div>
            </div>
          </div>

          <div className="not-prose flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            {view.startsWith('list') ? (
              <ListView
                shifts={filteredShifts}
                setShifts={setShifts}
                onShiftClick={() => {}}
                onPublish={publishShiftsList}
                onUnpublish={unpublishShiftList}
                onAddShift={() => setHeaderAddOpen(true)}
                currentDate={date}
                view={view}
              />
            ) : viewBase === 'day' ? (
              <DayViewPanelChrome
                selectedDate={date}
                weekDates={weekDates}
                onSelectDay={(d) => setDate(startOfDay(d))}
                weatherCoords={weatherCoords}
              >
                <DayView
                  date={date}
                  setDate={(action) => {
                    setDate((prev) => {
                      if (!prev) return prev
                      const raw = typeof action === 'function' ? action(prev) : action
                      return startOfDay(raw)
                    })
                  }}
                  shifts={filteredShifts}
                  setShifts={setShifts}
                  selEmps={selEmps}
                  onShiftClick={() => {}}
                  onAddShift={() => setHeaderAddOpen(true)}
                  initialScrollToNow
                  scrollToNowRef={scrollToNowRef}
                  readOnly={false}
                />
              </DayViewPanelChrome>
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                <KanbanView
                  date={date}
                  shifts={filteredShifts}
                  setShifts={setShifts}
                  mode={viewBase}
                  dates={viewBase === 'week' ? weekDates : undefined}
                  onMonthDrill={handleMonthDrill}
                  onGoToDay={(d) => {
                    setDate(startOfDay(d))
                    setView((v) => (v.startsWith('list') ? 'listday' : 'day'))
                  }}
                  readOnly={false}
                  weatherCoords={weatherCoords}
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

      {/* ── Auto-fill confirm dialog ─────────────────────────────────────────── */}
      <AlertDialog open={autoFillDialogOpen} onOpenChange={setAutoFillDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run auto-fill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will auto-fill the current week for full-time and part-time employees
              based on their contracted hours. Existing draft shifts will not be replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoFill}>Run auto-fill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete template confirm dialog ───────────────────────────────────── */}
      <AlertDialog
        open={deleteTemplateDialog.open}
        onOpenChange={(open) => setDeleteTemplateDialog((s) => ({ ...s, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The template will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteTemplate}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Apply template dialog (replace vs add) ────────────────────────────── */}
      <AlertDialog
        open={applyTemplateDialog.open}
        onOpenChange={(open) => setApplyTemplateDialog((s) => ({ ...s, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply template</AlertDialogTitle>
            <AlertDialogDescription>
              How should the template be applied to the current week?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => confirmApplyTemplate('add')}>
              Add shifts
            </Button>
            <AlertDialogAction onClick={() => confirmApplyTemplate('replace')}>
              Replace drafts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Save template name dialog ─────────────────────────────────────────── */}
      <Dialog open={saveTemplateDialog} onOpenChange={setSaveTemplateDialog}>
        <DialogContent className="max-w-sm rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Save as template</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Template name"
            value={templateNameInput}
            onChange={(e) => setTemplateNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmSaveTemplate(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveTemplate} disabled={!templateNameInput.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}