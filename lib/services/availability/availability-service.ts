import { apiErrors } from '@/lib/api/api-error';
import { AvailabilityDbQueries } from '@/lib/db/queries/availability';
import { AvailabilityConstraint } from '@/lib/db/schemas/availability-constraint';
import { RoleAssignmentManager, RoleAssignmentError } from '@/lib/managers/role-assignment-manager';
import { formatSuccess, formatError } from '@/lib/utils/api/api-response';
import { connectDB } from '@/lib/db';
import { isLikelyObjectIdString } from '@/shared/ids';

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
    if (!isLikelyObjectIdString(roleId)) return { status: 400, data: formatError('Invalid role ID format', 'INVALID_ROLE_ID') };
    if (!isLikelyObjectIdString(locationId))
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

  async listBulk(args: { tenantId: string; location?: string[]; startDate?: string; endDate?: string }) {
    await connectDB();
    const { tenantId, location, startDate, endDate } = args;
    const { EmployeeTeamAssignment, Location } = await import('@/lib/db');

    const tenantFilter = { tenantId };

    let employeeIds: string[] | null = null;

    if (location && location.length > 0) {
      const locationDocs = await Location.find({ ...tenantFilter, name: { $in: location } }).select('_id').lean();
      const locationIds = (locationDocs as any[]).map((l) => l._id);
      if (locationIds.length === 0) return { constraints: [] };
      const assignments = await EmployeeTeamAssignment.find({
        ...tenantFilter,
        locationId: { $in: locationIds },
        isActive: true,
      }).distinct('employeeId');
      employeeIds = assignments.map((id: any) => id.toString());
      if (employeeIds.length === 0) return { constraints: [] };
    }

    const filter: any = { ...tenantFilter };
    if (employeeIds) filter.employeeId = { $in: employeeIds };

    // Date range filter: include constraints relevant to the requested range.
    // For permanent constraints (no temp window), only include if at least one
    // unavailableDay (day-of-week) falls within the date range.
    // For temporary constraints, include if the window overlaps the range.
    if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);

      // Compute which days-of-week (0-6) appear in the date range
      const daysInRange = new Set<number>();
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        daysInRange.add(cur.getDay());
        cur.setDate(cur.getDate() + 1);
        // Cap at 7 days to avoid infinite loop on bad input
        if (daysInRange.size === 7) break;
      }
      const dowArray = Array.from(daysInRange);

      filter.$or = [
        // Permanent with matching day-of-week
        {
          temporaryStartDate: null,
          temporaryEndDate: null,
          unavailableDays: { $elemMatch: { $in: dowArray } },
        },
        // Permanent with no specific days (time-range only constraints) — always relevant
        {
          temporaryStartDate: null,
          temporaryEndDate: null,
          unavailableDays: { $size: 0 },
          'unavailableTimeRanges.0': { $exists: true },
        },
        // Temporary window overlaps range
        {
          temporaryStartDate: { $lte: rangeEnd },
          temporaryEndDate: { $gte: rangeStart },
        },
        // Open-ended temporary: starts before range ends
        {
          temporaryStartDate: { $lte: rangeEnd },
          $or: [{ temporaryEndDate: null }, { temporaryEndDate: { $exists: false } }],
        },
      ];
    }

    const docs = await AvailabilityConstraint.find(filter)
      .populate('employeeId', 'name pin')
      .lean();

    // Fetch team assignments for all employees in one query
    const empOids = (docs as any[]).map((doc) => {
      const emp = doc.employeeId as any;
      return emp?._id ?? doc.employeeId;
    }).filter(Boolean);

    const teamAssignmentDocs = empOids.length > 0
      ? await (await import('@/lib/db')).EmployeeTeamAssignment.find({
          ...tenantFilter,
          employeeId: { $in: empOids },
          isActive: true,
        }).populate('teamId', 'name color').lean()
      : [];

    // employeeId string → teams array
    const teamsByEmployee = new Map<string, Array<{ id: string; name: string; color?: string }>>();
    for (const a of teamAssignmentDocs as any[]) {
      const empId = a.employeeId.toString();
      if (!teamsByEmployee.has(empId)) teamsByEmployee.set(empId, []);
      if (!a.teamId) continue;
      const existing = teamsByEmployee.get(empId)!;
      const teamId = a.teamId._id.toString();
      if (!existing.some((t) => t.id === teamId)) {
        existing.push({ id: teamId, name: a.teamId.name, color: a.teamId.color });
      }
    }

    const constraints = (docs as any[]).map((doc) => {
      const emp = doc.employeeId as any;
      const employeeOid = emp?._id?.toString() ?? String(doc.employeeId ?? '');
      const employeeName = typeof emp?.name === 'string' ? emp.name : '';
      const employeePin = typeof emp?.pin === 'string' ? emp.pin : '';
      const toIso = (d: any) => d instanceof Date ? d.toISOString() : (d ? String(d) : null);
      return {
        id: doc._id.toString(),
        employeeId: employeeOid,
        employeeName,
        employeePin,
        teams: teamsByEmployee.get(employeeOid) ?? [],
        status: (doc as any).status ?? 'PENDING',
        approvedBy: (doc as any).approvedBy ? String((doc as any).approvedBy) : null,
        approvedAt: toIso((doc as any).approvedAt),
        declinedBy: (doc as any).declinedBy ? String((doc as any).declinedBy) : null,
        declinedAt: toIso((doc as any).declinedAt),
        declineReason: (doc as any).declineReason ?? null,
        unavailableDays: doc.unavailableDays ?? [],
        unavailableTimeRanges: doc.unavailableTimeRanges ?? [],
        preferredShiftTypes: doc.preferredShiftTypes ?? [],
        maxConsecutiveDays: doc.maxConsecutiveDays ?? null,
        minRestHours: doc.minRestHours ?? null,
        temporaryStartDate: toIso(doc.temporaryStartDate),
        temporaryEndDate: toIso(doc.temporaryEndDate),
        reason: typeof doc.reason === 'string' ? doc.reason : '',
        createdAt: toIso(doc.createdAt) ?? '',
        updatedAt: toIso(doc.updatedAt) ?? '',
      };
    });

    return { constraints };
  }

  async approveConstraint(args: { constraintId: string; tenantId: string; approverId: string; comment?: string }) {
    await connectDB();
    const doc = await AvailabilityConstraint.findOneAndUpdate(
      { _id: args.constraintId, tenantId: args.tenantId },
      {
        $set: {
          status: 'APPROVED',
          approvedBy: args.approverId,
          approvedAt: new Date(),
          declinedBy: null,
          declinedAt: null,
          declineReason: args.comment?.trim() || null,
        },
      },
      { new: true }
    ).populate('employeeId', 'name pin').lean();
    if (!doc) throw apiErrors.notFound('Constraint not found');
    return { constraint: doc };
  }

  async declineConstraint(args: { constraintId: string; tenantId: string; declinerId: string; reason: string }) {
    await connectDB();
    if (!args.reason?.trim()) throw apiErrors.badRequest('Decline reason is required');
    const doc = await AvailabilityConstraint.findOneAndUpdate(
      { _id: args.constraintId, tenantId: args.tenantId },
      {
        $set: {
          status: 'DECLINED',
          declinedBy: args.declinerId,
          declinedAt: new Date(),
          declineReason: args.reason.trim(),
          approvedBy: null,
          approvedAt: null,
        },
      },
      { new: true }
    ).populate('employeeId', 'name pin').lean();
    if (!doc) throw apiErrors.notFound('Constraint not found');
    return { constraint: doc };
  }

  async createConstraint(args: { employeeId: string; tenantId: string; body: any }) {
    await connectDB();
    const b = args.body;
    const constraint = await AvailabilityDbQueries.createConstraint({
      tenantId: args.tenantId,
      employeeId: args.employeeId,
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
      tenantId: args.tenantId,
      employeeId: args.employeeId,
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

