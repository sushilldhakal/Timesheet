import { apiErrors } from '@/lib/api/api-error';
import { AvailabilityDbQueries } from '@/lib/db/queries/availability';
import { RoleAssignmentManager, RoleAssignmentError } from '@/lib/managers/role-assignment-manager';
import { formatSuccess, formatError } from '@/lib/utils/api/api-response';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

function parseOptionalDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const d = new Date(input as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export class AvailabilityService {
  async getAvailableEmployeesForRole(args: { query: any }) {
    await connectDB();
    const { roleId, locationId, date: dateParam } = args.query || {};
    if (!roleId || !locationId) throw apiErrors.badRequest('Query parameters are required');
    if (!mongoose.Types.ObjectId.isValid(roleId)) return { status: 400, data: formatError('Invalid role ID format', 'INVALID_ROLE_ID') };
    if (!mongoose.Types.ObjectId.isValid(locationId))
      return { status: 400, data: formatError('Invalid location ID format', 'INVALID_LOCATION_ID') };
    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) return { status: 400, data: formatError('Invalid date parameter', 'INVALID_DATE') };

    try {
      const manager = new RoleAssignmentManager();
      const assignments = await manager.getEmployeesForRole(roleId, locationId, date);
      const employees = (assignments as any[]).map((assignment) => {
        const employeeData = assignment.employeeId;
        return {
          employeeId: employeeData._id.toString(),
          employeeName: employeeData.name,
          assignmentId: assignment._id.toString(),
          validFrom: assignment.validFrom.toISOString(),
          validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
        };
      });
      return {
        status: 200,
        data: formatSuccess(
          { employees },
          { count: employees.length, roleId, locationId, date: date.toISOString() }
        ),
      };
    } catch (err) {
      if (err instanceof RoleAssignmentError) return { status: err.statusCode, data: formatError(err.message, err.code) };
      if (err instanceof Error && (err.message?.includes('connection') || err.message?.includes('timeout'))) {
        return { status: 503, data: formatError('Database connection error. Please try again later.', 'DATABASE_CONNECTION_ERROR') };
      }
      return { status: 500, data: formatError('Failed to fetch available employees', 'FETCH_FAILED') };
    }
  }

  async listConstraints(args: { employeeId: string; tenantId: string }) {
    await connectDB();
    const constraints = await AvailabilityDbQueries.listEmployeeConstraints(args);
    return { constraints };
  }

  async createConstraint(args: { employeeId: string; tenantId: string; body: any }) {
    await connectDB();
    const b = args.body;
    const constraint = await AvailabilityDbQueries.createConstraint({
      tenantId: new mongoose.Types.ObjectId(args.tenantId),
      employeeId: new mongoose.Types.ObjectId(args.employeeId),
      unavailableDays: b.unavailableDays || [],
      unavailableTimeRanges: b.unavailableTimeRanges || [],
      preferredShiftTypes: b.preferredShiftTypes || [],
      maxConsecutiveDays: b.maxConsecutiveDays || null,
      minRestHours: b.minRestHours || null,
      temporaryStartDate: parseOptionalDate(b.temporaryStartDate),
      temporaryEndDate: parseOptionalDate(b.temporaryEndDate),
      reason: b.reason || '',
    });
    return { constraint };
  }

  async updateConstraint(args: { employeeId: string; tenantId: string; constraintId: string; body: any }) {
    await connectDB();
    const b = args.body || {};
    const patch: Record<string, unknown> = {};

    if (b.unavailableDays !== undefined) patch.unavailableDays = b.unavailableDays ?? [];
    if (b.unavailableTimeRanges !== undefined) patch.unavailableTimeRanges = b.unavailableTimeRanges ?? [];
    if (b.preferredShiftTypes !== undefined) patch.preferredShiftTypes = b.preferredShiftTypes ?? [];
    if (b.maxConsecutiveDays !== undefined) patch.maxConsecutiveDays = b.maxConsecutiveDays ?? null;
    if (b.minRestHours !== undefined) patch.minRestHours = b.minRestHours ?? null;
    if (b.temporaryStartDate !== undefined) patch.temporaryStartDate = parseOptionalDate(b.temporaryStartDate);
    if (b.temporaryEndDate !== undefined) patch.temporaryEndDate = parseOptionalDate(b.temporaryEndDate);
    if (b.reason !== undefined) patch.reason = b.reason ?? '';

    if (Object.keys(patch).length === 0) throw apiErrors.badRequest('No fields to update');

    const doc = await AvailabilityDbQueries.updateConstraint({
      constraintId: args.constraintId,
      tenantId: new mongoose.Types.ObjectId(args.tenantId),
      employeeId: new mongoose.Types.ObjectId(args.employeeId),
      patch,
    });
    if (!doc) throw apiErrors.notFound('Constraint not found');
    return { constraint: doc };
  }

  async deleteConstraint(args: { constraintId: string }) {
    await connectDB();
    const result = await AvailabilityDbQueries.deleteConstraintById(args.constraintId);
    if (!result) throw apiErrors.notFound('Constraint not found');
    return { success: true };
  }
}

export const availabilityService = new AvailabilityService();

