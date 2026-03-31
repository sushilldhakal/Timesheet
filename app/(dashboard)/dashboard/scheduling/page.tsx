'use client';

// NOTE: This page now renders the copied Kanban demo composition (same header + KanbanView)
// using the local packages under `components/scheduling/packages/*`.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SchedulerProvider,
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
import { UserSelect, AddShiftModal, ShiftModal } from '@/components/scheduling/packages/grid-engine/src';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Loader2,
  Sparkles,
  CircleCheckBig,
  CircleAlert,
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
import { Progress } from '@/components/ui/progress';
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
  const [autoFillRunning, setAutoFillRunning] = useState(false);
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [autoFillStats, setAutoFillStats] = useState({ added: 0, skipped: 0, failed: 0 });
  const [autoFillPhase, setAutoFillPhase] = useState('Ready to start');
  const [autoFillFinished, setAutoFillFinished] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
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
  const [gridSidebarWidth, setGridSidebarWidth] = useState<number>(280)
  const [copiedShift, setCopiedShift] = useState<Block | null>(null)
  /** Day timeline (GridView): double-click opens edit — Kanban uses the same ShiftModal pattern */
  const [dayViewShiftEdit, setDayViewShiftEdit] = useState<{ shift: Block; category: Resource } | null>(
    null,
  )
  const [settingsOverride, setSettingsOverride] = useState<Partial<Settings>>({})

  // Dashboard store for sidebar management
  const { setSidebarCollapsed, sidebarCollapsed } = useDashboardStore();

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

  useEffect(() => {
    const isRunning = autoFillRunning || autoFillMutation.isPending;
    if (!isRunning) {
      setAutoFillProgress(0);
      return;
    }

    setAutoFillProgress((p) => (p > 6 ? p : 8));
    const intervalId = window.setInterval(() => {
      setAutoFillProgress((prev) => {
        if (prev >= 92) return 92;
        if (prev < 40) return prev + 8;
        if (prev < 70) return prev + 5;
        return prev + 2;
      });
    }, 420);

    return () => window.clearInterval(intervalId);
  }, [autoFillRunning, autoFillMutation.isPending]);

  useEffect(() => {
    if (!(autoFillRunning || autoFillMutation.isPending)) return;
    setAutoFillPhase((prev) => {
      if (autoFillProgress < 28) return 'Loading employees and contracted hours';
      if (autoFillProgress < 58) return 'Calculating optimal coverage';
      if (autoFillProgress < 88) return 'Creating draft shifts';
      if (autoFillStats.added || autoFillStats.skipped || autoFillStats.failed) return 'Finalizing results';
      return prev;
    });
  }, [autoFillProgress, autoFillRunning, autoFillMutation.isPending, autoFillStats]);

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

  const eventCount = useMemo((): number => {
    if (!date) return 0
    const base = viewBase
    if (base === 'day') {
      const iso = date.toISOString().slice(0, 10)
      return filteredShifts.filter((s) => String((s as unknown as { date: unknown }).date).slice(0, 10) === iso).length
    }
    if (base === 'week') {
      const wd = getWeekDates(date)
      const s = wd[0]?.toISOString().slice(0, 10) ?? ''
      const e = wd[6]?.toISOString().slice(0, 10) ?? ''
      return filteredShifts.filter((sh) => {
        const d = String((sh as unknown as { date: unknown }).date).slice(0, 10)
        return d >= s && d <= e
      }).length
    }
    if (base === 'month') {
      const y = date.getFullYear()
      const m = date.getMonth()
      return filteredShifts.filter((sh) => {
        const d = new Date(String((sh as unknown as { date: unknown }).date).slice(0, 10) + 'T12:00:00')
        return d.getFullYear() === y && d.getMonth() === m
      }).length
    }
    if (base === 'year') {
      const y = date.getFullYear()
      return filteredShifts.filter((sh) => {
        const d = new Date(String((sh as unknown as { date: unknown }).date).slice(0, 10) + 'T12:00:00')
        return d.getFullYear() === y
      }).length
    }
    return 0
  }, [date, viewBase, filteredShifts, getWeekDates])

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

  // Fetch window expands to cover the full visible range for each view so the
  // grid never shows blank shifts when navigating to month / year view.
  const calendarFetchRange = useMemo(() => {
    const anchor = date ?? new Date();
    if (viewBase === 'day') {
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    }
    if (viewBase === 'week') {
      const wd = getWeekDates(anchor);
      const s = wd[0] ?? anchor;
      const e = wd[6] ?? anchor;
      return { start: startOfDay(s), end: endOfDay(e) };
    }
    if (viewBase === 'month') {
      const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: startOfDay(s), end: endOfDay(e) };
    }
    // year
    const s = new Date(anchor.getFullYear(), 0, 1);
    const e = new Date(anchor.getFullYear(), 11, 31);
    return { start: startOfDay(s), end: endOfDay(e) };
  }, [date, viewBase, getWeekDates]);

  const { data: eventsData, refetch: refetchEvents, error: eventsError } = useCalendarEvents({
    startDate: calendarFetchRange.start.toISOString(),
    endDate: calendarFetchRange.end.toISOString(),
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

  // Transform events to shifts
  useEffect(() => {
    type ApiScheduleEvent = {
      id: string;
      startDate: string;
      endDate: string;
      roleId?: string;
      employerBadge?: string;
      user?: { id?: string; name?: string };
      shiftStatus?: string;
      breakStartH?: number;
      breakEndH?: number;
      breakMinutes?: number;
    };
    // getCalendarEvents returns { data: { events } } — unwrap both layers
    const ev = (eventsData as { data?: { events?: ApiScheduleEvent[] } } | undefined)?.data?.events;
    // Always replace shifts — even an empty array clears stale data from previous navigation
    const transformedShifts: Block[] = (ev ?? []).map((event) => {
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);

      const startH = startDate.getHours() + startDate.getMinutes() / 60;
      const endH = endDate.getHours() + endDate.getMinutes() / 60;

      const roleId = event.roleId || roles[0]?.id || 'default';
      const employerBadge = typeof event.employerBadge === 'string' ? event.employerBadge : 'Own staff';

      return {
        id: event.id,
        categoryId: roleId,
        employeeId: event.user?.id || 'unassigned',
        date: event.startDate.slice(0, 10),
        startH,
        endH,
        employee: event.user?.name || 'Unassigned',
        status: event.shiftStatus === 'draft' ? 'draft' : 'published',
        meta: { employerBadge },
        // Break visualisation — populated from DB when saved via ShiftModal
        ...(event.breakStartH !== undefined && { breakStartH: event.breakStartH }),
        ...(event.breakEndH   !== undefined && { breakEndH:   event.breakEndH }),
      };
    });
    setShifts(transformedShifts);
  }, [eventsData, roles]);

  /** Convert decimal hours → { hour, minute } for the API */
  const toHourMinute = (h: number) => ({
    hour: Math.floor(h),
    minute: Math.round((h - Math.floor(h)) * 60),
  });

  // Handle shifts change — useCallback so the reference is stable for child components.
  // Takes a snapshot of `shifts` at call time to avoid stale-closure bugs.
  const handleShiftsChange = useCallback(
    async (newShifts: Block[], prevShifts: Block[] = shifts) => {
      // Optimistic update first — UI responds immediately
      setShifts(newShifts);

      const prevIds = new Set(prevShifts.map((s) => s.id));
      const nextIds = new Set(newShifts.map((s) => s.id));

      const created = newShifts.filter((s) => !prevIds.has(s.id));
      const deleted = prevShifts.filter((s) => !nextIds.has(s.id));
      const updated = newShifts.filter((s) => {
        if (!prevIds.has(s.id)) return false;
        const orig = prevShifts.find((o) => o.id === s.id)!;
        return (
          orig.startH !== s.startH ||
          orig.endH !== s.endH ||
          orig.employeeId !== s.employeeId ||
          orig.categoryId !== s.categoryId ||
          orig.date !== s.date
        );
      });

      const results = await Promise.allSettled([
        ...created.map((shift) => {
          const empRow = (employees as Array<{ id: string; employers?: Array<{ id: string }> }>)
            .find((e) => e.id === shift.employeeId);
          const employerId = empRow?.employers?.[0]?.id ?? 'default';
          const st = toHourMinute(shift.startH);
          const et = toHourMinute(shift.endH);
          return createEventMutation.mutateAsync({
            employeeId: shift.employeeId !== 'unassigned' ? shift.employeeId : undefined,
            roleId: shift.categoryId,
            locationId: selectedLocationId || (locations[0]?.id ?? ''),
            employerId,
            startDate: shift.date,
            startTime: st,
            endDate: shift.date,
            endTime: et,
            notes: '',
            ...(shift.breakStartH !== undefined && { breakStartH: shift.breakStartH }),
            ...(shift.breakEndH   !== undefined && { breakEndH:   shift.breakEndH }),
          });
        }),
        ...deleted.map((shift) => deleteEventMutation.mutateAsync(shift.id)),
        ...updated.map((shift) => {
          const st = toHourMinute(shift.startH);
          const et = toHourMinute(shift.endH);
          return updateEventMutation.mutateAsync({
            id: shift.id,
            data: {
              employeeId: shift.employeeId !== 'unassigned' ? shift.employeeId : undefined,
              roleId: shift.categoryId,
              startDate: shift.date,
              startTime: st,
              endDate: shift.date,
              endTime: et,
              ...(shift.breakStartH !== undefined && { breakStartH: shift.breakStartH }),
              ...(shift.breakEndH   !== undefined && { breakEndH:   shift.breakEndH }),
              // Clear break when both are absent
              ...((shift.breakStartH === undefined && shift.breakEndH === undefined) && { breakMinutes: 0 }),
            },
          });
        }),
      ]);

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length) {
        toast.error(`${failures.length} shift change${failures.length > 1 ? 's' : ''} failed to save`);
        // Revert optimistic update on any failure
        await refetchEvents();
      } else if (created.length || deleted.length || updated.length) {
        const parts: string[] = [];
        if (created.length) parts.push(`${created.length} created`);
        if (updated.length) parts.push(`${updated.length} updated`);
        if (deleted.length) parts.push(`${deleted.length} deleted`);
        toast.success(parts.join(' · '));
        await refetchEvents();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shifts, employees, selectedLocationId, locations, createEventMutation, updateEventMutation, deleteEventMutation, refetchEvents],
  );

  /** GridView context-menu delete (Day / week timeline) — confirm UI is inside GridView */
  const handleDeleteShiftForGrid = useCallback(
    async (shiftId: string) => {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      setDayViewShiftEdit((e) => (e?.shift.id === shiftId ? null : e));
      try {
        await deleteEventMutation.mutateAsync(shiftId);
        toast.success('Shift deleted successfully');
        await refetchEvents();
      } catch (error) {
        console.error('Failed to delete shift:', error);
        toast.error('Failed to delete shift');
        await refetchEvents();
      }
    },
    [deleteEventMutation, refetchEvents],
  );

  /** ShiftModal save from day timeline */
  const handleDayViewShiftUpdate = useCallback(
    async (updated: Block) => {
      setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      try {
        const startHour = Math.floor(updated.startH);
        const startMinute = Math.round((updated.startH - startHour) * 60);
        const endHour = Math.floor(updated.endH);
        const endMinute = Math.round((updated.endH - endHour) * 60);
        await updateEventMutation.mutateAsync({
          id: updated.id,
          data: {
            employeeId: updated.employeeId !== 'unassigned' ? updated.employeeId : undefined,
            roleId: updated.categoryId,
            startDate: updated.date,
            startTime: { hour: startHour, minute: startMinute },
            endDate: updated.date,
            endTime: { hour: endHour, minute: endMinute },
            ...(updated.breakStartH !== undefined && { breakStartH: updated.breakStartH }),
            ...(updated.breakEndH   !== undefined && { breakEndH:   updated.breakEndH }),
            ...((updated.breakStartH === undefined && updated.breakEndH === undefined) && { breakMinutes: 0 }),
          },
        });
        toast.success('Shift updated successfully');
        await refetchEvents();
      } catch (error) {
        console.error('Failed to update shift:', error);
        toast.error('Failed to update shift');
        await refetchEvents();
      }
    },
    [updateEventMutation, refetchEvents],
  );

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
    setAutoFillStats({ added: 0, skipped: 0, failed: 0 });
    setAutoFillPhase('Ready to start');
    setAutoFillProgress(0);
    setAutoFillFinished(false);
    setAutoFillError(null);
    setAutoFillDialogOpen(true);
  };

  const confirmAutoFill = async () => {
    if (!date || !selectedLocationId) return;
    const managedRoles = [...roleIdsForScheduling];
    // Do NOT close dialog yet — keep it open in loading state to block double-submit
    setAutoFillRunning(true);
    setAutoFillStats({ added: 0, skipped: 0, failed: 0 });
    setAutoFillPhase('Starting auto-fill');
    setAutoFillFinished(false);
    setAutoFillError(null);
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
      setAutoFillStats({ added: ok, skipped: sk, failed: fail });
      setAutoFillPhase('Completed');
      setAutoFillProgress(100);
      setAutoFillFinished(true);
      toast.message(`Fill complete: ${ok} shifts created · ${sk} skipped · ${fail} need manual fixes`);
      await refetchEvents();
    } catch {
      setAutoFillPhase('Auto-fill failed');
      setAutoFillFinished(true);
      setAutoFillError('Auto-fill failed. Please retry or adjust roles and contracted hours.');
      toast.error('Auto-fill failed');
    } finally {
      setAutoFillRunning(false);
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

  // sidebarCollapsed comes from useDashboardStore — tracks sidebar width for fixed positioning
  const sidebarLeft = sidebarCollapsed ? 70 : 280

  return (
    <div
      className="flex flex-col bg-background">
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
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-[auto_1fr] grid-rows-2 items-center gap-x-2 gap-y-1">
                  <div className="row-span-2 self-stretch">
                    <button
                      className="flex h-full min-h-[56px] w-12 shrink-0 cursor-pointer flex-col items-center overflow-hidden rounded-md border border-border bg-background shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onClick={goToToday}
                      title="Go to today"
                    >
                      <span className="flex h-5 w-full items-center justify-center bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
                        {new Date().toLocaleString('en-US', { month: 'short' })}
                      </span>
                      <span className="flex w-full flex-1 items-center justify-center text-lg font-bold tabular-nums text-foreground">
                        {new Date().getDate()}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold text-foreground">{monthTitle}</span>
                    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <BadgeCheck size={11} className="shrink-0" />
                      {eventCount} {eventCount === 1 ? 'event' : 'events'}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded"
                        title="Previous"
                      >
                        <ChevronLeft size={14} />
                      </Button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 min-w-0 border-transparent bg-transparent px-2 text-sm font-normal shadow-none hover:bg-muted/50 hover:text-foreground"
                            title="Pick a date"
                            type="button"
                          >
                            {rangeLabel}
                          </Button>
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

                      <Button
                        onClick={() => navigate(1)}
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded"
                        title="Next"
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
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

          <div className="not-prose flex min-h-0 w-full min-w-0 flex-1 flex-col">
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
                shifts={filteredShifts}
                onSettingsChange={handleSettingsChange}
                gridSidebarWidth={gridSidebarWidth}
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
                  onShiftClick={(block, resource) => setDayViewShiftEdit({ shift: block, category: resource })}
                  onAddShift={() => setHeaderAddOpen(true)}
                  onDeleteShift={handleDeleteShiftForGrid}
                  initialScrollToNow
                  scrollToNowRef={scrollToNowRef}
                  readOnly={false}
                  copiedShift={copiedShift}
                  setCopiedShift={setCopiedShift}
                  sidebarWidth={gridSidebarWidth}
                  onSidebarWidthChange={setGridSidebarWidth}
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
          {dayViewShiftEdit && (
            <ShiftModal
              shift={dayViewShiftEdit.shift}
              category={dayViewShiftEdit.category}
              allShifts={shifts}
              onClose={() => setDayViewShiftEdit(null)}
              onPublish={(id) =>
                setShifts((p) => p.map((s) => (s.id === id ? { ...s, status: 'published' as const } : s)))
              }
              onUnpublish={(id) =>
                setShifts((p) => p.map((s) => (s.id === id ? { ...s, status: 'draft' as const } : s)))
              }
              onDelete={(id) => {
                void handleDeleteShiftForGrid(id);
                setDayViewShiftEdit(null);
              }}
              onUpdate={(u) => {
                void handleDayViewShiftUpdate(u);
              }}
            />
          )}
        </div>
      </SchedulerProvider>

      {/* ── Auto-fill confirm dialog ─────────────────────────────────────────── */}
      <AlertDialog
        open={autoFillDialogOpen}
        onOpenChange={(open) => {
          // Block closing while the mutation is running to prevent double-submit
          if (autoFillMutation.isPending || autoFillRunning) return;
          setAutoFillDialogOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[560px] overflow-hidden border-border/70 p-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">
              {autoFillMutation.isPending || autoFillRunning
                ? 'Running auto-fill'
                : autoFillFinished
                  ? 'Auto-fill results'
                  : 'Run auto-fill'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {autoFillMutation.isPending || autoFillRunning ? (
                  <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/12 via-primary/6 to-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border border-primary/30 bg-background/70 p-1.5">
                          <Sparkles className="size-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">Running auto-fill...</p>
                          <p className="text-sm text-muted-foreground">Creating roster shifts from contracted hours and role coverage.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          {autoFillPhase}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{Math.round(autoFillProgress)}%</span>
                      </div>
                      <Progress value={autoFillProgress} className="h-2.5" />
                      <p className="mt-2 text-xs text-muted-foreground">Filling shifts — please wait, do not close this window.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-emerald-500/10 px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Added</div>
                        <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{autoFillStats.added}</div>
                      </div>
                      <div className="rounded-lg border bg-amber-500/10 px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Skipped</div>
                        <div className="text-lg font-semibold text-amber-700 dark:text-amber-400">{autoFillStats.skipped}</div>
                      </div>
                      <div className="rounded-lg border bg-rose-500/10 px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Needs review</div>
                        <div className="text-lg font-semibold text-rose-700 dark:text-rose-400">{autoFillStats.failed}</div>
                      </div>
                    </div>
                  </div>
                ) : autoFillFinished ? (
                  <div className="space-y-4 p-5">
                    <div
                      className={cn(
                        "rounded-xl border p-4",
                        autoFillError ? "border-rose-300/50 bg-rose-500/10" : "border-emerald-300/40 bg-emerald-500/10",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border bg-background/70 p-1.5">
                          {autoFillError ? (
                            <CircleAlert className="size-4 text-rose-500" />
                          ) : (
                            <CircleCheckBig className="size-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground">
                            {autoFillError ? "Auto-fill failed" : "Auto-fill completed"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {autoFillError ?? "Review the summary below. You can close this dialog or run again."}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-emerald-500/10 px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Added</div>
                        <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{autoFillStats.added}</div>
                      </div>
                      <div className="rounded-lg border bg-amber-500/10 px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Skipped</div>
                        <div className="text-lg font-semibold text-amber-700 dark:text-amber-400">{autoFillStats.skipped}</div>
                      </div>
                      <div className="rounded-lg border bg-rose-500/10 px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Needs review</div>
                        <div className="text-lg font-semibold text-rose-700 dark:text-rose-400">{autoFillStats.failed}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-base font-semibold text-foreground">Run auto-fill?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This will auto-fill the current week for full-time and part-time employees based on contracted hours.
                        Existing draft shifts are kept and not replaced.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/70 bg-muted/10 px-5 py-4">
            <AlertDialogCancel disabled={autoFillMutation.isPending || autoFillRunning}>
              {autoFillFinished ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent Radix AlertDialogAction from auto-closing immediately.
                e.preventDefault();
                void confirmAutoFill();
              }}
              disabled={autoFillMutation.isPending || autoFillRunning}
              className="min-w-[110px]"
            >
              {autoFillMutation.isPending || autoFillRunning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Running…
                </span>
              ) : (
                autoFillFinished ? 'Run again' : 'Run auto-fill'
              )}
            </AlertDialogAction>
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