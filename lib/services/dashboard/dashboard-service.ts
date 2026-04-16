import { endOfWeek, format, getDay, startOfWeek, subDays } from 'date-fns';
import { apiErrors } from '@/lib/api/api-error';
import { employeeLocationFilter, type AuthWithLocations } from '@/lib/auth/auth-api';
import { DashboardDbQueries } from '@/lib/db/queries/dashboard';
import { parseTimeToHour24 } from '@/lib/utils/format/time';
import { connectDB } from '@/lib/db';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function getEmployerCategoriesWithColors(employees: unknown[]): Promise<Array<{ name: string; color?: string }>> {
  const { Employer } = await import('@/lib/db');
  const employerNames = new Set<string>();
  for (const e of employees) {
    const emp = e as { employer?: string[] };
    const employers = Array.isArray(emp.employer) ? emp.employer : [];
    for (const employer of employers) {
      if (employer && employer.trim()) employerNames.add(employer.trim());
    }
  }

  const categories = await Employer.find({ name: { $in: Array.from(employerNames) } }).select('name color').lean();
  const categoryMap = new Map(categories.map((cat: any) => [cat.name, cat.color]));
  return Array.from(employerNames)
    .sort()
    .map((name) => ({ name, color: categoryMap.get(name) }));
}

function normalizeEmployerCategory(employer: string): string {
  const lower = (employer || '').toLowerCase().trim();
  if (!lower) return 'uncategorized';
  return employer.trim();
}

export class DashboardService {
  async getStats(ctx: AuthWithLocations, query: any) {
    await connectDB();
    const { timelineDate: timelineDateParam } = query || {};
    const now = new Date();

    let timelineDate = new Date(now);
    if (timelineDateParam) {
      const d = new Date(timelineDateParam);
      if (!isNaN(d.getTime())) timelineDate = d;
    }
    timelineDate.setHours(0, 0, 0, 0);
    const timelineDateEnd = new Date(timelineDate);
    timelineDateEnd.setHours(23, 59, 59, 999);

    const empFilter: Record<string, unknown> = {};
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];

    const employees = await DashboardDbQueries.findEmployeesLean(empFilter);

    const allowedPins =
      ctx.userLocations && ctx.userLocations.length > 0
        ? (employees as { pin?: string }[]).map((e) => e.pin ?? '').filter(Boolean)
        : null;
    const timesheetFilter = (base: Record<string, unknown>): Record<string, unknown> =>
      allowedPins && allowedPins.length > 0 ? { ...base, pin: { $in: allowedPins } } : base;

    // 1) Daily Timeline
    const todayShifts = await DashboardDbQueries.findShiftsLean(
      timesheetFilter({ date: { $gte: timelineDate, $lte: timelineDateEnd } })
    );

    type HourCounts = { clockIn: number; breakIn: number; breakOut: number; clockOut: number };
    const byHour: Record<string, HourCounts> = {};
    for (let h = 6; h <= 20; h++) {
      byHour[`${h.toString().padStart(2, '0')}:00`] = { clockIn: 0, breakIn: 0, breakOut: 0, clockOut: 0 };
    }

    for (const shift of todayShifts as any[]) {
      if (shift.clockIn?.time) {
        const hour24 = parseTimeToHour24(shift.clockIn.time);
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) byHour[`${hour24.toString().padStart(2, '0')}:00`].clockIn += 1;
      }
      if (shift.breakIn?.time) {
        const hour24 = parseTimeToHour24(shift.breakIn.time);
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) byHour[`${hour24.toString().padStart(2, '0')}:00`].breakIn += 1;
      }
      if (shift.breakOut?.time) {
        const hour24 = parseTimeToHour24(shift.breakOut.time);
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) byHour[`${hour24.toString().padStart(2, '0')}:00`].breakOut += 1;
      }
      if (shift.clockOut?.time) {
        const hour24 = parseTimeToHour24(shift.clockOut.time);
        if (hour24 != null && hour24 >= 6 && hour24 <= 20) byHour[`${hour24.toString().padStart(2, '0')}:00`].clockOut += 1;
      }
    }

    const dailyTimeline = Object.entries(byHour)
      .map(([hour, counts]) => ({ hour, ...counts }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // 2) Location Distribution
    const locationCounts: Record<string, number> = {};
    for (const e of employees as any[]) {
      const locs = Array.isArray(e.location) ? e.location : [];
      if (locs.length === 0) locationCounts['Unassigned'] = (locationCounts['Unassigned'] ?? 0) + 1;
      else {
        for (const loc of locs) {
          const name = String(loc || 'Unassigned').trim() || 'Unassigned';
          locationCounts[name] = (locationCounts[name] ?? 0) + 1;
        }
      }
    }

    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    const locationDistribution = Object.entries(locationCounts)
      .map(([name], i) => ({ name, value: locationCounts[name], fill: chartColors[i % chartColors.length] }))
      .sort((a, b) => b.value - a.value);

    // 3) Attendance by Day (last 4 weeks)
    const fourWeeksAgo = subDays(now, 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);
    const nowEnd = new Date(now);
    nowEnd.setHours(23, 59, 59, 999);

    const shiftsForAttendance = await DashboardDbQueries.findShiftsLean(
      timesheetFilter({ date: { $gte: fourWeeksAgo, $lte: nowEnd }, clockIn: { $exists: true } })
    );

    const dayCounts: Record<string, Set<string>> = {};
    DAY_NAMES.forEach((d) => (dayCounts[d] = new Set()));
    for (const shift of shiftsForAttendance as any[]) {
      const d = shift.date instanceof Date ? shift.date : new Date(shift.date);
      if (!isNaN(d.getTime())) {
        const dayName = DAY_NAMES[getDay(d)];
        dayCounts[dayName].add(String(shift.pin));
      }
    }
    const attendanceByDay = DAY_NAMES.map((day) => ({ day, count: dayCounts[day]?.size ?? 0 }));

    // 4) Weekly Trends (last 12 weeks)
    const weeksCount = 12;
    const weekStarts: Date[] = [];
    for (let i = 0; i < weeksCount; i++) {
      const d = subDays(now, (weeksCount - 1 - i) * 7);
      weekStarts.push(startOfWeek(d, { weekStartsOn: 1 }));
    }

    const totalEmployees = (employees as any[]).length;
    const weeklyData: { totalHours: number; activeEmployees: number; attendanceRate: number }[] = [];

    for (let w = 0; w < weekStarts.length; w++) {
      const start = new Date(weekStarts[w]);
      start.setHours(0, 0, 0, 0);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      end.setHours(23, 59, 59, 999);

      const weekShifts = await DashboardDbQueries.findShiftsLean(timesheetFilter({ date: { $gte: start, $lte: end } }));

      let totalHours = 0;
      const activePins = new Set<string>();
      for (const shift of weekShifts as any[]) {
        if (shift.clockIn) activePins.add(String(shift.pin));
        if (shift.totalWorkingHours && shift.totalWorkingHours > 0) totalHours += shift.totalWorkingHours;
      }

      const attendanceRate = totalEmployees > 0 ? Math.round((activePins.size / totalEmployees) * 100) : 0;
      weeklyData.push({ totalHours: Math.round(totalHours), activeEmployees: activePins.size, attendanceRate });
    }

    const weeklyMonthly = weekStarts.map((start, i) => {
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return {
        period: `${format(start, 'dd MMM')}-${format(end, 'dd MMM')}`,
        totalHours: weeklyData[i]?.totalHours ?? 0,
        activeEmployees: weeklyData[i]?.activeEmployees ?? 0,
        attendanceRate: weeklyData[i]?.attendanceRate ?? 0,
      };
    });

    // 5) Role-based Staffing (last 7 days)
    const sevenDaysAgo = subDays(now, 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentShifts = await DashboardDbQueries.findShiftsLean(
      timesheetFilter({ date: { $gte: sevenDaysAgo, $lte: nowEnd }, clockIn: { $exists: true } })
    );

    const { EmployeeRoleAssignment } = await import('@/lib/db');
    const roleAssignments = await EmployeeRoleAssignment.find({ isActive: true }).populate('roleId').populate('employeeId').lean();

    const employeeIdToRoles = new Map<string, Array<{ name: string; color?: string }>>();
    for (const assignment of roleAssignments as any[]) {
      const empId = String((assignment.employeeId as any)?._id || assignment.employeeId);
      const roleName = (assignment.roleId as any)?.name || 'Other';
      const roleColor = (assignment.roleId as any)?.color;
      if (!employeeIdToRoles.has(empId)) employeeIdToRoles.set(empId, []);
      employeeIdToRoles.get(empId)!.push({ name: roleName, color: roleColor });
    }

    const pinToRoles = new Map<string, Array<{ name: string; color?: string }>>();
    for (const e of employees as any[]) {
      const empId = String(e._id);
      const pin = e.pin;
      const roles = employeeIdToRoles.get(empId) || [];
      if (roles.length > 0) pinToRoles.set(pin, roles);
    }

    const roleColorMap = new Map<string, string>();
    for (const roles of pinToRoles.values()) for (const role of roles) if (role.color && !roleColorMap.has(role.name)) roleColorMap.set(role.name, role.color);

    const countByRole = new Map<string, Set<string>>();
    for (const shift of recentShifts as any[]) {
      const pin = String(shift.pin ?? '');
      const roles = pinToRoles.get(pin);
      if (roles && roles.length > 0) {
        const roleName = roles[0].name;
        if (!countByRole.has(roleName)) countByRole.set(roleName, new Set());
        countByRole.get(roleName)!.add(pin);
      }
    }

    const roleStaffingByRole = Array.from(countByRole.entries())
      .map(([name, pins]) => ({ name, count: pins.size, color: roleColorMap.get(name) }))
      .sort((a, b) => b.count - a.count);
    if (roleStaffingByRole.length === 0) roleStaffingByRole.push({ name: 'No data', count: 0, color: undefined });

    // 6) Employer Mix (last 6 months)
    const monthsCount = 6;
    const employerCategoriesWithColors = await getEmployerCategoriesWithColors(employees);
    const employerCategories = employerCategoriesWithColors.map((c) => c.name);
    const employerMix: { month: string; [key: string]: number | string }[] = [];

    const pinToEmployer = new Map<string, string[]>();
    for (const e of employees as any[]) pinToEmployer.set(e.pin, Array.isArray(e.employer) ? e.employer : []);

    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      const monthStr = format(monthStart, 'MMM yyyy');

      const pinsActiveInMonth = await DashboardDbQueries.distinctPins(
        timesheetFilter({ date: { $gte: monthStart, $lte: monthEnd } })
      );

      const counts: Record<string, number> = {};
      employerCategories.forEach((cat) => (counts[cat] = 0));

      for (const pin of pinsActiveInMonth as any[]) {
        const employers = pinToEmployer.get(String(pin)) || ['Uncategorized'];
        const cat = normalizeEmployerCategory(employers[0] ?? 'Uncategorized');
        if (counts[cat] !== undefined) counts[cat] += 1;
        else counts[cat] = 1;
      }

      employerMix.push({ month: monthStr, ...counts });
    }

    return {
      dailyTimeline,
      locationDistribution,
      attendanceByDay,
      weeklyMonthly,
      roleStaffingByRole,
      employerMix,
      employerCategories: employerCategoriesWithColors,
    };
  }

  async getHoursSummary(ctx: AuthWithLocations, query: any) {
    await connectDB();
    const { format: fmt, startOfWeek, endOfWeek } = await import('date-fns');
    const now = new Date();
    const defaultStart = startOfWeek(now, { weekStartsOn: 1 });
    const defaultEnd = endOfWeek(now, { weekStartsOn: 1 });
    const start = query?.startDate ? new Date(query.startDate) : defaultStart;
    const end = query?.endDate ? new Date(query.endDate) : defaultEnd;

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw apiErrors.badRequest('Invalid startDate or endDate (use yyyy-MM-dd)');
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 366) throw apiErrors.badRequest('Date range too large');

    const empFilter: Record<string, unknown> = {};
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    const employees = await DashboardDbQueries.findEmployeesLean(empFilter);

    const shiftQuery: Record<string, unknown> = {
      date: { $gte: start, $lte: end },
      status: { $in: ['completed', 'approved'] },
    };
    if (Object.keys(locFilter).length > 0) {
      const allowedPins = (employees as { pin?: string }[]).map((e) => e.pin ?? '').filter(Boolean);
      shiftQuery.pin = allowedPins.length > 0 ? { $in: allowedPins } : { $in: [''] };
    }

    const shifts = await DashboardDbQueries.findShiftsLean(shiftQuery);

    const minutesByPin = new Map<string, number>();
    for (const shift of shifts as any[]) {
      const pin = String(shift.pin ?? '');
      if (!pin) continue;

      let minutes = 0;
      if (shift.totalWorkingHours && shift.totalWorkingHours > 0) {
        minutes = shift.totalWorkingHours * 60;
      } else if (shift.clockIn?.time && shift.clockOut?.time) {
        const clockInTime = shift.clockIn.time instanceof Date ? shift.clockIn.time : new Date(shift.clockIn.time);
        const clockOutTime = shift.clockOut.time instanceof Date ? shift.clockOut.time : new Date(shift.clockOut.time);
        const breakMinutes = shift.totalBreakMinutes ?? 0;
        if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
          const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
          minutes = Math.max(0, totalMinutes - breakMinutes);
        }
      }

      if (minutes > 0) minutesByPin.set(pin, (minutesByPin.get(pin) ?? 0) + minutes);
    }

    const pinToName = new Map<string, string>();
    for (const e of employees as any[]) pinToName.set(e.pin, e.name ?? e.pin);

    const withHours: { name: string; pin: string; hours: number }[] = [];
    for (const [pin, totalMinutes] of minutesByPin) {
      const hours = Math.round((totalMinutes / 60) * 10) / 10;
      withHours.push({ name: pinToName.get(pin) ?? pin, pin, hours });
    }

    const mostHours = [...withHours].sort((a, b) => b.hours - a.hours).slice(0, 20);
    const leastHours = withHours.filter((x) => x.hours < 38).sort((a, b) => a.hours - b.hours);

    return {
      mostHours,
      leastHours,
      startDate: fmt(start, 'yyyy-MM-dd'),
      endDate: fmt(end, 'yyyy-MM-dd'),
    };
  }

  async getInactiveEmployees(ctx: AuthWithLocations) {
    await connectDB();
    const { format: fmt } = await import('date-fns');

    const INACTIVE_DAYS = 100;
    const DATE_FMT = 'dd-MM-yyyy';

    const grouped = await DashboardDbQueries.aggregateShifts<{ _id: string; lastDate: Date }>([
      { $group: { _id: '$pin', lastDate: { $max: '$date' } } },
    ]);

    const lastPunchMap = new Map<string, { date: Date; dateStr: string }>();
    for (const x of grouped as any[]) {
      if (!x._id || !x.lastDate) continue;
      const pin = String(x._id);
      const date = x.lastDate instanceof Date ? x.lastDate : new Date(x.lastDate);
      if (!isNaN(date.getTime())) lastPunchMap.set(pin, { date, dateStr: fmt(date, DATE_FMT) });
    }

    const empFilter: Record<string, unknown> = {};
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    const allEmployees = await DashboardDbQueries.findEmployeesLean(empFilter);

    const inactive: Array<{ id: string; name: string; pin: string; lastPunchDate: string | null; daysInactive: number }> =
      [];
    const now = new Date();

    for (const e of allEmployees as any[]) {
      const pin = e.pin ?? '';
      const entry = lastPunchMap.get(pin) ?? null;
      let daysInactive: number;
      if (!entry || isNaN(entry.date.getTime())) daysInactive = INACTIVE_DAYS + 1;
      else daysInactive = Math.floor((now.getTime() - entry.date.getTime()) / (24 * 60 * 60 * 1000));

      if (daysInactive >= INACTIVE_DAYS) {
        inactive.push({
          id: String(e._id),
          name: e.name ?? '',
          pin,
          lastPunchDate: entry ? fmt(entry.date, DATE_FMT) : null,
          daysInactive,
        });
      }
    }

    inactive.sort((a, b) => b.daysInactive - a.daysInactive);
    return { inactiveEmployees: inactive, thresholdDays: INACTIVE_DAYS };
  }

  async getRoleStats(args: { ctx: AuthWithLocations; roleId: string; query: any }) {
    await connectDB();
    const { ctx, roleId, query } = args;
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache');
    const { getUserPermissionContext, canViewRole } = await import('@/lib/utils/dashboard/dashboard-permissions');
    const { getEnabledLocationsForRole } = await import('@/lib/utils/dashboard/dashboard-validation');
    const { getActiveRoleAssignments, aggregateShiftData } = await import('@/lib/utils/dashboard/dashboard-queries');
    const mongoose = await import('mongoose');
    const { Team } = await import('@/lib/db');

    const { ObjectId } = mongoose.Types;
    if (!ObjectId.isValid(roleId)) {
      return { status: 400, data: { error: 'Invalid role ID format', code: 'INVALID_OBJECT_ID' } };
    }

    const dateParam = query?.date;
    let effectiveDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (isNaN(parsed.getTime())) {
        return {
          status: 400,
          data: {
            error: 'Invalid date parameter',
            code: 'INVALID_DATE_FORMAT',
            details: { provided: dateParam, expected: 'ISO 8601 date string (e.g., 2024-01-15)' },
          },
        };
      }
      effectiveDate = parsed;
    }

    const cacheKey = dashboardCache.generateKey(`/api/dashboard/role/${roleId}/stats`, { date: dateParam || undefined });
    const cached = dashboardCache.get(cacheKey);
    if (cached) return { status: 200, data: cached };

    const permCtx = await getUserPermissionContext(ctx.auth.sub);
    if (!permCtx || !canViewRole(permCtx, roleId)) {
      console.warn('[SECURITY] Unauthorized access attempt', {
        userId: ctx.auth.sub,
        resource: 'role',
        resourceId: roleId,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 403,
        data: { error: 'Forbidden: You do not have permission to view this role', code: 'INSUFFICIENT_PERMISSIONS' },
      };
    }

    const role = await Team.findById(roleId).select('name color').lean();
    if (!role) {
      return {
        status: 404,
        data: { error: 'Role not found', code: 'RESOURCE_NOT_FOUND', details: { resourceType: 'role', resourceId: roleId } },
      };
    }

    const enabledLocationIds = await getEnabledLocationsForRole(roleId, effectiveDate);
    const assignments = await getActiveRoleAssignments({ roleId, effectiveDate });
    const filteredAssignments = assignments.filter((a: any) => enabledLocationIds.includes(String((a.locationId as any)._id)));

    const employeePins = filteredAssignments.map((a: any) => (a.employeeId as any).pin);
    const uniquePins = [...new Set(employeePins)];
    const startDate = new Date(effectiveDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveDate);
    endDate.setHours(23, 59, 59, 999);

    const shiftData = await aggregateShiftData(uniquePins, startDate, endDate);

    const locationMap = new Map<
      string,
      { locationId: string; locationName: string; employeeCount: number; totalHours: number }
    >();
    for (const assignment of filteredAssignments as any[]) {
      const locationId = String((assignment.locationId as any)._id);
      const locationName = (assignment.locationId as any).name;
      if (!locationMap.has(locationId)) locationMap.set(locationId, { locationId, locationName, employeeCount: 0, totalHours: 0 });
      locationMap.get(locationId)!.employeeCount += 1;
    }
    const locationDistribution = Array.from(locationMap.values()).sort((a, b) => b.employeeCount - a.employeeCount);

    const response = {
      metadata: {
        roleId,
        roleName: (role as any).name,
        roleColor: (role as any).color,
        effectiveDate: effectiveDate.toISOString(),
        validationTimestamp: new Date().toISOString(),
        filters: { role: roleId, ...(dateParam && { date: dateParam }) },
      },
      metrics: {
        employeeCount: uniquePins.length,
        totalHours: shiftData.totalHours,
        activeEmployees: shiftData.activeEmployees,
        locationDistribution,
      },
      dailyTimeline: shiftData.dailyTimeline,
    };

    dashboardCache.set(cacheKey, response);
    return { status: 200, data: response };
  }

  async getLocationStats(args: { ctx: AuthWithLocations; locationId: string; query: any }) {
    await connectDB();
    const { ctx, locationId, query } = args;
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache');
    const { getUserPermissionContext, canViewLocation } = await import('@/lib/utils/dashboard/dashboard-permissions');
    const { getEnabledRolesForLocation } = await import('@/lib/utils/dashboard/dashboard-validation');
    const { getActiveRoleAssignments, aggregateShiftData } = await import('@/lib/utils/dashboard/dashboard-queries');
    const mongoose = await import('mongoose');
    const { Location } = await import('@/lib/db');

    const { ObjectId } = mongoose.Types;
    if (!ObjectId.isValid(locationId)) {
      return { status: 400, data: { error: 'Invalid location ID format', code: 'INVALID_OBJECT_ID' } };
    }

    const dateParam = query?.date;
    let effectiveDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (isNaN(parsed.getTime())) {
        return {
          status: 400,
          data: {
            error: 'Invalid date parameter',
            code: 'INVALID_DATE_FORMAT',
            details: { provided: dateParam, expected: 'ISO 8601 date string (e.g., 2024-01-15)' },
          },
        };
      }
      effectiveDate = parsed;
    }

    const cacheKey = dashboardCache.generateKey(`/api/dashboard/location/${locationId}/stats`, { date: dateParam || undefined });
    const cached = dashboardCache.get(cacheKey);
    if (cached) return { status: 200, data: cached };

    const permCtx = await getUserPermissionContext(ctx.auth.sub);
    if (!permCtx || !canViewLocation(permCtx, locationId)) {
      console.warn('[SECURITY] Unauthorized access attempt', {
        userId: ctx.auth.sub,
        resource: 'location',
        resourceId: locationId,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 403,
        data: { error: 'Forbidden: You do not have permission to view this location', code: 'INSUFFICIENT_PERMISSIONS' },
      };
    }

    const location = await Location.findById(locationId).select('name').lean();
    if (!location) {
      return {
        status: 404,
        data: {
          error: 'Location not found',
          code: 'RESOURCE_NOT_FOUND',
          details: { resourceType: 'location', resourceId: locationId },
        },
      };
    }

    const enabledRoleIds = await getEnabledRolesForLocation(locationId, effectiveDate);
    const assignments = await getActiveRoleAssignments({ locationId, effectiveDate });
    const filteredAssignments = assignments.filter((a: any) => enabledRoleIds.includes(String((a.roleId as any)._id)));

    const employeePins = filteredAssignments.map((a: any) => (a.employeeId as any).pin);
    const uniquePins = [...new Set(employeePins)];
    const startDate = new Date(effectiveDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveDate);
    endDate.setHours(23, 59, 59, 999);
    const shiftData = await aggregateShiftData(uniquePins, startDate, endDate);

    const roleMap = new Map<
      string,
      { roleId: string; roleName: string; roleColor?: string; employeeCount: number; totalHours: number }
    >();
    for (const assignment of filteredAssignments as any[]) {
      const roleId = String((assignment.roleId as any)._id);
      const roleName = (assignment.roleId as any).name;
      const roleColor = (assignment.roleId as any).color;
      if (!roleMap.has(roleId)) roleMap.set(roleId, { roleId, roleName, roleColor, employeeCount: 0, totalHours: 0 });
      roleMap.get(roleId)!.employeeCount += 1;
    }
    const roleDistribution = Array.from(roleMap.values()).sort((a, b) => b.employeeCount - a.employeeCount);

    const response = {
      metadata: {
        locationId,
        locationName: (location as any).name,
        effectiveDate: effectiveDate.toISOString(),
        validationTimestamp: new Date().toISOString(),
        filters: { location: locationId, ...(dateParam && { date: dateParam }) },
      },
      metrics: {
        employeeCount: uniquePins.length,
        totalHours: shiftData.totalHours,
        activeEmployees: shiftData.activeEmployees,
        roleDistribution,
      },
      dailyTimeline: shiftData.dailyTimeline,
    };

    dashboardCache.set(cacheKey, response);
    return { status: 200, data: response };
  }

  async getLocationRoleStats(args: { ctx: AuthWithLocations; locationId: string; roleId: string; query: any }) {
    await connectDB();
    const { ctx, locationId, roleId, query } = args;
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache');
    const { getUserPermissionContext, canViewLocation, canViewRole } = await import('@/lib/utils/dashboard/dashboard-permissions');
    const { validateLocationRolePairing } = await import('@/lib/utils/dashboard/dashboard-validation');
    const { getActiveRoleAssignments, aggregateShiftData } = await import('@/lib/utils/dashboard/dashboard-queries');
    const mongoose = await import('mongoose');
    const { Location, Team } = await import('@/lib/db');

    const { ObjectId } = mongoose.Types;
    if (!ObjectId.isValid(locationId)) return { status: 400, data: { error: 'Invalid location ID format', code: 'INVALID_OBJECT_ID' } };
    if (!ObjectId.isValid(roleId)) return { status: 400, data: { error: 'Invalid role ID format', code: 'INVALID_OBJECT_ID' } };

    const dateParam = query?.date;
    let effectiveDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (isNaN(parsed.getTime())) {
        return {
          status: 400,
          data: {
            error: 'Invalid date parameter',
            code: 'INVALID_DATE_FORMAT',
            details: { provided: dateParam, expected: 'ISO 8601 date string (e.g., 2024-01-15)' },
          },
        };
      }
      effectiveDate = parsed;
    }

    const cacheKey = dashboardCache.generateKey(`/api/dashboard/location/${locationId}/role/${roleId}/stats`, { date: dateParam || undefined });
    const cached = dashboardCache.get(cacheKey);
    if (cached) return { status: 200, data: cached };

    const permCtx = await getUserPermissionContext(ctx.auth.sub);
    if (!permCtx || !canViewLocation(permCtx, locationId) || !canViewRole(permCtx, roleId)) {
      console.warn('[SECURITY] Unauthorized access attempt', {
        userId: ctx.auth.sub,
        resource: 'location-role',
        locationId,
        roleId,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 403,
        data: { error: 'Forbidden: You do not have permission to view this location or role', code: 'INSUFFICIENT_PERMISSIONS' },
      };
    }

    const location = await Location.findById(locationId).select('name').lean();
    if (!location) {
      return { status: 404, data: { error: 'Location not found', code: 'RESOURCE_NOT_FOUND', details: { resourceType: 'location', resourceId: locationId } } };
    }
    const role = await Team.findById(roleId).select('name color').lean();
    if (!role) {
      return { status: 404, data: { error: 'Role not found', code: 'RESOURCE_NOT_FOUND', details: { resourceType: 'role', resourceId: roleId } } };
    }

    const pairingValid = await validateLocationRolePairing(locationId, roleId, effectiveDate);
    if (!pairingValid) {
      return { status: 400, data: { error: 'Location-role pairing is not enabled', code: 'INVALID_PAIRING', details: { locationId, roleId } } };
    }

    const assignments = await getActiveRoleAssignments({ locationId, roleId, effectiveDate });
    const employeePins = assignments.map((a: any) => (a.employeeId as any).pin);
    const uniquePins = [...new Set(employeePins)];
    const startDate = new Date(effectiveDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveDate);
    endDate.setHours(23, 59, 59, 999);
    const shiftData = await aggregateShiftData(uniquePins, startDate, endDate);

    const employees = (assignments as any[]).map((a) => ({
      employeeId: String((a.employeeId as any)._id),
      employeeName: (a.employeeId as any).name,
      totalHours: 0,
      shiftCount: 0,
    }));

    const response = {
      metadata: {
        locationId,
        locationName: (location as any).name,
        roleId,
        roleName: (role as any).name,
        roleColor: (role as any).color,
        effectiveDate: effectiveDate.toISOString(),
        validationTimestamp: new Date().toISOString(),
        pairingValid: true,
        filters: { location: locationId, role: roleId, ...(dateParam && { date: dateParam }) },
      },
      metrics: { employeeCount: uniquePins.length, totalHours: shiftData.totalHours, activeEmployees: shiftData.activeEmployees, employees },
      dailyTimeline: shiftData.dailyTimeline,
    };

    dashboardCache.set(cacheKey, response);
    return { status: 200, data: response };
  }

  async getUserStats(args: { ctx: AuthWithLocations; query: any }) {
    await connectDB();
    const { ctx, query } = args;
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache');
    const { getUserPermissionContext } = await import('@/lib/utils/dashboard/dashboard-permissions');
    const { validateLocationRolePairs } = await import('@/lib/utils/dashboard/dashboard-validation');
    const { getActiveRoleAssignments, aggregateShiftData } = await import('@/lib/utils/dashboard/dashboard-queries');
    const { User } = await import('@/lib/db');

    const dateParam = query?.date;
    let effectiveDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (isNaN(parsed.getTime())) {
        return {
          status: 400,
          data: {
            error: 'Invalid date parameter',
            code: 'INVALID_DATE_FORMAT',
            details: { provided: dateParam, expected: 'ISO 8601 date string (e.g., 2024-01-15)' },
          },
        };
      }
      effectiveDate = parsed;
    }

    const cacheKey = dashboardCache.generateKey(`/api/dashboard/user/stats`, { userId: ctx.auth.sub, date: dateParam || undefined });
    const cached = dashboardCache.get(cacheKey);
    if (cached) return { status: 200, data: cached };

    const permCtx = await getUserPermissionContext(ctx.auth.sub);
    if (!permCtx) return { status: 404, data: { error: 'User not found' } };

    const user = await User.findById(ctx.auth.sub).select('email name').lean();

    if (permCtx.managedLocations.length === 0 && permCtx.managedRoles.length === 0) {
      const emptyResponse = {
        metadata: {
          userId: ctx.auth.sub,
          email: (user as any)?.email || '',
          effectiveDate: effectiveDate.toISOString(),
          validationTimestamp: new Date().toISOString(),
          managedLocationsCount: 0,
          managedRolesCount: 0,
        },
        metrics: { totalEmployeeCount: 0, totalHours: 0, totalActiveEmployees: 0 },
        locationBreakdown: [],
        roleBreakdown: [],
      };
      return { status: 200, data: emptyResponse };
    }

    const pairs: Array<{ locationId: string; roleId: string }> = [];
    for (const locationId of permCtx.managedLocations) for (const roleId of permCtx.managedRoles) pairs.push({ locationId, roleId });

    const validationResults = await validateLocationRolePairs(pairs, effectiveDate);
    const validPairs = pairs.filter((pair) => validationResults.get(`${pair.locationId}:${pair.roleId}`) === true);

    const allAssignments: any[] = [];
    for (const pair of validPairs) {
      const assignments = await getActiveRoleAssignments({ locationId: pair.locationId, roleId: pair.roleId, effectiveDate });
      allAssignments.push(...assignments);
    }

    const employeePins = allAssignments.map((a) => (a.employeeId as any).pin);
    const uniquePins = [...new Set(employeePins)];
    const startDate = new Date(effectiveDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveDate);
    endDate.setHours(23, 59, 59, 999);
    const shiftData = await aggregateShiftData(uniquePins, startDate, endDate);

    const locationMap = new Map<
      string,
      {
        locationId: string;
        locationName: string;
        employeeCount: number;
        totalHours: number;
        roleDistribution: Array<{ roleId: string; roleName: string; employeeCount: number }>;
      }
    >();
    for (const assignment of allAssignments) {
      const locationId = String((assignment.locationId as any)._id);
      const locationName = (assignment.locationId as any).name;
      const roleId = String((assignment.roleId as any)._id);
      const roleName = (assignment.roleId as any).name;

      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, { locationId, locationName, employeeCount: 0, totalHours: 0, roleDistribution: [] });
      }
      const loc = locationMap.get(locationId)!;
      loc.employeeCount += 1;
      const existingRole = loc.roleDistribution.find((r) => r.roleId === roleId);
      if (existingRole) existingRole.employeeCount += 1;
      else loc.roleDistribution.push({ roleId, roleName, employeeCount: 1 });
    }
    const locationBreakdown = Array.from(locationMap.values()).sort((a, b) => b.employeeCount - a.employeeCount);

    const roleMap = new Map<
      string,
      {
        roleId: string;
        roleName: string;
        roleColor?: string;
        employeeCount: number;
        totalHours: number;
        locationDistribution: Array<{ locationId: string; locationName: string; employeeCount: number }>;
      }
    >();
    for (const assignment of allAssignments) {
      const roleId = String((assignment.roleId as any)._id);
      const roleName = (assignment.roleId as any).name;
      const roleColor = (assignment.roleId as any).color;
      const locationId = String((assignment.locationId as any)._id);
      const locationName = (assignment.locationId as any).name;

      if (!roleMap.has(roleId)) {
        roleMap.set(roleId, { roleId, roleName, roleColor, employeeCount: 0, totalHours: 0, locationDistribution: [] });
      }
      const role = roleMap.get(roleId)!;
      role.employeeCount += 1;
      const existingLocation = role.locationDistribution.find((l) => l.locationId === locationId);
      if (existingLocation) existingLocation.employeeCount += 1;
      else role.locationDistribution.push({ locationId, locationName, employeeCount: 1 });
    }
    const roleBreakdown = Array.from(roleMap.values()).sort((a, b) => b.employeeCount - a.employeeCount);

    const response = {
      metadata: {
        userId: ctx.auth.sub,
        email: (user as any)?.email || '',
        effectiveDate: effectiveDate.toISOString(),
        validationTimestamp: new Date().toISOString(),
        managedLocationsCount: permCtx.managedLocations.length,
        managedRolesCount: permCtx.managedRoles.length,
      },
      metrics: { totalEmployeeCount: uniquePins.length, totalHours: shiftData.totalHours, totalActiveEmployees: shiftData.activeEmployees },
      locationBreakdown,
      roleBreakdown,
    };

    dashboardCache.set(cacheKey, response);
    return { status: 200, data: response };
  }
}

export const dashboardService = new DashboardService();

