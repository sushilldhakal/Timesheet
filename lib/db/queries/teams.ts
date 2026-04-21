import { mongoose, Team, TeamGroup } from '@/lib/db';
import { EmployeeRoleAssignment } from '@/lib/db/schemas/employee-role-assignment';
import { User } from '@/lib/db/schemas/user';
import { SUPER_ADMIN_SENTINEL } from '@/lib/auth/auth-constants';

export class TeamsDbQueries {
  static tenantObjectId(tenantId: string) {
    // Super admin sentinel value is not a valid ObjectId
    if (tenantId === SUPER_ADMIN_SENTINEL) {
      return null;
    }
    return new mongoose.Types.ObjectId(tenantId);
  }

  static async countCollectionsIfAvailable() {
    const db = mongoose.connection.db;
    if (!db) return { dbName: '(no db)', counts: { teams: -1, roles: -1, teans: -1 } };
    const dbName = db.databaseName ?? '(no db)';
    try {
      const [teams, roles, teans] = await Promise.all([
        db.collection('teams').countDocuments({}),
        db.collection('roles').countDocuments({}),
        db.collection('teans').countDocuments({}),
      ]);
      return { dbName, counts: { teams, roles, teans } };
    } catch {
      return { dbName, counts: { teams: -1, roles: -1, teans: -1 } };
    }
  }

  static async findTeamsLean(filter: Record<string, unknown>) {
    return Team.find(filter).sort({ order: 1, name: 1 }).lean();
  }

  static async nativeFindFromCollection(collection: 'teams' | 'roles' | 'teans', filter: Record<string, unknown>) {
    return mongoose.connection.collection(collection).find(filter).sort({ order: 1, name: 1 }).toArray();
  }

  static async aggregateStaffByTeam(teamIds: any[], now: Date) {
    return EmployeeRoleAssignment.aggregate([
      {
        $match: {
          roleId: { $in: teamIds },
          validFrom: { $lte: now },
          $or: [{ validTo: null }, { validTo: { $gte: now } }],
        },
      },
      { $group: { _id: '$roleId', employees: { $addToSet: '$employeeId' } } },
    ]);
  }

  static async aggregateManagersByTeam(teamIds: any[]) {
    return User.aggregate([
      { $match: { role: { $in: ['manager', 'supervisor'] }, managedRoleIds: { $exists: true, $ne: [] } } },
      { $unwind: '$managedRoleIds' },
      { $match: { managedRoleIds: { $in: teamIds } } },
      { $group: { _id: '$managedRoleIds', managerCount: { $sum: 1 } } },
    ]);
  }

  static async findTeamGroupsByIdsLean(objectIds: any[]) {
    return TeamGroup.find({ _id: { $in: objectIds } }).select(['name', 'color']).lean();
  }

  static async findTeamByNameInsensitiveLean(args: { tenantId: any; name: string }) {
    return Team.findOne({ tenantId: args.tenantId, name: { $regex: new RegExp(`^${args.name.trim()}$`, 'i') } }).lean();
  }

  static async createTeam(args: any) {
    return Team.create(args);
  }

  static async findTeamForTenant(args: { id: string; tenantId: any }) {
    return Team.findOne({ _id: new mongoose.Types.ObjectId(args.id), tenantId: args.tenantId });
  }

  static async findTeamForTenantLean(args: { id: string; tenantId: any }) {
    return Team.findOne({ _id: new mongoose.Types.ObjectId(args.id), tenantId: args.tenantId }).lean();
  }

  static async updateTeamByIdLean(id: any, update: any) {
    return Team.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  static async findTeamGroupByIdLean(id: string) {
    return TeamGroup.findById(id).lean();
  }

  static async findTeamGroupByIdSelectLean(id: any, fields: any) {
    return TeamGroup.findById(id).select(fields).lean();
  }

  static async findTeamGroupDupByNameLean(args: { tenantId: any; idNe?: string; name: string }) {
    return TeamGroup.findOne({
      tenantId: args.tenantId,
      ...(args.idNe ? { _id: { $ne: args.idNe } } : {}),
      name: { $regex: new RegExp(`^${args.name.trim()}$`, 'i') },
    }).lean();
  }

  static async listTeamGroupsLean(filter: Record<string, unknown>) {
    return TeamGroup.find(filter).sort({ order: 1, name: 1 }).lean();
  }

  static async createTeamGroup(args: any) {
    return TeamGroup.create(args);
  }

  static async updateTeamGroupByIdLean(id: string, update: any) {
    return TeamGroup.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  }

  static async findTeamGroupById(id: string) {
    return TeamGroup.findById(id);
  }

  static async countTeamsByGroupId(groupId: string) {
    return Team.countDocuments({ groupId });
  }
}

