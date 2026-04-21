import mongoose from 'mongoose';
import { getAuthFromCookie, getEmployeeFromCookie } from '@/lib/auth/auth-helpers';
import { RoleAssignmentManager, RoleAssignmentError } from '@/lib/managers/role-assignment-manager';
import { EmployeeRolesDbQueries } from '@/lib/db/queries/employee-roles';
import { formatSuccess, formatError } from '@/lib/utils/api/api-response';
import { connectDB } from '@/lib/db';

export class EmployeeRolesService {
  async listAssignments(args: { employeeId: string; query: any }) {
    await connectDB();
    const { employeeId, query } = args;
    const adminAuth = await getAuthFromCookie();
    const employeeAuth = adminAuth ? null : await getEmployeeFromCookie();
    const isSelfEmployee = employeeAuth?.sub === employeeId;
    if (!adminAuth && !isSelfEmployee) return { status: 401, data: formatError('Unauthorized', 'AUTH_REQUIRED') };

    const locationId = query?.locationId;
    const dateParam = query?.date;
    const includeInactive = query?.includeInactive === 'true';

    if (!mongoose.Types.ObjectId.isValid(employeeId)) return { status: 400, data: formatError('Invalid employee ID', 'INVALID_EMPLOYEE_ID') };
    if (locationId && !mongoose.Types.ObjectId.isValid(locationId))
      return { status: 400, data: formatError('Invalid location ID', 'INVALID_LOCATION_ID') };

    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) return { status: 400, data: formatError('Invalid date parameter', 'INVALID_DATE') };

    try {
      const employee = await EmployeeRolesDbQueries.employeeExists(employeeId);
      if (!employee) return { status: 404, data: formatError('Employee not found', 'EMPLOYEE_NOT_FOUND') };

      const manager = new RoleAssignmentManager();
      const assignments = await manager.getEmployeeAssignments(employeeId, locationId || undefined, date, includeInactive);

      const formattedAssignments = (assignments as any[]).map((assignment) => {
        const teamData = assignment.roleId as any;
        const locationData = assignment.locationId as any;
        return {
          id: assignment._id.toString(),
          teamId: teamData._id.toString(),
          teamName: teamData.name,
          teamColor: teamData.color,
          locationId: locationData._id.toString(),
          locationName: locationData.name,
          locationColor: locationData.color,
          validFrom: assignment.validFrom,
          validTo: assignment.validTo,
          isActive: assignment.isActive,
          notes: assignment.notes,
          assignedAt: assignment.assignedAt,
        };
      });

      return {
        status: 200,
        data: formatSuccess(
          { assignments: formattedAssignments },
          { count: formattedAssignments.length, employeeId, date: date.toISOString() }
        ),
      };
    } catch (err) {
      if (err instanceof RoleAssignmentError) return { status: err.statusCode, data: formatError(err.message, err.code) };
      if (err instanceof Error && (err.message?.includes('connection') || err.message?.includes('timeout'))) {
        return { status: 503, data: formatError('Database connection error. Please try again later.', 'DATABASE_CONNECTION_ERROR') };
      }
      return { status: 500, data: formatError('Failed to fetch employee role assignments', 'FETCH_FAILED') };
    }
  }

  async assignRole(args: { employeeId: string; body: any }) {
    await connectDB();
    const auth = await getAuthFromCookie();
    if (!auth) return { status: 401, data: formatError('Unauthorized', 'AUTH_REQUIRED') };

    const employeeId = args.employeeId;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) return { status: 400, data: formatError('Invalid employee ID', 'INVALID_EMPLOYEE_ID') };

    const { teamId, locationId, validFrom, validTo, notes } = args.body || {};

    try {
      const manager = new RoleAssignmentManager();
      const assignment = (await manager.assignRole({
        employeeId,
        roleId: teamId,
        locationId,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: validTo ? new Date(validTo) : null,
        userId: auth.sub,
        notes,
      })) as any;

      const populatedAssignment = await EmployeeRolesDbQueries.findAssignmentPopulatedLean(assignment._id);
      if (!populatedAssignment) return { status: 500, data: formatError('Failed to retrieve created assignment', 'ASSIGNMENT_NOT_FOUND') };

      const teamData = (populatedAssignment as any).roleId as any;
      const locationData = (populatedAssignment as any).locationId as any;

      return {
        status: 201,
        data: formatSuccess(
          {
            assignment: {
              id: (populatedAssignment as any)._id.toString(),
              employeeId: (populatedAssignment as any).employeeId.toString(),
              teamId: teamData._id.toString(),
              teamName: teamData.name,
              teamColor: teamData.color,
              locationId: locationData._id.toString(),
              locationName: locationData.name,
              validFrom: (populatedAssignment as any).validFrom,
              validTo: (populatedAssignment as any).validTo,
              isActive: (populatedAssignment as any).isActive,
              notes: (populatedAssignment as any).notes,
              assignedAt: (populatedAssignment as any).assignedAt,
            },
          },
          { createdAt: (populatedAssignment as any).assignedAt?.toISOString() }
        ),
      };
    } catch (err: any) {
      if (err instanceof RoleAssignmentError) return { status: err.statusCode, data: formatError(err.message, err.code) };
      if (err instanceof Error && (err.message?.includes('connection') || err.message?.includes('timeout'))) {
        return { status: 503, data: formatError('Database connection error. Please try again later.', 'DATABASE_CONNECTION_ERROR') };
      }
      if (err instanceof SyntaxError) return { status: 400, data: formatError('Invalid JSON in request body', 'INVALID_JSON') };
      return { status: 500, data: formatError('Failed to assign role to employee', 'ASSIGN_FAILED') };
    }
  }

  async updateAssignment(args: { employeeId: string; assignmentId: string; body: any }) {
    await connectDB();
    const auth = await getAuthFromCookie();
    if (!auth) return { status: 401, data: formatError('Unauthorized', 'AUTH_REQUIRED') };

    const { employeeId, assignmentId, body } = args;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) return { status: 400, data: formatError('Invalid employee ID', 'INVALID_EMPLOYEE_ID') };
    if (!mongoose.Types.ObjectId.isValid(assignmentId))
      return { status: 400, data: formatError('Invalid assignment ID', 'INVALID_ASSIGNMENT_ID') };

    const { validTo, notes } = body || {};

    try {
      const assignment = await EmployeeRolesDbQueries.findAssignmentForEmployee({ assignmentId, employeeId });
      if (!assignment) return { status: 404, data: formatError('Assignment not found', 'ASSIGNMENT_NOT_FOUND') };

      if (validTo !== undefined && validTo !== null) {
        const validToDate = new Date(validTo);
        if (validToDate < (assignment as any).validFrom) {
          return { status: 400, data: formatError('Valid to date must be after or equal to valid from date', 'INVALID_DATE_RANGE') };
        }
      }

      if (validTo !== undefined) {
        (assignment as any).validTo = validTo ? new Date(validTo) : null;
        const now = new Date();
        (assignment as any).isActive = (assignment as any).validFrom <= now && (!(assignment as any).validTo || (assignment as any).validTo >= now);
      }
      if (notes !== undefined) (assignment as any).notes = notes;

      await (assignment as any).save();

      const populatedAssignment = await EmployeeRolesDbQueries.findAssignmentPopulatedLean((assignment as any)._id);
      if (!populatedAssignment) return { status: 500, data: formatError('Failed to retrieve updated assignment', 'ASSIGNMENT_NOT_FOUND') };

      const teamData = (populatedAssignment as any).roleId as any;
      const locationData = (populatedAssignment as any).locationId as any;

      return {
        status: 200,
        data: formatSuccess(
          {
            assignment: {
              id: (populatedAssignment as any)._id.toString(),
              employeeId: (populatedAssignment as any).employeeId.toString(),
              teamId: teamData._id.toString(),
              teamName: teamData.name,
              teamColor: teamData.color,
              locationId: locationData._id.toString(),
              locationName: locationData.name,
              validFrom: (populatedAssignment as any).validFrom,
              validTo: (populatedAssignment as any).validTo,
              isActive: (populatedAssignment as any).isActive,
              notes: (populatedAssignment as any).notes,
              assignedAt: (populatedAssignment as any).assignedAt,
            },
          },
          { updatedAt: (populatedAssignment as any).updatedAt?.toISOString() }
        ),
      };
    } catch (err: any) {
      if (err instanceof RoleAssignmentError) return { status: err.statusCode, data: formatError(err.message, err.code) };
      if (err?.name === 'ValidationError') return { status: 400, data: formatError(`Validation error: ${err.message}`, 'DATABASE_VALIDATION_ERROR') };
      if (err instanceof Error && (err.message?.includes('connection') || err.message?.includes('timeout'))) {
        return { status: 503, data: formatError('Database connection error. Please try again later.', 'DATABASE_CONNECTION_ERROR') };
      }
      if (err instanceof SyntaxError) return { status: 400, data: formatError('Invalid JSON in request body', 'INVALID_JSON') };
      return { status: 500, data: formatError('Failed to update assignment', 'UPDATE_FAILED') };
    }
  }

  async endAssignment(args: { employeeId: string; assignmentId: string }) {
    await connectDB();
    const auth = await getAuthFromCookie();
    if (!auth) return { status: 401, data: formatError('Unauthorized', 'AUTH_REQUIRED') };

    const { employeeId, assignmentId } = args;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) return { status: 400, data: formatError('Invalid employee ID', 'INVALID_EMPLOYEE_ID') };
    if (!mongoose.Types.ObjectId.isValid(assignmentId))
      return { status: 400, data: formatError('Invalid assignment ID', 'INVALID_ASSIGNMENT_ID') };

    try {
      const manager = new RoleAssignmentManager();
      await manager.endAssignment(assignmentId, auth.sub);
      return {
        status: 200,
        data: formatSuccess(
          { message: 'Assignment ended successfully' },
          { employeeId, assignmentId, endedAt: new Date().toISOString() }
        ),
      };
    } catch (err: any) {
      if (err instanceof RoleAssignmentError) return { status: err.statusCode, data: formatError(err.message, err.code) };
      if (err instanceof Error && (err.message?.includes('connection') || err.message?.includes('timeout'))) {
        return { status: 503, data: formatError('Database connection error. Please try again later.', 'DATABASE_CONNECTION_ERROR') };
      }
      return { status: 500, data: formatError('Failed to end assignment', 'END_ASSIGNMENT_FAILED') };
    }
  }
}

export const employeeRolesService = new EmployeeRolesService();

