import { endOfWeek, format, isValid, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { apiErrors } from '@/lib/api/api-error';
import { getEmployeeFromCookie } from '@/lib/auth/auth-helpers';
import { EmployeeRoleAssignmentsDbQueries } from "@/lib/db/queries/employee-role-assignments";
import { EmployeeSelfTimesheetDbQueries } from '@/lib/db/queries/employee-self-timesheet';
import { formatDate as formatDateDisplay } from '@/lib/utils/format/date-format';
import { formatTimeString, minutesToHours } from '@/lib/utils/format/time';
import { connectDB } from '@/lib/db';

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

export class EmployeeSelfTimesheetService {
  async getTimesheets(query: any) {
    await connectDB();
    const auth = await getEmployeeFromCookie();
    if (!auth) throw apiErrors.unauthorized();

    const startParam = query?.startDate;
    const endParam = query?.endDate;
    const view = query?.view ?? 'week';

    let start: Date;
    let end: Date;
    if (startParam && endParam) {
      start = new Date(startParam);
      end = new Date(endParam);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) throw apiErrors.badRequest('Invalid startDate or endDate');
      if (start > end) throw apiErrors.badRequest('startDate must be before or equal to endDate');
    } else {
      const now = new Date();
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    }

    const dateStrings = dateRangeToDateObjects(start, end);
    if (dateStrings.length > 366) throw apiErrors.badRequest('Date range too large (max 366 days)');

    const employee = await EmployeeSelfTimesheetDbQueries.findEmployeeByIdLean(auth.sub);
    if (!employee) throw apiErrors.unauthorized('Employee not found');

    const emp = employee as any;

    const roleAssignments = await EmployeeRoleAssignmentsDbQueries.find({ employeeId: emp._id, isActive: true })
      .populate('roleId', 'name')
      .lean();
    const roleNames = (roleAssignments as any[]).map((assignment) => assignment.roleId?.name).filter(Boolean);

    const employeeData = {
      id: String(emp._id),
      name: emp.name ?? '',
      employer: Array.isArray(emp.employer) ? emp.employer.join(', ') : '',
      role: roleNames.join(', '),
      location: Array.isArray(emp.location) ? emp.location.join(', ') : '',
      comment: emp.comment ?? '',
    };

    const startUTC = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0));
    const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999));
    const shifts = await EmployeeSelfTimesheetDbQueries.findShiftsByPinAndDateRangeLean({
      pin: emp.pin,
      start: startUTC,
      end: endUTC,
    });

    const rows: any[] = [];
    for (const shift of shifts as any[]) {
      const shiftDate = shift.date;
      if (!shiftDate) continue;

      const date = formatDateDisplay(new Date(shiftDate.getUTCFullYear(), shiftDate.getUTCMonth(), shiftDate.getUTCDate()));

      const clockIn = formatTimeString(shift.clockIn?.time);
      const breakIn = formatTimeString(shift.breakIn?.time);
      const breakOut = formatTimeString(shift.breakOut?.time);
      const clockOut = formatTimeString(shift.clockOut?.time);

      const breakMinutes = shift.totalBreakMinutes ?? 0;
      const totalMin = shift.totalWorkingHours ? Math.round(shift.totalWorkingHours * 60) : 0;

      rows.push({
        date,
        employeeId: employeeData.id,
        name: employeeData.name,
        pin: emp.pin,
        comment: employeeData.comment,
        employer: employeeData.employer,
        role: employeeData.role,
        location: employeeData.location,
        clockIn,
        breakIn,
        breakOut,
        clockOut,
        clockInImage: shift.clockIn?.image || '',
        clockOutImage: shift.clockOut?.image || '',
        breakMinutes,
        breakHours: minutesToHours(breakMinutes),
        totalMinutes: totalMin,
        totalHours: minutesToHours(totalMin),
      });
    }

    const parseDateForSort = (s: string) => {
      try {
        const d1 = parse(
          s,
          process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || 'dd-MM-yyyy',
          new Date()
        );
        if (isValid(d1)) return d1.getTime();
        const d2 = parse(s, 'yyyy-MM-dd', new Date());
        return isValid(d2) ? d2.getTime() : 0;
      } catch {
        return 0;
      }
    };
    rows.sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date));

    const totalWorkingMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0);
    const totalBreakMinutes = rows.reduce((s, r) => s + r.breakMinutes, 0);

    const rowDisplayDateToYmd = (dateStr: string): string => {
      try {
        const dateFormatEnv = process.env.NEXT_PUBLIC_DATE_FORMAT || process.env.DATE_FORMAT || 'dd-MM-yyyy';
        const d1 = parse(dateStr, dateFormatEnv, new Date());
        if (isValid(d1)) return format(d1, 'yyyy-MM-dd');
        const d2 = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isValid(d2)) return format(d2, 'yyyy-MM-dd');
      } catch {
        /* ignore */
      }
      return dateStr;
    };

    if (view === 'week') {
      const dailyMinutes: Record<string, number> = {};
      let breakMinutes = 0;
      for (const r of rows) {
        const ymd = rowDisplayDateToYmd(r.date);
        dailyMinutes[ymd] = (dailyMinutes[ymd] ?? 0) + r.totalMinutes;
        breakMinutes += r.breakMinutes;
      }
      const weekRow = {
        employeeId: employeeData.id,
        name: employeeData.name,
        pin: emp.pin,
        comment: employeeData.comment,
        employer: employeeData.employer,
        role: employeeData.role,
        location: employeeData.location,
        dailyMinutes,
        totalMinutes: totalWorkingMinutes,
        breakMinutes,
      };
      return {
        timesheets: [weekRow],
        total: 1,
        totalWorkingMinutes,
        totalBreakMinutes,
        totalWorkingHours: minutesToHours(totalWorkingMinutes),
        totalBreakHours: minutesToHours(totalBreakMinutes),
      };
    }

    if (view === 'month') {
      const datesWithWork = new Set<string>();
      for (const r of rows) {
        if (r.totalMinutes > 0) datesWithWork.add(rowDisplayDateToYmd(r.date));
      }
      const monthRow = {
        employeeId: employeeData.id,
        name: employeeData.name,
        pin: emp.pin,
        employer: employeeData.employer,
        role: employeeData.role,
        location: employeeData.location,
        daysWorked: datesWithWork.size,
        totalMinutes: totalWorkingMinutes,
        breakMinutes: totalBreakMinutes,
        totalHours: minutesToHours(totalWorkingMinutes),
        totalBreak: minutesToHours(totalBreakMinutes),
        employersList: employeeData.employer,
        locationsList: employeeData.location,
      };
      return {
        timesheets: [monthRow],
        total: 1,
        totalWorkingMinutes,
        totalBreakMinutes,
        totalWorkingHours: minutesToHours(totalWorkingMinutes),
        totalBreakHours: minutesToHours(totalBreakMinutes),
      };
    }

    return {
      timesheets: rows,
      total: rows.length,
      totalWorkingMinutes,
      totalBreakMinutes,
      totalWorkingHours: minutesToHours(totalWorkingMinutes),
      totalBreakHours: minutesToHours(totalBreakMinutes),
    };
  }

  async getTodayTimesheet() {
    await connectDB();
    const auth = await getEmployeeFromCookie();
    if (!auth) throw apiErrors.unauthorized();

    const employee = await EmployeeSelfTimesheetDbQueries.findEmployeeByIdLean(auth.sub);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const todayFormatted = format(now, 'dd-MM-yyyy', { locale: enUS });

    const shift = await EmployeeSelfTimesheetDbQueries.findShiftByPinAndDateLean({
      pin: (employee as any).pin,
      date: todayStart,
    });

    const punches = {
      clockIn: shift?.clockIn?.time ? format(new Date(shift.clockIn.time), 'h:mm:ss a', { locale: enUS }) : '',
      breakIn: shift?.breakIn?.time ? format(new Date(shift.breakIn.time), 'h:mm:ss a', { locale: enUS }) : '',
      breakOut: shift?.breakOut?.time ? format(new Date(shift.breakOut.time), 'h:mm:ss a', { locale: enUS }) : '',
      clockOut: shift?.clockOut?.time ? format(new Date(shift.clockOut.time), 'h:mm:ss a', { locale: enUS }) : '',
    };

    return { date: todayFormatted, punches };
  }
}

export const employeeSelfTimesheetService = new EmployeeSelfTimesheetService();

