import { apiErrors } from '@/lib/api/api-error';
import { TeamsDbQueries } from '@/lib/db/queries/teams';
import { connectDB, mongoose } from '@/lib/db';

export class TeamGroupService {
  async listTeamGroups(args: { tenantId: string; query: any }) {
    await connectDB();
    const tid = TeamsDbQueries.tenantObjectId(args.tenantId);
    const search = args.query?.search?.trim();
    const isActive = args.query?.isActive;

    // Super admin sees all team groups across all tenants
    const filter: Record<string, unknown> = tid ? { tenantId: tid } : {};
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const teamGroups = await TeamsDbQueries.listTeamGroupsLean(filter);
    return {
      teamGroups: (teamGroups as any[]).map((group) => ({
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        color: group.color,
        order: group.order ?? 0,
        isActive: group.isActive ?? true,
        createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : null,
        updatedAt: group.updatedAt ? new Date(group.updatedAt).toISOString() : null,
      })),
    };
  }

  async createTeamGroup(args: { tenantId: string; body: any }) {
    await connectDB();
    const tid = TeamsDbQueries.tenantObjectId(args.tenantId);
    const payload = args.body;

    const existing = await TeamsDbQueries.findTeamGroupDupByNameLean({ tenantId: tid, name: payload.name });
    if (existing) throw apiErrors.conflict('A team group with this name already exists');

    const created = await TeamsDbQueries.createTeamGroup({
      ...payload,
      tenantId: tid,
      name: payload.name.trim(),
      order: payload.order ?? 0,
    });

    return {
      teamGroup: {
        id: (created as any)._id.toString(),
        name: (created as any).name,
        description: (created as any).description,
        color: (created as any).color,
        order: (created as any).order ?? 0,
        isActive: (created as any).isActive ?? true,
        createdAt: (created as any).createdAt ? (created as any).createdAt.toISOString() : null,
        updatedAt: (created as any).updatedAt ? (created as any).updatedAt.toISOString() : null,
      },
    };
  }

  async getTeamGroup(args: { tenantId: string; id: string }) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(args.id)) throw apiErrors.badRequest('Invalid team group ID');
    const doc = await TeamsDbQueries.findTeamGroupByIdLean(args.id);
    if (!doc) throw apiErrors.notFound('Team group not found');
    if (String((doc as any).tenantId) !== args.tenantId) throw apiErrors.forbidden('Unauthorized');

    return {
      teamGroup: {
        id: (doc as any)._id.toString(),
        name: (doc as any).name,
        description: (doc as any).description,
        color: (doc as any).color,
        order: (doc as any).order ?? 0,
        isActive: (doc as any).isActive ?? true,
        createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : null,
        updatedAt: (doc as any).updatedAt ? new Date((doc as any).updatedAt).toISOString() : null,
      },
    };
  }

  async updateTeamGroup(args: { tenantId: string; id: string; body: any }) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(args.id)) throw apiErrors.badRequest('Invalid team group ID');

    const existing = await TeamsDbQueries.findTeamGroupByIdLean(args.id);
    if (!existing) throw apiErrors.notFound('Team group not found');
    if (String((existing as any).tenantId) !== args.tenantId) throw apiErrors.forbidden('Unauthorized');

    const payload = args.body;
    if (payload.name) {
      const dup = await TeamsDbQueries.findTeamGroupDupByNameLean({
        tenantId: (existing as any).tenantId,
        idNe: args.id,
        name: payload.name,
      });
      if (dup) throw apiErrors.conflict('A team group with this name already exists');
    }

    const updated = await TeamsDbQueries.updateTeamGroupByIdLean(args.id, {
      ...payload,
      ...(payload.name && { name: payload.name.trim() }),
    });
    if (!updated) throw apiErrors.notFound('Team group not found');

    return {
      teamGroup: {
        id: (updated as any)._id.toString(),
        name: (updated as any).name,
        description: (updated as any).description,
        color: (updated as any).color,
        order: (updated as any).order ?? 0,
        isActive: (updated as any).isActive ?? true,
        createdAt: (updated as any).createdAt ? new Date((updated as any).createdAt).toISOString() : null,
        updatedAt: (updated as any).updatedAt ? new Date((updated as any).updatedAt).toISOString() : null,
      },
    };
  }

  async deleteTeamGroup(args: { tenantId: string; id: string }) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(args.id)) throw apiErrors.badRequest('Invalid team group ID');

    const doc = await TeamsDbQueries.findTeamGroupById(args.id);
    if (!doc) throw apiErrors.notFound('Team group not found');
    if (String((doc as any).tenantId) !== args.tenantId) throw apiErrors.forbidden('Unauthorized');

    const assignedTeams = await TeamsDbQueries.countTeamsByGroupId(args.id);
    if (assignedTeams > 0) {
      throw apiErrors.conflict(
        `Cannot delete this team group. ${assignedTeams} team(s) are assigned to it. Please reassign them first.`
      );
    }

    await (doc as any).deleteOne();
    return { success: true };
  }
}

export const teamGroupService = new TeamGroupService();

