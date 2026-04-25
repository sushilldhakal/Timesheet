import { apiErrors } from '@/lib/api/api-error';
import { employeeLocationFilter, type AuthWithLocations } from '@/lib/auth/auth-api';
import { EmployeeSchedulesDbQueries } from '@/lib/db/queries/employee-schedules';
import { ScheduleManager } from '@/lib/managers/schedule-manager';
import { connectDB } from '@/lib/db';
import { isLikelyObjectIdString } from '@/shared/ids';

export class EmployeeSchedulesService {
  async listSchedules(args: { ctx: AuthWithLocations; employeeId: string; query: any }) {
    await connectDB();
    const { ctx, employeeId, query } = args;
    if (!isLikelyObjectIdString(employeeId)) throw apiErrors.badRequest('Invalid employee ID');

    const empFilter: Record<string, unknown> = { _id: employeeId };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];

    const employee = await EmployeeSchedulesDbQueries.findEmployeeLean(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const dateParam = query?.date;
    if (dateParam) {
      const date = new Date(dateParam);
      if (isNaN(date.getTime())) throw apiErrors.badRequest('Invalid date format');
      const scheduleManager = new ScheduleManager();
      const result = await scheduleManager.getActiveSchedules(employeeId, date);
      if (!result.success) throw apiErrors.internal(result.error || 'QUERY_FAILED', result.message);
      return { schedules: result.schedules };
    }

    return { schedules: (employee as any).schedules || [] };
  }

  async createSchedule(args: { ctx: AuthWithLocations; employeeId: string; body: any }) {
    await connectDB();
    const { ctx, employeeId, body } = args;
    if (!isLikelyObjectIdString(employeeId)) throw apiErrors.badRequest('Invalid employee ID');

    const empFilter: Record<string, unknown> = { _id: employeeId };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];

    const employee = await EmployeeSchedulesDbQueries.findEmployee(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const scheduleManager = new ScheduleManager();
    const scheduleData = {
      dayOfWeek: body.dayOfWeek,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      locationId: body.locationId,
      roleId: body.roleId,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
    };
    const result = await scheduleManager.createSchedule(employeeId, scheduleData as any);
    if (!result.success) throw apiErrors.badRequest(result.error || 'CREATE_FAILED', result.message);
    return { schedule: result.schedule };
  }

  async updateSchedule(args: { ctx: AuthWithLocations; employeeId: string; scheduleId: string; body: any }) {
    await connectDB();
    const { ctx, employeeId, scheduleId, body } = args;
    if (!isLikelyObjectIdString(employeeId)) throw apiErrors.badRequest('Invalid employee ID');
    if (!isLikelyObjectIdString(scheduleId)) throw apiErrors.badRequest('Invalid schedule ID');

    const empFilter: Record<string, unknown> = { _id: employeeId };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    const employee = await EmployeeSchedulesDbQueries.findEmployee(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const updateData: Record<string, unknown> = {};
    if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek;
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime);
    if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime);
    if (body.locationId !== undefined) updateData.locationId = body.locationId;
    if (body.roleId !== undefined) updateData.roleId = body.roleId;
    if (body.effectiveFrom !== undefined) updateData.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveTo !== undefined) updateData.effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;

    const scheduleManager = new ScheduleManager();
    const result = await scheduleManager.updateSchedule(employeeId, scheduleId, updateData as any);
    if (!result.success) {
      if (result.error === 'SCHEDULE_NOT_FOUND') throw apiErrors.notFound(result.message);
      throw apiErrors.badRequest(result.error || 'UPDATE_FAILED', result.message);
    }
    return { schedule: result.schedule };
  }

  async deleteSchedule(args: { ctx: AuthWithLocations; employeeId: string; scheduleId: string }) {
    await connectDB();
    const { ctx, employeeId, scheduleId } = args;
    if (!isLikelyObjectIdString(employeeId)) throw apiErrors.badRequest('Invalid employee ID');
    if (!isLikelyObjectIdString(scheduleId)) throw apiErrors.badRequest('Invalid schedule ID');

    const empFilter: Record<string, unknown> = { _id: employeeId };
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) empFilter.$and = [locFilter];
    const employee = await EmployeeSchedulesDbQueries.findEmployee(empFilter);
    if (!employee) throw apiErrors.notFound('Employee not found');

    const scheduleManager = new ScheduleManager();
    const result = await scheduleManager.deleteSchedule(employeeId, scheduleId);
    if (!result.success) {
      if (result.error === 'SCHEDULE_NOT_FOUND') throw apiErrors.notFound(result.message);
      throw apiErrors.badRequest(result.error || 'DELETE_FAILED', result.message);
    }
    return { success: true };
  }
}

export const employeeSchedulesService = new EmployeeSchedulesService();

