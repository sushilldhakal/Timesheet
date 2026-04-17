import { apiErrors } from '@/lib/api/api-error';
import { TeamsDbQueries } from '@/lib/db/queries/teams';
import { connectDB, mongoose } from '@/lib/db';

export class TeamService {
  async listTeams(args: { tenantId: string; query: any }) {
    await connectDB();
    const tid = TeamsDbQueries.tenantObjectId(args.tenantId);
    const search = args.query?.search?.trim();
    const isActive = args.query?.isActive;

    const filter: Record<string, unknown> = { tenantId: tid };
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { dbName, counts } = await TeamsDbQueries.countCollectionsIfAvailable();
    let teams: any[] = await TeamsDbQueries.findTeamsLean(filter);

    // Backward/typo compatibility: some environments stored teams in `teans` or `roles`.
    if (teams.length === 0 && counts.teans > 0) {
      try {
        teams = (await TeamsDbQueries.nativeFindFromCollection('teans', filter as any)) as any[];
      } catch {
        /* ignore */
      }
    }
    if (teams.length === 0 && counts.roles > 0) {
      try {
        teams = (await TeamsDbQueries.nativeFindFromCollection('roles', filter as any)) as any[];
      } catch {
        /* ignore */
      }
    }
    if (teams.length === 0 && counts.teams > 0) {
      try {
        teams = (await TeamsDbQueries.nativeFindFromCollection('teams', filter as any)) as any[];
      } catch {
        /* ignore */
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[api/teams GET]', {
        dbName,
        filter,
        mongooseModelCount: teams.length,
        rawCollectionCounts: counts,
      });
    }

    const teamIds = teams.map((r: any) => r._id).filter(Boolean);
    const staffByTeam = new Map<string, number>();
    const managersByTeam = new Map<string, number>();

    if (teamIds.length > 0) {
      const now = new Date();
      const [staffAgg, managerAgg] = await Promise.all([
        TeamsDbQueries.aggregateStaffByTeam(teamIds, now),
        TeamsDbQueries.aggregateManagersByTeam(teamIds),
      ]);
      for (const row of staffAgg as any[]) staffByTeam.set(String(row._id), row.employees?.length ?? 0);
      for (const row of managerAgg as any[]) managersByTeam.set(String(row._id), row.managerCount ?? 0);
    }

    const groupDocById = new Map<string, { name: string; color?: string }>();
    const allGroupIds = [...new Set(teams.map((r: any) => (r.groupId ? String(r.groupId) : '')).filter(Boolean))];
    if (allGroupIds.length > 0) {
      const oids = allGroupIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
      const groupDocs = await TeamsDbQueries.findTeamGroupsByIdsLean(oids);
      for (const g of groupDocs as any[]) groupDocById.set(String(g._id), { name: g.name, color: g.color });
    }

    return {
      teams: teams.map((r: any) => {
        const id = r._id.toString();
        const gid = r.groupId ? String(r.groupId) : '';
        const gInfo = gid ? groupDocById.get(gid) : undefined;
        return {
          id,
          name: r.name,
          code: r.code,
          color: r.color,
          groupId: r.groupId?.toString(),
          order: r.order ?? 0,
          groupSnapshot: r.groupSnapshot?.name != null ? { name: r.groupSnapshot.name } : undefined,
          groupName: gInfo?.name ?? (r.groupSnapshot?.name as string | undefined),
          groupColor: gInfo?.color,
          staffCount: staffByTeam.get(id) ?? 0,
          managerCount: managersByTeam.get(id) ?? 0,
          defaultScheduleTemplate: r.defaultScheduleTemplate,
          isActive: r.isActive ?? true,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        };
      }),
    };
  }

  async createTeam(args: { tenantId: string; userId: string; body: any }) {
    await connectDB();
    const payload = args.body;
    const tid = TeamsDbQueries.tenantObjectId(args.tenantId);

    const existing = await TeamsDbQueries.findTeamByNameInsensitiveLean({ tenantId: tid, name: payload.name });
    if (existing) throw apiErrors.conflict('A team with this name already exists');

    let groupSnapshot: { name?: string } | undefined;
    if (payload.groupId && mongoose.Types.ObjectId.isValid(payload.groupId)) {
      const g = await TeamsDbQueries.findTeamGroupByIdSelectLean(payload.groupId, 'name');
      if ((g as any)?.name) groupSnapshot = { name: (g as any).name };
    }

    const created = await TeamsDbQueries.createTeam({
      tenantId: tid,
      name: payload.name.trim(),
      code: payload.code,
      color: payload.color,
      groupId: payload.groupId && mongoose.Types.ObjectId.isValid(payload.groupId) ? new mongoose.Types.ObjectId(payload.groupId) : undefined,
      order: payload.order ?? 0,
      groupSnapshot,
      defaultScheduleTemplate: payload.defaultScheduleTemplate,
      isActive: payload.isActive ?? true,
      createdBy: args.userId,
    });

    let groupName: string | undefined;
    let groupColor: string | undefined;
    if ((created as any).groupId) {
      const g = await TeamsDbQueries.findTeamGroupByIdSelectLean((created as any).groupId, ['name', 'color']);
      if (g) {
        groupName = (g as any).name;
        groupColor = (g as any).color;
      }
    }

    return {
      team: {
        id: (created as any)._id.toString(),
        name: (created as any).name,
        code: (created as any).code,
        color: (created as any).color,
        groupId: (created as any).groupId?.toString(),
        order: (created as any).order ?? 0,
        groupSnapshot: (created as any).groupSnapshot?.name != null ? { name: (created as any).groupSnapshot.name } : undefined,
        groupName,
        groupColor,
        defaultScheduleTemplate: (created as any).defaultScheduleTemplate,
        isActive: (created as any).isActive ?? true,
        createdAt: (created as any).createdAt ? (created as any).createdAt.toISOString() : null,
        updatedAt: (created as any).updatedAt ? (created as any).updatedAt.toISOString() : null,
      },
    };
  }

  async getTeam(args: { tenantId: string; id: string }) {
    await connectDB();
    const tid = TeamsDbQueries.tenantObjectId(args.tenantId);
    const team = await TeamsDbQueries.findTeamForTenantLean({ id: args.id, tenantId: tid });
    if (!team) throw apiErrors.notFound('Team not found');

    let groupName: string | undefined;
    let groupColor: string | undefined;
    if ((team as any).groupId) {
      const g = await TeamsDbQueries.findTeamGroupByIdSelectLean((team as any).groupId, ['name', 'color']);
      if (g) {
        groupName = (g as any).name;
        groupColor = (g as any).color;
      }
    }

    return {
      team: {
        id: (team as any)._id.toString(),
        name: (team as any).name,
        code: (team as any).code,
        color: (team as any).color,
        groupId: (team as any).groupId?.toString(),
        order: (team as any).order ?? 0,
        groupName,
        groupColor,
        isActive: (team as any).isActive ?? true,
        createdAt: (team as any).createdAt ? new Date((team as any).createdAt).toISOString() : null,
        updatedAt: (team as any).updatedAt ? new Date((team as any).updatedAt).toISOString() : null,
      },
    };
  }

  async updateTeam(args: { tenantId: string; id: string; body: any }) {
    await connectDB();
    const tid = TeamsDbQueries.tenantObjectId(args.tenantId);
    const team = await TeamsDbQueries.findTeamForTenant({ id: args.id, tenantId: tid });
    if (!team) throw apiErrors.notFound('Team not found');

    const payload = args.body;
    if (payload.name && payload.name.trim() !== (team as any).name) {
      const existing = await TeamsDbQueries.findTeamByNameInsensitiveLean({ tenantId: tid, name: payload.name });
      if (existing && String((existing as any)._id) !== String((team as any)._id)) {
        throw apiErrors.badRequest('A team with this name already exists');
      }
    }

    const updated = await TeamsDbQueries.updateTeamByIdLean((team as any)._id, {
      ...(payload.name && { name: payload.name.trim() }),
      ...(payload.code !== undefined && { code: payload.code || undefined }),
      ...(payload.color !== undefined && { color: payload.color || undefined }),
      ...(payload.groupId !== undefined && {
        groupId: payload.groupId && mongoose.Types.ObjectId.isValid(payload.groupId) ? new mongoose.Types.ObjectId(payload.groupId) : undefined,
      }),
      ...(payload.order !== undefined && { order: payload.order }),
      ...(payload.defaultScheduleTemplate !== undefined && {
        defaultScheduleTemplate: payload.defaultScheduleTemplate || undefined,
      }),
      ...(payload.isActive !== undefined && { isActive: payload.isActive }),
    });
    if (!updated) throw apiErrors.notFound('Failed to update team');

    let groupName: string | undefined;
    let groupColor: string | undefined;
    if ((updated as any).groupId) {
      const g = await TeamsDbQueries.findTeamGroupByIdSelectLean((updated as any).groupId, ['name', 'color']);
      if (g) {
        groupName = (g as any).name;
        groupColor = (g as any).color;
      }
    }

    return {
      team: {
        id: (updated as any)._id.toString(),
        name: (updated as any).name,
        code: (updated as any).code,
        color: (updated as any).color,
        groupId: (updated as any).groupId?.toString(),
        order: (updated as any).order ?? 0,
        groupName,
        groupColor,
        defaultScheduleTemplate: (updated as any).defaultScheduleTemplate,
        isActive: (updated as any).isActive ?? true,
        createdAt: (updated as any).createdAt ? new Date((updated as any).createdAt).toISOString() : null,
        updatedAt: (updated as any).updatedAt ? new Date((updated as any).updatedAt).toISOString() : null,
      },
    };
  }
}

export const teamService = new TeamService();

