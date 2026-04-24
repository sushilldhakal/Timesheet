import { endOfWeek, startOfWeek } from 'date-fns';
import mongoose from 'mongoose';
import { apiErrors } from '@/lib/api/api-error';
import { employeeLocationFilter } from '@/lib/auth/auth-api';
import { TimesheetDbQueries, type TimesheetEmployeeMeta } from '@/lib/db/queries/timesheets';
import { minutesToHours, formatTimeString } from '@/lib/utils/format/time';
import { AwardEngine } from '@/lib/engines/award-engine';
import {
  timesheetEntryToShiftContext,
  payLinesToTandaFormat,
  validateTimesheetEntry,
  type EmployeeContext,
} from '@/lib/utils/timesheet-to-shift-context';
import { checkPublicHoliday } from '@/lib/utils/public-holidays';
import { formatTimeFromDate } from '@/lib/utils/format/time';
import type { DailyTimesheetRow } from '@/lib/types/timesheet';
import { connectDB } from '@/lib/db';
import { Roster } from '@/lib/db/schemas/roster';

function dateRangeToDateObjects(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cur <= endDate) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export type TimesheetDashboardQuery = {
  startDate?: string;
  endDate?: string;
  employeeId?: string[];
  employer?: string[];
  location?: string[];
  role?: string[];
  view?: 'day' | 'week' | 'month';
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  /** When '1', enriches day-view rows with dailyShiftId, status, locationId, roleId, rosterShiftId, varianceMinutes, flags */
  includeSchedule?: string;
};

export type AuthCtx = {
  tenantId: string;
  userLocations?: string[];
};

export class TimesheetService {
  async getDashboard(ctx: AuthCtx, query: TimesheetDashboardQuery | undefined) {
    await connectDB();
    const {
      startDate: startParam,
      endDate: endParam,
      employeeId: employeeIds = [],
      employer: employers = [],
      location: locations = [],
      role: roles = [],
      view = 'day',
      limit = 50,
      offset = 0,
      sortBy = 'date',
      order = 'asc',
      includeSchedule,
    } = query || {};

    const withSchedule = includeSchedule === '1';

    let start: Date;
    let end: Date;
    if (startParam && endParam) {
      start = new Date(startParam);
      end = new Date(endParam);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw apiErrors.badRequest('Invalid startDate or endDate');
      }
      if (start > end) {
        throw apiErrors.badRequest('startDate must be before or equal to endDate');
      }
    } else {
      const now = new Date();
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    }

    const dates = dateRangeToDateObjects(start, end);
    if (dates.length > 366) {
      throw apiErrors.badRequest('Date range too large (max 366 days)');
    }

    const { pins, employeeMap } = await this.buildEmployeePinSet({
      ctx,
      employeeIds,
      employers,
      locations,
      roles,
    });

    const startUTC = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0));
    const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999));

    const shifts = await TimesheetDbQueries.findDailyShiftsForPins({
      tenantId: ctx.tenantId,
      pins,
      startUTC,
      endUTC,
    });

    // Batch-fetch roster shift data when schedule enrichment is requested
    let rosterShiftMap = new Map<string, { startTimeUtc: string; endTimeUtc: string; locationId: string; roleId: string }>();
    if (withSchedule) {
      const rosterShiftIds = (shifts as any[])
        .map((s) => s.rosterShiftId)
        .filter(Boolean)
        .map((id: any) => new mongoose.Types.ObjectId(String(id)));

      if (rosterShiftIds.length > 0) {
        const tenantObjectId = new mongoose.Types.ObjectId(ctx.tenantId);
        const rosterDocs = await Roster.aggregate([
          { $match: { tenantId: tenantObjectId, 'shifts._id': { $in: rosterShiftIds } } },
          { $project: { shifts: 1 } },
        ]);
        for (const doc of rosterDocs) {
          for (const rs of doc.shifts ?? []) {
            const rsId = String(rs._id);
            if (rosterShiftIds.some((id) => String(id) === rsId)) {
              rosterShiftMap.set(rsId, {
                startTimeUtc: rs.startTime instanceof Date ? rs.startTime.toISOString() : String(rs.startTime),
                endTimeUtc: rs.endTime instanceof Date ? rs.endTime.toISOString() : String(rs.endTime),
                locationId: rs.locationId ? String(rs.locationId) : '',
                roleId: rs.roleId ? String(rs.roleId) : '',
              });
            }
          }
        }
      }
    }

    const rows: any[] = [];
    for (const shift of shifts as any[]) {
      const pin = String(shift.pin ?? '');
      const shiftDate = shift.date;
      if (!pin || !shiftDate) continue;

      const meta = employeeMap.get(pin);

      const date = `${shiftDate.getUTCFullYear()}-${String(shiftDate.getUTCMonth() + 1).padStart(2, '0')}-${String(shiftDate.getUTCDate()).padStart(2, '0')}`;

      const breakMinutes = shift.totalBreakMinutes ?? 0;
      const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : 0;

      rows.push({
        date,
        employeeId: meta?.id ?? '',
        name: meta?.name ?? '',
        pin,
        comment: meta?.comment ?? '',
        employer: meta?.employer ?? '',
        role: meta?.role ?? '',
        location: meta?.location ?? '',
        clockIn: formatTimeString(shift.clockIn?.time),
        breakIn: formatTimeString(shift.breakIn?.time),
        breakOut: formatTimeString(shift.breakOut?.time),
        clockOut: formatTimeString(shift.clockOut?.time),
        breakMinutes,
        breakHours: minutesToHours(breakMinutes),
        totalMinutes: totalMin,
        totalHours: minutesToHours(totalMin),
        clockInDeviceId: shift.clockIn?.deviceId,
        clockInDeviceLocation: shift.clockIn?.deviceLocation,
        breakInDeviceId: shift.breakIn?.deviceId,
        breakInDeviceLocation: shift.breakIn?.deviceLocation,
        breakOutDeviceId: shift.breakOut?.deviceId,
        breakOutDeviceLocation: shift.breakOut?.deviceLocation,
        clockOutDeviceId: shift.clockOut?.deviceId,
        clockOutDeviceLocation: shift.clockOut?.deviceLocation,
        // Schedule enrichment (only when includeSchedule=1)
        ...(withSchedule ? (() => {
          const rosterShiftId = shift.rosterShiftId ? String(shift.rosterShiftId) : null;
          const rosterData = rosterShiftId ? (rosterShiftMap.get(rosterShiftId) ?? null) : null;
          return {
            dailyShiftId: String(shift._id),
            status: shift.status ?? null,
            locationId: shift.locationId ? String(shift.locationId) : null,
            roleId: shift.roleId ? String(shift.roleId) : null,
            rosterShiftId,
            roster: rosterData,
            varianceMinutes: this.computeVariance(shift, rosterData),
            flags: this.computeFlags(shift),
            notes: shift.notes ?? null,
          };
        })() : {}),
      });
    }

    const mul = order === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = String(a.date).localeCompare(String(b.date));
      } else if (sortBy === 'name') {
        cmp = String(a.name).localeCompare(String(b.name));
      } else if (sortBy === 'totalHours') {
        cmp = (a.totalMinutes ?? 0) - (b.totalMinutes ?? 0);
      } else if (sortBy === 'breakHours') {
        cmp = (a.breakMinutes ?? 0) - (b.breakMinutes ?? 0);
      } else {
        const aVal = String(a?.[sortBy] ?? '');
        const bVal = String(b?.[sortBy] ?? '');
        cmp = aVal.localeCompare(bVal);
      }
      return cmp * mul;
    });

    const totalWorkingMinutes = rows.reduce((s, r) => s + (r.totalMinutes ?? 0), 0);
    const totalBreakMinutes = rows.reduce((s, r) => s + (r.breakMinutes ?? 0), 0);

    if (view === 'week') {
      const byEmp = new Map<
        string,
        {
          employeeId: string;
          name: string;
          pin: string;
          comment: string;
          employer: string;
          role: string;
          location: string;
          dailyMinutes: Record<string, number>;
          breakMinutes: number;
        }
      >();

      for (const r of rows) {
        const id = r.employeeId;
        if (!id) continue;
        if (!byEmp.has(id)) {
          byEmp.set(id, {
            employeeId: id,
            name: r.name,
            pin: r.pin,
            comment: r.comment ?? '',
            employer: r.employer,
            role: r.role,
            location: r.location,
            dailyMinutes: {},
            breakMinutes: 0,
          });
        }
        const agg = byEmp.get(id)!;
        agg.dailyMinutes[r.date] = (agg.dailyMinutes[r.date] ?? 0) + (r.totalMinutes ?? 0);
        agg.breakMinutes += r.breakMinutes ?? 0;
      }

      const weekRows = Array.from(byEmp.values())
        .map((e) => {
          const totalMinutes = Object.values(e.dailyMinutes).reduce((a, b) => a + b, 0);
          return { ...e, totalMinutes };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const n = weekRows.length;
      return {
        timesheets: weekRows,
        total: n,
        limit: n,
        offset: 0,
        totalWorkingMinutes,
        totalBreakMinutes,
        totalWorkingHours: minutesToHours(totalWorkingMinutes),
        totalBreakHours: minutesToHours(totalBreakMinutes),
      };
    }

    if (view === 'month') {
      const byEmp = new Map<
        string,
        {
          employeeId: string;
          name: string;
          pin: string;
          employer: string;
          role: string;
          location: string;
          datesWithWork: Set<string>;
          totalMinutes: number;
          breakMinutes: number;
          employers: Set<string>;
          locations: Set<string>;
        }
      >();

      for (const r of rows) {
        const id = r.employeeId;
        if (!id) continue;
        if (!byEmp.has(id)) {
          byEmp.set(id, {
            employeeId: id,
            name: r.name,
            pin: r.pin,
            employer: r.employer,
            role: r.role,
            location: r.location,
            datesWithWork: new Set(),
            totalMinutes: 0,
            breakMinutes: 0,
            employers: new Set(),
            locations: new Set(),
          });
        }
        const agg = byEmp.get(id)!;
        agg.totalMinutes += r.totalMinutes ?? 0;
        agg.breakMinutes += r.breakMinutes ?? 0;
        if ((r.totalMinutes ?? 0) > 0) agg.datesWithWork.add(r.date);
        if (r.employer) agg.employers.add(r.employer);
        if (r.location) agg.locations.add(r.location);
      }

      const monthRows = Array.from(byEmp.values())
        .map((e) => ({
          employeeId: e.employeeId,
          name: e.name,
          pin: e.pin,
          employer: e.employer,
          role: e.role,
          location: e.location,
          daysWorked: e.datesWithWork.size,
          totalMinutes: e.totalMinutes,
          breakMinutes: e.breakMinutes,
          totalHours: minutesToHours(e.totalMinutes),
          totalBreak: minutesToHours(e.breakMinutes),
          employersList: [...e.employers].join(', '),
          locationsList: [...e.locations].join(', '),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const n = monthRows.length;
      return {
        timesheets: monthRows,
        total: n,
        limit: n,
        offset: 0,
        totalWorkingMinutes,
        totalBreakMinutes,
        totalWorkingHours: minutesToHours(totalWorkingMinutes),
        totalBreakHours: minutesToHours(totalBreakMinutes),
      };
    }

    const total = rows.length;
    const dayLimit = Math.min(limit, 2000);
    const paginated = rows.slice(offset, offset + dayLimit);
    return {
      timesheets: paginated,
      total,
      limit: dayLimit,
      offset,
      totalWorkingMinutes,
      totalBreakMinutes,
      totalWorkingHours: minutesToHours(totalWorkingMinutes),
      totalBreakHours: minutesToHours(totalBreakMinutes),
    };
  }

  async createTimesheet(input: {
    tenantId: string;
    employeeId: string;
    payPeriodStart: Date;
    payPeriodEnd: Date;
  }) {
    await connectDB();
    const { tenantId, employeeId, payPeriodStart, payPeriodEnd } = input;

    if (!mongoose.Types.ObjectId.isValid(tenantId) || !mongoose.Types.ObjectId.isValid(employeeId)) {
      throw apiErrors.badRequest('Valid tenantId and employeeId are required');
    }
    if (payPeriodStart >= payPeriodEnd) {
      throw apiErrors.badRequest('payPeriodStart must be before payPeriodEnd');
    }

    const existing = await TimesheetDbQueries.findTimesheetDuplicate({
      tenantId,
      employeeId,
      payPeriodStart,
      payPeriodEnd,
    });
    if (existing) {
      throw apiErrors.conflict('Timesheet already exists for this employee and pay period', {
        existingId: String(existing._id),
      });
    }

    const startUTC = new Date(
      Date.UTC(payPeriodStart.getFullYear(), payPeriodStart.getMonth(), payPeriodStart.getDate(), 0, 0, 0, 0)
    );
    const endUTC = new Date(
      Date.UTC(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth(), payPeriodEnd.getDate(), 23, 59, 59, 999)
    );

    const shifts = await TimesheetDbQueries.findShiftsForEmployeePayPeriod({
      tenantId,
      employeeId,
      startUTC,
      endUTC,
    });

    const shiftIds = (shifts as any[]).map((s) => s._id);
    const totalShifts = shifts.length;
    const totalHours = (shifts as any[]).reduce((sum, s) => sum + (s.totalWorkingHours ?? 0), 0);
    const totalCost = (shifts as any[]).reduce((sum, s) => sum + (s.computed?.totalCost ?? 0), 0);
    const totalBreakMinutes = (shifts as any[]).reduce((sum, s) => sum + (s.totalBreakMinutes ?? 0), 0);

    const timesheet = await TimesheetDbQueries.createTimesheet({
      tenantId,
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      shiftIds,
      totalShifts,
      totalHours: Math.round(totalHours * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalBreakMinutes,
      status: 'draft',
    });

    return { success: true, timesheet };
  }

  async bulkGenerate(
    ctx: AuthCtx,
    input: {
      payPeriodStart: string;
      payPeriodEnd: string;
      employeeIds?: string[];
    }
  ): Promise<{
    created: number;
    skipped: number;
    failed: number;
    results: Array<{ employeeId: string; status: 'created' | 'skipped' | 'failed'; error?: string }>;
  }> {
    await connectDB();

    const { payPeriodStart, payPeriodEnd, employeeIds } = input;

    const startDate = new Date(payPeriodStart);
    const endDate = new Date(payPeriodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw apiErrors.badRequest('Invalid payPeriodStart or payPeriodEnd');
    }
    if (startDate >= endDate) {
      throw apiErrors.badRequest('payPeriodStart must be before payPeriodEnd');
    }

    let targetEmployeeIds: string[];

    if (employeeIds && employeeIds.length > 0) {
      targetEmployeeIds = employeeIds;
    } else {
      const activeEmployees = await TimesheetDbQueries.findEmployeesForDashboard({
        tenantId: ctx.tenantId,
        status: 'active',
      });
      targetEmployeeIds = (activeEmployees as any[]).map((e) => String(e._id));
    }

    const results: Array<{ employeeId: string; status: 'created' | 'skipped' | 'failed'; error?: string }> = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const employeeId of targetEmployeeIds) {
      try {
        const existing = await TimesheetDbQueries.findTimesheetDuplicate({
          tenantId: ctx.tenantId,
          employeeId,
          payPeriodStart: startDate,
          payPeriodEnd: endDate,
        });

        if (existing) {
          skipped++;
          results.push({ employeeId, status: 'skipped' });
          continue;
        }

        await this.createTimesheet({
          tenantId: ctx.tenantId,
          employeeId,
          payPeriodStart: startDate,
          payPeriodEnd: endDate,
        });

        created++;
        results.push({ employeeId, status: 'created' });
      } catch (error) {
        failed++;
        results.push({
          employeeId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created, skipped, failed, results };
  }

  async getTimesheetById(id: string) {
    await connectDB();
    if (!id) throw apiErrors.badRequest('id is required');
    const timesheet = await TimesheetDbQueries.findTimesheetByIdPopulated(id);
    if (!timesheet) throw apiErrors.notFound('Timesheet not found');
    const shifts = await TimesheetDbQueries.findDailyShiftsByIds((timesheet as any).shiftIds ?? []);
    return { timesheet: { ...timesheet, shifts } };
  }

  async updateTimesheetNotes(id: string, input: { notes?: string; submissionNotes?: string }) {
    await connectDB();
    const timesheet = await TimesheetDbQueries.findTimesheetById(id);
    if (!timesheet) throw apiErrors.notFound('Timesheet not found');
    if ((timesheet as any).status !== 'draft') {
      throw apiErrors.badRequest(
        `Cannot update timesheet in '${(timesheet as any).status}' status. Only draft timesheets can be edited.`
      );
    }
    if (input.notes !== undefined) (timesheet as any).notes = input.notes;
    if (input.submissionNotes !== undefined) (timesheet as any).submissionNotes = input.submissionNotes;
    await (timesheet as any).save();
    return { success: true, timesheet };
  }

  async evaluateDailyShift(id: string) {
    await connectDB();
    if (!id) throw apiErrors.badRequest('Timesheet ID is required');

    const dailyShift = await TimesheetDbQueries.findDailyShiftByIdPopulatedEmployee(id);
    if (!dailyShift) throw apiErrors.notFound('Timesheet entry not found');

    const employeeId = (dailyShift as any).employeeId?._id?.toString?.() ?? (dailyShift as any).employeeId?.toString?.();
    if (!employeeId) throw apiErrors.notFound('Employee not found for this timesheet entry');

    const employee = await TimesheetDbQueries.findEmployeeById(employeeId);
    if (!employee) throw apiErrors.notFound('Employee not found for this timesheet entry');

    if (!(employee as any).awardId) throw apiErrors.badRequest('Employee has no award assigned');
    const award = await TimesheetDbQueries.findAwardById(String((employee as any).awardId));
    if (!award) throw apiErrors.notFound('Award not found for this employee');

    const timesheetRow: DailyTimesheetRow = this.convertDailyShiftToTimesheetRow(dailyShift);
    validateTimesheetEntry(timesheetRow);

    const employeeContext: EmployeeContext = {
      id: (employee as any)._id.toString(),
      employmentType: (employee as any).employmentType || 'casual',
      baseRate: await this.getEmployeeBaseRate(employee),
      awardTags: (dailyShift as any).awardTags || [],
    };

    const weeklyHoursWorked = await this.calculateWeeklyHours((employee as any)._id.toString(), (dailyShift as any).date);
    const isPublicHoliday = await checkPublicHoliday((dailyShift as any).date);

    const shiftContext = timesheetEntryToShiftContext(timesheetRow, employeeContext, weeklyHoursWorked, isPublicHoliday);
    const engine = new AwardEngine(award as any);
    const awardEngineResult = engine.processShift(shiftContext);
    const tandaComparison = payLinesToTandaFormat(awardEngineResult.payLines);

    return {
      timesheetId: id,
      employee: {
        id: (employee as any)._id.toString(),
        name: (employee as any).name,
        employmentType: (employee as any).employmentType || 'casual',
        baseRate: employeeContext.baseRate,
        awardTags: employeeContext.awardTags,
      },
      award: {
        id: (award as any)._id.toString(),
        name: (award as any).name,
        version: (award as any).version,
      },
      shiftContext: {
        employeeId: shiftContext.employeeId,
        employmentType: shiftContext.employmentType,
        baseRate: shiftContext.baseRate,
        startTime: shiftContext.startTime.toISOString(),
        endTime: shiftContext.endTime.toISOString(),
        awardTags: shiftContext.awardTags,
        isPublicHoliday: shiftContext.isPublicHoliday,
        weeklyHoursWorked: shiftContext.weeklyHoursWorked,
        dailyHoursWorked: shiftContext.dailyHoursWorked,
        breaks: shiftContext.breaks.map((b) => ({
          startTime: b.startTime.toISOString(),
          endTime: b.endTime.toISOString(),
          isPaid: b.isPaid,
        })),
      },
      awardEngineResult: {
        payLines: awardEngineResult.payLines.map((line: any) => ({
          units: line.units,
          from: line.from.toISOString(),
          to: line.to.toISOString(),
          name: line.name,
          exportName: line.exportName,
          ordinaryHours: line.ordinaryHours,
          cost: line.cost,
          baseRate: line.baseRate,
          multiplier: line.multiplier,
          ruleId: line.ruleId,
        })),
        totalCost: awardEngineResult.totalCost,
        totalHours: awardEngineResult.totalHours,
        breakEntitlements: awardEngineResult.breakEntitlements,
        leaveAccruals: awardEngineResult.leaveAccruals,
      },
      tandaComparison,
    };
  }

  private async buildEmployeePinSet(opts: {
    ctx: AuthCtx;
    employeeIds: string[];
    employers: string[];
    locations: string[];
    roles: string[];
  }): Promise<{ pins: string[]; employeeMap: Map<string, TimesheetEmployeeMeta> }> {
    const { ctx, employeeIds, employers, locations, roles } = opts;

    let pins: string[] = [];
    const employeeMap = new Map<string, TimesheetEmployeeMeta>();

    const locFilter = employeeLocationFilter(ctx.userLocations ?? null);

    if (employeeIds.length > 0) {
      const emps = await TimesheetDbQueries.findEmployeesByIds(employeeIds);
      const roleAssignments = await TimesheetDbQueries.findActiveRoleAssignments(
        emps.map((e: any) => e._id)
      );
      const rolesByEmployee = this.groupRolesByEmployee(roleAssignments);

      for (const emp of emps as any[]) {
        if (Object.keys(locFilter).length > 0) {
          const empLocs = Array.isArray(emp.location) ? emp.location : [];
          const userLocs = ctx.userLocations ?? [];
          const inLocation = empLocs.some((loc: unknown) => userLocs.includes(String(loc).trim()));
          if (!inLocation) continue;
        }

        const roleNames = rolesByEmployee.get(String(emp._id)) || [];
        if (roles.length > 0) {
          const hasMatchingRole = roleNames.some((roleName) => roles.includes(roleName));
          if (!hasMatchingRole) continue;
        }

        pins.push(emp.pin);
        employeeMap.set(emp.pin, {
          id: String(emp._id),
          name: emp.name ?? '',
          employer: Array.isArray(emp.employer) ? emp.employer.join(', ') : '',
          role: roleNames.join(', '),
          location: Array.isArray(emp.location) ? emp.location.join(', ') : '',
          comment: emp.comment ?? '',
        });
      }

      return { pins, employeeMap };
    }

    const filter: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter);
    if (employers.length > 0) andConditions.push({ employer: { $in: employers } });
    if (locations.length > 0) andConditions.push({ location: { $in: locations } });
    if (andConditions.length > 0) filter.$and = andConditions;

    const employees = await TimesheetDbQueries.findEmployeesForDashboard(filter);

    pins = (employees as any[]).map((e) => e.pin);

    const roleAssignments = await TimesheetDbQueries.findActiveRoleAssignments(
      (employees as any[]).map((e) => e._id)
    );
    const rolesByEmployee = this.groupRolesByEmployee(roleAssignments);

    for (const emp of employees as any[]) {
      const empId = String(emp._id);
      const roleNames = rolesByEmployee.get(empId) || [];

      if (roles.length > 0) {
        const hasMatchingRole = roleNames.some((roleName) => roles.includes(roleName));
        if (!hasMatchingRole) continue;
      }

      employeeMap.set(emp.pin, {
        id: String(emp._id),
        name: emp.name ?? '',
        employer: Array.isArray(emp.employer) ? emp.employer.join(', ') : '',
        role: roleNames.join(', '),
        location: Array.isArray(emp.location) ? emp.location.join(', ') : '',
        comment: emp.comment ?? '',
      });
    }

    return { pins, employeeMap };
  }

  private groupRolesByEmployee(roleAssignments: any[]) {
    const rolesByEmployee = new Map<string, string[]>();
    for (const assignment of roleAssignments) {
      const empId = String((assignment as any).employeeId);
      // Role assignments are stored as EmployeeTeamAssignment with populated `teamId`.
      // This dashboard filter uses team names (shown as "Team" in the UI).
      const roleName = (assignment as any).teamId?.name;
      if (!roleName) continue;
      if (!rolesByEmployee.has(empId)) rolesByEmployee.set(empId, []);
      rolesByEmployee.get(empId)!.push(roleName);
    }
    return rolesByEmployee;
  }

  private convertDailyShiftToTimesheetRow(dailyShift: any): DailyTimesheetRow {
    const dateStr = dailyShift.date.toISOString().split('T')[0];

    const clockIn = dailyShift.clockIn?.time ? formatTimeFromDate(dailyShift.clockIn.time) : '';
    const clockOut = dailyShift.clockOut?.time ? formatTimeFromDate(dailyShift.clockOut.time) : '';
    const breakIn = dailyShift.breakIn?.time ? formatTimeFromDate(dailyShift.breakIn.time) : '';
    const breakOut = dailyShift.breakOut?.time ? formatTimeFromDate(dailyShift.breakOut.time) : '';

    const totalMinutes = dailyShift.totalWorkingHours ? dailyShift.totalWorkingHours * 60 : 0;
    const breakMinutes = dailyShift.totalBreakMinutes || 0;

    return {
      date: dateStr,
      clockIn,
      clockOut,
      breakIn,
      breakOut,
      breakMinutes,
      breakHours: (breakMinutes / 60).toFixed(2),
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(2),
      clockInImage: dailyShift.clockIn?.image,
      clockInWhere: dailyShift.clockIn?.deviceLocation,
      breakInImage: dailyShift.breakIn?.image,
      breakInWhere: dailyShift.breakIn?.deviceLocation,
      breakOutImage: dailyShift.breakOut?.image,
      breakOutWhere: dailyShift.breakOut?.deviceLocation,
      clockOutImage: dailyShift.clockOut?.image,
      clockOutWhere: dailyShift.clockOut?.deviceLocation,
    };
  }

  private async getEmployeeBaseRate(employee: any): Promise<number> {
    const currentPayCondition = employee.payConditions?.find(
      (pc: any) => pc.effectiveTo === null || pc.effectiveTo > new Date()
    );
    if (currentPayCondition?.overridingRate) return currentPayCondition.overridingRate;

    if (employee.awardId && employee.awardLevel) {
      try {
        const award = await TimesheetDbQueries.findAwardById(String(employee.awardId));
        if (award && (award as any).levelRates) {
          const now = new Date();
          const currentRate = (award as any).levelRates.find(
            (rate: any) =>
              rate.level === employee.awardLevel &&
              rate.employmentType === employee.employmentType &&
              rate.effectiveFrom <= now &&
              (rate.effectiveTo === null || rate.effectiveTo > now)
          );
          if (currentRate) return currentRate.hourlyRate;
        }
      } catch {
        /* ignore */
      }
    }

    const defaultRates = { casual: 25.0, part_time: 23.0, full_time: 22.0 } as const;
    return defaultRates[employee.employmentType as keyof typeof defaultRates] || 25.0;
  }

  private async calculateWeeklyHours(employeeId: string, shiftDate: Date): Promise<number> {
    const startOfWeek = new Date(shiftDate);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyShifts = await TimesheetDbQueries.findWeeklyShiftsBeforeDate({ employeeId, startOfWeek, shiftDate });
    return (weeklyShifts as any[]).reduce((total, shift) => total + (shift.totalWorkingHours || 0), 0);
  }

  private computeVariance(shift: any, rosterData?: { startTimeUtc: string; endTimeUtc: string } | null): { start: number | null; end: number | null; duration: number | null } {
    const clockIn = shift?.clockIn?.time ? new Date(shift.clockIn.time) : null;
    const clockOut = shift?.clockOut?.time ? new Date(shift.clockOut.time) : null;

    if (!rosterData) {
      const duration = clockIn && clockOut
        ? Math.round((clockOut.getTime() - clockIn.getTime()) / (60 * 1000))
        : null;
      return { start: null, end: null, duration };
    }

    const rosterStart = new Date(rosterData.startTimeUtc);
    const rosterEnd = new Date(rosterData.endTimeUtc);
    const rosterDuration = Math.round((rosterEnd.getTime() - rosterStart.getTime()) / (60 * 1000));

    const startVar = clockIn ? Math.round((clockIn.getTime() - rosterStart.getTime()) / (60 * 1000)) : null;
    const endVar = clockOut ? Math.round((clockOut.getTime() - rosterEnd.getTime()) / (60 * 1000)) : null;
    const actualDuration = clockIn && clockOut
      ? Math.round((clockOut.getTime() - clockIn.getTime()) / (60 * 1000))
      : null;
    const durationVar = actualDuration !== null ? actualDuration - rosterDuration : null;

    return { start: startVar, end: endVar, duration: durationVar };
  }

  private computeFlags(shift: any): { missingActual: boolean; extraActual: boolean; incompleteActual: boolean } {
    const hasClockIn = !!shift?.clockIn?.time;
    const hasClockOut = !!shift?.clockOut?.time;
    const hasRoster = !!shift?.rosterShiftId;
    return {
      missingActual: hasRoster && !hasClockIn,
      extraActual: !hasRoster && hasClockIn,
      incompleteActual: hasClockIn && !hasClockOut,
    };
  }
}

export const timesheetService = new TimesheetService();

