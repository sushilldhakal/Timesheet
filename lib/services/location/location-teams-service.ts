import { RoleEnablementError, RoleEnablementManager } from '@/lib/managers/role-enablement-manager';
import { LocationsDbQueries } from '@/lib/db/queries/locations';
import { LocationTeamsDbQueries } from '@/lib/db/queries/location-teams';
import { connectDB } from '@/lib/db';

export class LocationTeamsService {
  async listEnabledTeams(args: { auth: any; locationId: string; query: any }) {
    const { locationId, query } = args;
    const dateParam = query?.date;
    const includeInactive = query?.includeInactive || false;
    void includeInactive;

    await connectDB();

    if (!/^[a-fA-F0-9]{24}$/.test(locationId)) {
      return { status: 400, data: { error: 'Invalid location ID' } };
    }

    const location = await LocationsDbQueries.findByIdLean(locationId);
    if (!location) return { status: 404, data: { error: 'Location not found' } };

    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) return { status: 400, data: { error: 'Invalid date parameter' } };

    const manager = new RoleEnablementManager();
    const enablements = await manager.getEnabledRoles(locationId, date);

    const teams = await Promise.all(
      enablements.map(async (enablement: any) => {
        const roleId = enablement.roleId as any;
        const employeeCount = await LocationTeamsDbQueries.countEmployeesForRoleAtLocation({
          roleId: roleId._id.toString(),
          locationId,
          date,
        });
        return {
          teamId: roleId._id.toString(),
          teamName: roleId.name,
          teamColor: roleId.color,
          effectiveFrom: enablement.effectiveFrom,
          effectiveTo: enablement.effectiveTo,
          isActive: enablement.isActive,
          employeeCount,
        };
      }),
    );

    return { status: 200, data: { teams } };
  }

  async enableTeam(args: { auth: any; locationId: string; body: any }) {
    const { auth, locationId, body } = args;
    const { teamId, effectiveFrom, effectiveTo } = body;

    await connectDB();

    if (!/^[a-fA-F0-9]{24}$/.test(locationId)) return { status: 400, data: { error: 'Invalid location ID' } };
    if (!/^[a-fA-F0-9]{24}$/.test(teamId)) return { status: 400, data: { error: 'Invalid team ID' } };

    const manager = new RoleEnablementManager();
    const enablement = (await manager.enableRole({
      locationId,
      roleId: teamId,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      userId: auth.sub,
    })) as any;

    const populated = await LocationTeamsDbQueries.findEnablementByIdPopulated(enablement._id.toString());
    if (!populated) return { status: 500, data: { error: 'Failed to retrieve created enablement' } };

    const teamData = populated.roleId as any;
    return {
      status: 201,
      data: {
        enablement: {
          id: populated._id.toString(),
          locationId: populated.locationId.toString(),
          teamId: teamData._id.toString(),
          teamName: teamData.name,
          teamColor: teamData.color,
          effectiveFrom: populated.effectiveFrom,
          effectiveTo: populated.effectiveTo,
          isActive: populated.isActive,
        },
      },
    };
  }

  async disableTeam(args: { auth: any; locationId: string; teamId: string }) {
    const { auth, locationId, teamId } = args;
    await connectDB();
    if (!/^[a-fA-F0-9]{24}$/.test(locationId)) return { status: 400, data: { error: 'Invalid location ID' } };
    if (!/^[a-fA-F0-9]{24}$/.test(teamId)) return { status: 400, data: { error: 'Invalid team ID' } };
    const manager = new RoleEnablementManager();
    await manager.disableRole(locationId, teamId, auth.sub);
    return { status: 200, data: { message: 'Team disabled at location' } };
  }

  async updateEnablement(args: { auth: any; locationId: string; teamId: string; body: any }) {
    const { locationId, teamId, body } = args;
    const { effectiveFrom, effectiveTo } = body;

    await connectDB();
    if (!/^[a-fA-F0-9]{24}$/.test(locationId)) return { status: 400, data: { error: 'Invalid location ID' } };
    if (!/^[a-fA-F0-9]{24}$/.test(teamId)) return { status: 400, data: { error: 'Invalid team ID' } };

    const now = new Date();
    const enablement = await LocationTeamsDbQueries.findActiveEnablement({ locationId, teamId, now });
    if (!enablement) return { status: 404, data: { error: 'No active team enablement found' } };

    if (effectiveFrom) {
      const newEffectiveFrom = new Date(effectiveFrom);
      if (isNaN(newEffectiveFrom.getTime())) return { status: 400, data: { error: 'Invalid effectiveFrom date' } };
      if ((enablement as any).effectiveTo && newEffectiveFrom > (enablement as any).effectiveTo) {
        return { status: 400, data: { error: 'effectiveFrom must be before or equal to effectiveTo' } };
      }
      (enablement as any).effectiveFrom = newEffectiveFrom;
    }

    if (effectiveTo !== undefined) {
      const newEffectiveTo = effectiveTo ? new Date(effectiveTo) : null;
      if (newEffectiveTo && isNaN(newEffectiveTo.getTime())) return { status: 400, data: { error: 'Invalid effectiveTo date' } };
      if (newEffectiveTo && (enablement as any).effectiveFrom > newEffectiveTo) {
        return { status: 400, data: { error: 'effectiveFrom must be before or equal to effectiveTo' } };
      }
      (enablement as any).effectiveTo = newEffectiveTo;
    }

    await (enablement as any).save();
    await (enablement as any).populate('roleId', 'name color');
    const teamData = (enablement as any).roleId as any;

    return {
      status: 200,
      data: {
        enablement: {
          id: (enablement as any)._id.toString(),
          locationId: (enablement as any).locationId.toString(),
          teamId: teamData._id.toString(),
          teamName: teamData.name,
          teamColor: teamData.color,
          effectiveFrom: (enablement as any).effectiveFrom,
          effectiveTo: (enablement as any).effectiveTo,
          isActive: (enablement as any).isActive,
        },
      },
    };
  }

  mapError(err: unknown) {
    if (err instanceof RoleEnablementError) return { status: err.statusCode, data: { error: err.message } };
    if (err instanceof Error && (err.message?.includes('connection') || err.message?.includes('timeout'))) {
      return { status: 503, data: { error: 'Database connection error. Please try again later.' } };
    }
    if ((err as any)?.name === 'ValidationError') return { status: 400, data: { error: `Validation error: ${(err as any).message}` } };
    return null;
  }
}

export const locationTeamsService = new LocationTeamsService();

