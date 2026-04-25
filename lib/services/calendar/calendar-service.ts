import { parseISO, isValid } from 'date-fns';
import type { IEvent } from '@/components/calendar/interfaces';
import { connectDB } from '@/lib/db';
import { apiErrors } from '@/lib/api/api-error';
import { getEmployeeWebTokenFromRequest, verifyEmployeeToken } from '@/lib/auth/employee-auth';
import { CalendarDbQueries } from '@/lib/db/queries/calendar';
import { calculateWeekId, getWeekBoundaries } from '@/lib/db/schemas/roster';
import { setTimeFromDecimalHours } from '@/lib/utils/format/decimal-hours';

export class CalendarService {
  async getEvents(args: {
    query: any;
    req: any;
    adminCtx: any | null;
  }) {
    const { query, req, adminCtx } = args;
    await connectDB();

    // Admin session OR staff web session can read events.
    let staffEmployeeId: string | null = null;
    let staffLocationNames: string[] = [];
    if (!adminCtx) {
      const staffToken = getEmployeeWebTokenFromRequest(req);
      const staffAuth = staffToken ? await verifyEmployeeToken(staffToken) : null;
      if (!staffAuth?.sub) throw apiErrors.unauthorized();
      staffEmployeeId = staffAuth.sub;

      try {
        const { Employee } = await import('@/lib/db');
        const emp = await Employee.findById(staffEmployeeId).select('location').lean();
        const locs = (emp as any)?.location;
        staffLocationNames = Array.isArray(locs) ? locs.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
      } catch {
        staffLocationNames = [];
      }
    }

    const {
      startDate: startDateParam,
      endDate: endDateParam,
      userId = 'all',
      locationId = 'all',
      publishedOnly = 'false',
    } = query!;

    const publishedOnlyBool = publishedOnly === 'true';

    const startDate = parseISO(startDateParam);
    if (!isValid(startDate)) throw apiErrors.badRequest('Invalid startDate format. Expected ISO date string.');
    const endDate = parseISO(endDateParam);
    if (!isValid(endDate)) throw apiErrors.badRequest('Invalid endDate format. Expected ISO date string.');
    if (startDate > endDate) throw apiErrors.badRequest('startDate must be before or equal to endDate');

    const rosters = await CalendarDbQueries.findRostersOverlapping(startDate, endDate);

    const { Employer } = await import('@/lib/db');
    const employerOidSet = new Set<string>();
    for (const roster of rosters as any[]) {
      for (const shift of roster.shifts) {
        const emp = shift.employeeId as { employer?: string[] } | null;
        if (!emp?.employer?.length) continue;
        for (const x of emp.employer) if (typeof x === 'string' && /^[a-fA-F0-9]{24}$/.test(x)) employerOidSet.add(x);
      }
    }

    const employerNameById = new Map<string, string>();
    if (employerOidSet.size > 0) {
      const emps = await Employer.find({
        _id: { $in: [...employerOidSet] },
      })
        .select('name')
        .lean();
      for (const e of emps as any[]) employerNameById.set(e._id.toString(), e.name);
    }

    const formatEmployerBadge = (emp: { employer?: string[] } | null | undefined): string => {
      const raw = emp?.employer;
      if (!Array.isArray(raw) || raw.length === 0) return 'Own staff';
      const parts = raw.map((x) => {
        if (typeof x !== 'string') return String(x);
        if (/^[a-fA-F0-9]{24}$/.test(x)) return employerNameById.get(x) ?? x;
        return x;
      });
      const joined = parts.filter(Boolean).join(', ').trim();
      return joined || 'Own staff';
    };

    const events: IEvent[] = [];
    for (const roster of rosters as any[]) {
      for (const shift of roster.shifts as any[]) {
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);
        if (!(shiftStart <= endDate && shiftEnd >= startDate)) continue;

        if (staffEmployeeId && shift.status === 'draft') continue;
        if (publishedOnlyBool && shift.status === 'draft') continue;

        const employeeId = (shift.employeeId as any)?._id?.toString() || 'vacant';
        const employeeName = (shift.employeeId as any)?.name || 'Vacant';
        const employeePicture = (shift.employeeId as any)?.picturePath || null;
        const employerBadge = formatEmployerBadge(shift.employeeId as { employer?: string[] } | null);
        const roleName = (shift.roleId as any)?.name || 'Unknown Role';
        const locationIdStr = (shift.locationId as any)?._id?.toString() || '';
        const locationName = (shift.locationId as any)?.name || 'Unknown Location';

        const matchesUser = userId === 'all' || userId === employeeId;
        const matchesLocation = staffEmployeeId
          ? staffLocationNames.length > 0
            ? staffLocationNames.includes(locationName)
            : employeeId === staffEmployeeId
          : locationId === 'all' || locationId === locationIdStr;

        if (!matchesUser || !matchesLocation) continue;

        const shiftId = shift._id?.toString() || `${roster._id}-${events.length}`;
        const colors: Array<'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'> = [
          'blue',
          'green',
          'red',
          'yellow',
          'purple',
          'orange',
        ];
        const colorIndex = events.length % colors.length;

        const shiftDurH = (shiftEnd.getTime() - shiftStart.getTime()) / 3_600_000;
        let breakStartH: number | undefined;
        let breakEndH: number | undefined;
        let breakMinutesOut: number | undefined;
        const rawShift = shift as unknown as { breakStartTime?: Date; breakEndTime?: Date; breakMinutes?: number };
        if (rawShift.breakStartTime && rawShift.breakEndTime) {
          const bst = new Date(rawShift.breakStartTime);
          const bet = new Date(rawShift.breakEndTime);
          breakStartH = bst.getHours() + bst.getMinutes() / 60;
          breakEndH = bet.getHours() + bet.getMinutes() / 60;
          breakMinutesOut = rawShift.breakMinutes ?? Math.round((bet.getTime() - bst.getTime()) / 60_000);
        } else if (rawShift.breakMinutes && rawShift.breakMinutes > 0) {
          const mid = shiftStart.getHours() + shiftStart.getMinutes() / 60 + shiftDurH / 2;
          const halfDur = rawShift.breakMinutes / 120;
          breakStartH = parseFloat((mid - halfDur).toFixed(4));
          breakEndH = parseFloat((mid + halfDur).toFixed(4));
          breakMinutesOut = rawShift.breakMinutes;
        }

        const event: IEvent = {
          id: shiftId,
          startDate: shiftStart.toISOString(),
          endDate: shiftEnd.toISOString(),
          title: `${roleName} - ${locationName}`,
          color: colors[colorIndex],
          description: shift.notes || '',
          user: { id: employeeId, name: employeeName, picturePath: employeePicture },
          shiftStatus: shift.status === 'draft' ? 'draft' : 'published',
          employerBadge,
        };

        (event as any).roleId = (shift.roleId as any)?._id?.toString() || '';
        (event as any).locationId = locationIdStr;
        if (breakStartH !== undefined) (event as any).breakStartH = breakStartH;
        if (breakEndH !== undefined) (event as any).breakEndH = breakEndH;
        if (breakMinutesOut !== undefined) (event as any).breakMinutes = breakMinutesOut;

        events.push(event);
      }
    }

    return { events };
  }

  async createShift(body: any) {
    await connectDB();
    const shiftDate = parseISO(body.startDate);
    if (!isValid(shiftDate)) throw apiErrors.badRequest('Invalid startDate format');

    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(body.startTime.hour, body.startTime.minute, 0, 0);

    const shiftEndDate = parseISO(body.endDate);
    if (!isValid(shiftEndDate)) throw apiErrors.badRequest('Invalid endDate format');
    const shiftEnd = new Date(shiftEndDate);
    shiftEnd.setHours(body.endTime.hour, body.endTime.minute, 0, 0);

    if (shiftStart >= shiftEnd) throw apiErrors.badRequest('Start time must be before end time');

    const weekId = calculateWeekId(shiftDate);
    const { start: weekStartDate, end: weekEndDate } = getWeekBoundaries(weekId);
    const [year, weekStr] = weekId.split('-W');
    const weekNumber = parseInt(weekStr, 10);

    let roster = await CalendarDbQueries.findRosterByWeekId(weekId);
    if (!roster) {
      roster = new (await import('@/lib/db/schemas/roster')).Roster({
        weekId,
        year: parseInt(year, 10),
        weekNumber,
        weekStartDate,
        weekEndDate,
        shifts: [],
        status: 'draft',
      });
    }

    let breakStartTime: Date | undefined;
    let breakEndTime: Date | undefined;
    let resolvedBreakMinutes: number | undefined;
    if (body.breakStartH !== undefined && body.breakEndH !== undefined) {
      breakStartTime = new Date(shiftDate);
      setTimeFromDecimalHours(breakStartTime, body.breakStartH);
      breakEndTime = new Date(shiftDate);
      setTimeFromDecimalHours(breakEndTime, body.breakEndH);
      resolvedBreakMinutes = Math.round((breakEndTime.getTime() - breakStartTime.getTime()) / 60_000);
    } else if (body.breakMinutes && body.breakMinutes > 0) {
      const shiftDurMs = shiftEnd.getTime() - shiftStart.getTime();
      const midMs = shiftStart.getTime() + shiftDurMs / 2;
      const halfMs = (body.breakMinutes / 2) * 60_000;
      breakStartTime = new Date(midMs - halfMs);
      breakEndTime = new Date(midMs + halfMs);
      resolvedBreakMinutes = body.breakMinutes;
    }

    const newShift = {
      employeeId: body.employeeId && body.employeeId !== 'vacant' ? body.employeeId : null,
      date: shiftDate,
      startTime: shiftStart,
      endTime: shiftEnd,
      locationId: body.locationId,
      roleId: body.roleId,
      sourceScheduleId: null,
      estimatedCost: 0,
      notes: body.notes || '',
      status: 'draft' as const,
      ...(breakStartTime && { breakStartTime }),
      ...(breakEndTime && { breakEndTime }),
      ...(resolvedBreakMinutes !== undefined && { breakMinutes: resolvedBreakMinutes }),
    };

    (roster as any).shifts.push(newShift as any);
    await (roster as any).save();
    const savedShift = (roster as any).shifts[(roster as any).shifts.length - 1];

    return {
      message: 'Shift created successfully',
      shift: {
        _id: savedShift._id.toString(),
        employeeId: savedShift.employeeId?.toString() || null,
        date: newShift.date.toISOString(),
        startTime: newShift.startTime.toISOString(),
        endTime: newShift.endTime.toISOString(),
        locationId: String(newShift.locationId),
        roleId: String(newShift.roleId),
        sourceScheduleId: newShift.sourceScheduleId,
        estimatedCost: newShift.estimatedCost,
        notes: newShift.notes,
        breakStartTime: breakStartTime?.toISOString(),
        breakEndTime: breakEndTime?.toISOString(),
        breakMinutes: resolvedBreakMinutes,
      },
      weekId,
    };
  }

  async updateShift(shiftId: string, updateData: any) {
    await connectDB();
    const roster = await CalendarDbQueries.findRosterContainingShift(shiftId);
    if (!roster) throw apiErrors.notFound('Shift not found');

    const shiftIndex = (roster as any).shifts.findIndex((s: any) => s._id.toString() === shiftId);
    if (shiftIndex === -1) throw apiErrors.notFound('Shift not found');
    const shift = (roster as any).shifts[shiftIndex];

    if (updateData.employeeId !== undefined) {
      shift.employeeId = updateData.employeeId && updateData.employeeId !== 'vacant' ? updateData.employeeId : null;
    }
    if (updateData.roleId) shift.roleId = updateData.roleId;
    if (updateData.locationId) shift.locationId = updateData.locationId;

    if (updateData.startDate && updateData.startTime) {
      const shiftDate = parseISO(updateData.startDate);
      if (!isValid(shiftDate)) throw apiErrors.badRequest('Invalid startDate format');
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(updateData.startTime.hour, updateData.startTime.minute, 0, 0);
      shift.startTime = shiftStart;
      shift.date = shiftDate;
    }

    if (updateData.endDate && updateData.endTime) {
      const shiftEndDate = parseISO(updateData.endDate);
      if (!isValid(shiftEndDate)) throw apiErrors.badRequest('Invalid endDate format');
      const shiftEnd = new Date(shiftEndDate);
      shiftEnd.setHours(updateData.endTime.hour, updateData.endTime.minute, 0, 0);
      shift.endTime = shiftEnd;
    }

    if (updateData.notes !== undefined) shift.notes = updateData.notes;

    if (updateData.breakStartH !== undefined && updateData.breakEndH !== undefined) {
      const baseDate = shift.date ?? shift.startTime;
      const bst = new Date(baseDate);
      setTimeFromDecimalHours(bst, updateData.breakStartH);
      const bet = new Date(baseDate);
      setTimeFromDecimalHours(bet, updateData.breakEndH);
      (shift as any).breakStartTime = bst;
      (shift as any).breakEndTime = bet;
      (shift as any).breakMinutes = Math.round((bet.getTime() - bst.getTime()) / 60_000);
    } else if (updateData.breakMinutes !== undefined) {
      if (updateData.breakMinutes === 0) {
        (shift as any).breakStartTime = undefined;
        (shift as any).breakEndTime = undefined;
        (shift as any).breakMinutes = 0;
      } else {
        const s = new Date(shift.startTime);
        const e = new Date(shift.endTime);
        const midMs = s.getTime() + (e.getTime() - s.getTime()) / 2;
        const halfMs = (updateData.breakMinutes / 2) * 60_000;
        (shift as any).breakStartTime = new Date(midMs - halfMs);
        (shift as any).breakEndTime = new Date(midMs + halfMs);
        (shift as any).breakMinutes = updateData.breakMinutes;
      }
    }

    if (shift.startTime && shift.endTime && shift.startTime >= shift.endTime) {
      throw apiErrors.badRequest('Start time must be before end time');
    }

    await (roster as any).save();

    return {
      message: 'Shift updated successfully',
      shift: {
        _id: shift._id.toString(),
        employeeId: shift.employeeId?.toString() || null,
        date: shift.date.toISOString(),
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        locationId: shift.locationId.toString(),
        roleId: shift.roleId.toString(),
        sourceScheduleId: shift.sourceScheduleId,
        estimatedCost: shift.estimatedCost,
        notes: shift.notes,
        breakStartTime: (shift as any).breakStartTime?.toISOString?.(),
        breakEndTime: (shift as any).breakEndTime?.toISOString?.(),
        breakMinutes: (shift as any).breakMinutes,
      },
      weekId: (roster as any).weekId,
    };
  }

  async deleteShift(shiftId: string) {
    await connectDB();
    const result = await CalendarDbQueries.pullShiftById(shiftId);
    if ((result as any).matchedCount === 0) throw apiErrors.notFound('Shift not found');
    if ((result as any).modifiedCount === 0) throw apiErrors.internal('Failed to delete shift');
    return { success: true, message: 'Shift deleted successfully' };
  }
}

export const calendarService = new CalendarService();

