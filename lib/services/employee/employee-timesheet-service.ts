import { parse, isValid } from 'date-fns';
import { apiErrors } from '@/lib/api/api-error';
import { employeeLocationFilter, getAuthWithUserLocations } from '@/lib/auth/auth-api';
import { getEmployeeFromCookie } from '@/lib/auth/auth-helpers';
import { EmployeeTimesheetDbQueries } from '@/lib/db/queries/employee-timesheet';
import { minutesToHours, formatTimeString, parseTimeToDate, parseTimeToMinutes } from '@/lib/utils/format/time';
import type { DailyTimesheetRow } from '@/lib/types/timesheet';
import { connectDB } from '@/lib/db';
import { queryCache } from '@/lib/cache/query-cache';

export class EmployeeTimesheetService {
  private parseAnyDate(input: string): Date | null {
    const raw = input?.trim?.() ?? '';
    if (!raw) return null;
    try {
      const d1 = parse(raw, 'yyyy-MM-dd', new Date());
      if (isValid(d1)) return d1;
      const d2 = parse(raw, 'dd-MM-yyyy', new Date());
      if (isValid(d2)) return d2;
      return null;
    } catch {
      return null;
    }
  }

  private toUtcStartOfDay(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  }

  private toUtcEndOfDay(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
  }

  async getEmployeeTimesheet(args: { employeeId: string; query: any }) {
    await connectDB();
    const { employeeId, query } = args;

    const ctx = await getAuthWithUserLocations();
    const employeeAuth = ctx ? null : await getEmployeeFromCookie();
    const isSelfEmployee = employeeAuth?.sub === employeeId;
    if (!ctx && !isSelfEmployee) throw apiErrors.unauthorized();

    const search = query?.search?.trim?.() ?? '';
    const limitParam = query?.limit;
    const offsetParam = query?.offset;
    const sortByParam = query?.sortBy?.trim?.().toLowerCase?.() ?? 'date';
    const orderParam = query?.order?.trim?.().toLowerCase?.() ?? 'desc';
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : 50;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;
    const sortBy =
      sortByParam === 'totalminutes' || sortByParam === 'total_minutes'
        ? 'totalminutes'
        : sortByParam === 'breakminutes' || sortByParam === 'break_minutes'
          ? 'breakminutes'
          : 'date';
    const order = orderParam === 'asc' ? 'asc' : 'desc';

    const empFilter: Record<string, unknown> = { _id: employeeId };
    if (ctx) {
      const locFilter = employeeLocationFilter(ctx.userLocations);
      if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    }
    const employee = await EmployeeTimesheetDbQueries.findEmployeeLean(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const pin = (employee as any).pin;
    const tenantId = (employee as any).employerIds?.[0] ?? ctx?.tenantId;

    if (!tenantId) throw apiErrors.badRequest('Tenant ID is required');

    // Parse date range from query params
    const qStart = query?.startDate?.trim?.() ?? '';
    const qEnd = query?.endDate?.trim?.() ?? '';

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    const parsedStart = this.parseAnyDate(qStart);
    const parsedEnd = this.parseAnyDate(qEnd);
    if (parsedStart) startDate = this.toUtcStartOfDay(parsedStart);
    if (parsedEnd) endDate = this.toUtcEndOfDay(parsedEnd);

    // If search looks like a single date, treat it as a date filter (DB-level).
    const parsedSearchDate = this.parseAnyDate(search);
    if (parsedSearchDate) {
      startDate = this.toUtcStartOfDay(parsedSearchDate);
      endDate = this.toUtcEndOfDay(parsedSearchDate);
    }

    // Parse sortBy param and map to database field names
    let dbSortBy: 'date' | 'totalWorkingHours' | 'totalBreakMinutes' = 'date';
    if (sortBy === 'totalminutes' || sortBy === 'total_minutes') {
      dbSortBy = 'totalWorkingHours';
    } else if (sortBy === 'breakminutes' || sortBy === 'break_minutes') {
      dbSortBy = 'totalBreakMinutes';
    }

    // Fetch shifts with date range filtering and pagination from database
    const cacheKey = `employeeTimesheet:${tenantId}:${employeeId}:${pin}:${startDate?.toISOString() ?? ''}:${endDate?.toISOString() ?? ''}:${limit}:${offset}:${dbSortBy}:${order}`;
    const { shifts, total } = await queryCache.getOrSet(cacheKey, 5 * 60 * 1000, async () => {
      const [total, shifts] = await Promise.all([
        EmployeeTimesheetDbQueries.countShiftsByPin({ tenantId, pin, startDate, endDate }),
        EmployeeTimesheetDbQueries.findShiftsByPinLean({ tenantId, pin, startDate, endDate, limit, offset, sortBy: dbSortBy, order }),
      ]);
      return { total, shifts };
    });

    let rows: DailyTimesheetRow[] = (shifts as any[]).map((shift) => {
      const clockIn = formatTimeString(shift.clockIn?.time);
      const breakIn = formatTimeString(shift.breakIn?.time);
      const breakOut = formatTimeString(shift.breakOut?.time);
      const clockOut = formatTimeString(shift.clockOut?.time);

      const breakMinutes = shift.totalBreakMinutes || 0;
      const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : null;

      return {
        date: shift.date instanceof Date ? shift.date.toISOString().split('T')[0] : shift.date,
        clockIn,
        breakIn,
        breakOut,
        clockOut,
        breakMinutes,
        breakHours: minutesToHours(breakMinutes),
        totalMinutes: totalMin ?? 0,
        totalHours: minutesToHours(totalMin),
        clockInImage: shift.clockIn?.image,
        clockInWhere: shift.clockIn?.lat && shift.clockIn?.lng ? `${shift.clockIn.lat},${shift.clockIn.lng}` : undefined,
        breakInImage: shift.breakIn?.image,
        breakInWhere: shift.breakIn?.lat && shift.breakIn?.lng ? `${shift.breakIn.lat},${shift.breakIn.lng}` : undefined,
        breakOutImage: shift.breakOut?.image,
        breakOutWhere:
          shift.breakOut?.lat && shift.breakOut?.lng ? `${shift.breakOut.lat},${shift.breakOut.lng}` : undefined,
        clockOutImage: shift.clockOut?.image,
        clockOutWhere:
          shift.clockOut?.lat && shift.clockOut?.lng ? `${shift.clockOut.lat},${shift.clockOut.lng}` : undefined,
        clockInSource: shift.source === 'manual' ? 'insert' : undefined,
        breakInSource: shift.source === 'manual' ? 'insert' : undefined,
        breakOutSource: shift.source === 'manual' ? 'insert' : undefined,
        clockOutSource: shift.source === 'manual' ? 'insert' : undefined,
      };
    });

    return {
      data: rows,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async updateTimesheetEntry(args: { employeeId: string; body: any; ctx: any }) {
    await connectDB();
    const { employeeId, body, ctx } = args;
    if (!ctx) throw apiErrors.unauthorized();
    if (!body?.date) throw apiErrors.badRequest('Date is required');

    const empFilter: Record<string, unknown> = { _id: employeeId };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    const employee = await EmployeeTimesheetDbQueries.findEmployeeLean(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const pin = (employee as any).pin;
    const tenantId = (employee as any).employerIds?.[0] ?? ctx?.tenantId;

    if (!tenantId) throw apiErrors.badRequest('Tenant ID is required');

    const shift = await EmployeeTimesheetDbQueries.findShiftByPinAndDate({
      tenantId,
      pin,
      date: body.date,
    });
    if (!shift) throw apiErrors.notFound('Timesheet entry not found');

    const { clockIn, breakIn, breakOut, clockOut } = body;

    if (clockIn !== undefined) {
      if (clockIn === '' || !clockIn) (shift as any).clockIn = undefined;
      else (shift as any).clockIn = { ...(shift as any).clockIn, time: parseTimeToDate(clockIn), flag: false };
    }
    if (breakIn !== undefined) {
      if (breakIn === '' || !breakIn) (shift as any).breakIn = undefined;
      else (shift as any).breakIn = { ...(shift as any).breakIn, time: parseTimeToDate(breakIn), flag: false };
    }
    if (breakOut !== undefined) {
      if (breakOut === '' || !breakOut) (shift as any).breakOut = undefined;
      else (shift as any).breakOut = { ...(shift as any).breakOut, time: parseTimeToDate(breakOut), flag: false };
    }
    if (clockOut !== undefined) {
      if (clockOut === '' || !clockOut) (shift as any).clockOut = undefined;
      else (shift as any).clockOut = { ...(shift as any).clockOut, time: parseTimeToDate(clockOut), flag: false };
    }

    const clockInMin = parseTimeToMinutes((shift as any).clockIn?.time);
    const breakInMin = parseTimeToMinutes((shift as any).breakIn?.time);
    const breakOutMin = parseTimeToMinutes((shift as any).breakOut?.time);
    const clockOutMin = parseTimeToMinutes((shift as any).clockOut?.time);

    let breakMinutes = 0;
    if (breakInMin > 0 && breakOutMin > 0 && breakOutMin > breakInMin) breakMinutes = breakOutMin - breakInMin;
    (shift as any).totalBreakMinutes = breakMinutes;

    let totalMinutes = 0;
    if (clockInMin > 0 && clockOutMin > 0) {
      totalMinutes = clockOutMin < clockInMin ? 1440 - clockInMin + clockOutMin - breakMinutes : clockOutMin - clockInMin - breakMinutes;
    }
    (shift as any).totalWorkingHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
    (shift as any).source = 'manual';

    await (shift as any).save();
    queryCache.delByPrefix(`employeeTimesheet:${tenantId}:${employeeId}:`);
    return { success: true, message: 'Timesheet updated successfully' };
  }
}

export const employeeTimesheetService = new EmployeeTimesheetService();

