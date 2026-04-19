import { apiErrors } from '@/lib/api/api-error';
import { UsersDbQueries } from '@/lib/db/queries/users';
import { canCreateUser, isAdminOrSuperAdmin, isSuperAdmin } from '@/lib/config/roles';
import { userAdminUpdateSchema, userSelfUpdateSchema } from '@/lib/validations/user';
import mongoose from "mongoose";
import { connectDB } from '@/lib/db';

export class UserService {
  async listUsers(args: { ctx: any }) {
    await connectDB();
    const { ctx } = args;
    const auth = ctx.auth;
    const tid = UsersDbQueries.tenantObjectId(ctx.tenantId);

    let query: any = { tenantId: tid, role: { $ne: 'super_admin' } };
    if (auth.role === 'admin' || auth.role === 'super_admin') {
      // no-op
    } else if (auth.role === 'manager') {
      const authUser = await UsersDbQueries.findUserByIdLean(auth.sub, 'location');
      if (!authUser) throw apiErrors.unauthorized('Authentication user not found');
      const authLocations = Array.isArray((authUser as any).location)
        ? (authUser as any).location
        : (authUser as any).location
          ? [(authUser as any).location]
          : [];
      query = { ...query, role: 'supervisor', location: { $in: authLocations } };
    } else {
      return { data: { users: [] } };
    }

    const users = await UsersDbQueries.listUsersLean(query);
    const normalized = (users as any[]).map((u) => ({
      id: u._id.toString(),
      name: u.name ?? '',
      email: u.email ?? '',
      role: u.role,
      location: Array.isArray(u.location) ? u.location : u.location ? [String(u.location)] : [],
      rights: u.rights ?? [],
      managedRoles: u.managedRoles ?? [],
      teamIds: Array.isArray(u.teamIds) ? u.teamIds.map((x: unknown) => String(x)) : [],
      createdAt: u.createdAt,
    }));
    return { data: { users: normalized } };
  }

  async createUser(args: { ctx: any; body: any }) {
    await connectDB();
    const { ctx, body } = args;
    const auth = ctx.auth;
    const tid = UsersDbQueries.tenantObjectId(ctx.tenantId);

    if (!canCreateUser(auth.role, body?.role || 'user')) throw apiErrors.forbidden('Forbidden: Cannot create user with this role');

    const { name, email, password, role, location, managedRoles, teamIds, employeeId } = body;
    if (!name || !email || !password || !role) throw apiErrors.badRequest('Name, email, password, and role are required');

    const existingEmail = await UsersDbQueries.findByTenantEmailLean({ tenantId: tid, email });
    if (existingEmail) throw apiErrors.conflict('Email already exists');

    if (auth.role === 'manager' && role === 'supervisor') {
      const authUser = await UsersDbQueries.findUserByIdLean(auth.sub, 'location');
      if (!authUser) throw apiErrors.unauthorized('Authentication user not found');
      const authLocations = Array.isArray((authUser as any).location)
        ? (authUser as any).location
        : (authUser as any).location
          ? [(authUser as any).location]
          : [];
      const targetLocations = location || [];
      const isSubset = targetLocations.every((loc: string) => authLocations.includes(loc));
      if (!isSubset) throw apiErrors.forbidden('Cannot assign locations outside your scope');
    }

    let userPassword = password;
    if (employeeId) {
      const employee = await UsersDbQueries.findEmployeeByIdWithPassword(employeeId);
      if (!employee) throw apiErrors.notFound('Employee not found');
      if (email && (employee as any).email?.toLowerCase() !== email.toLowerCase()) throw apiErrors.badRequest('Email must match employee email');
      if (!(employee as any).password) throw apiErrors.badRequest('Employee must have a password set to be promoted');
      userPassword = (employee as any).password;
    }
    if (!userPassword) throw apiErrors.badRequest('Password is required');

    const now = Math.floor(Date.now() / 1000);
    const user = await UsersDbQueries.createUser({
      tenantId: tid,
      name: name.trim(),
      email: email.toLowerCase(),
      password: userPassword,
      role: role ?? 'user',
      location: location ?? [],
      rights: [],
      managedRoles: managedRoles ?? [],
      teamIds: teamIds && teamIds.length > 0 ? teamIds.map((t: string) => new mongoose.Types.ObjectId(t)) : [],
      createdBy: auth.sub,
      createdAt: now,
      updatedAt: now,
    });

    return {
      data: {
        user: {
          id: (user as any)._id.toString(),
          name: (user as any).name,
          email: (user as any).email,
          role: (user as any).role,
          location: (user as any).location ?? [],
          rights: (user as any).rights ?? [],
          managedRoles: (user as any).managedRoles ?? [],
          teamIds: Array.isArray((user as any).teamIds) ? (user as any).teamIds.map((x: unknown) => String(x)) : [],
          createdBy: (user as any).createdBy,
          createdAt: (user as any).createdAt,
        },
      }
    };
  }

  async getUser(args: { ctx: any; id: string }) {
    await connectDB();
    const { ctx, id } = args;
    const auth = ctx.auth;
    if (!isAdminOrSuperAdmin(auth.role) && auth.sub !== id) throw apiErrors.forbidden('Forbidden');

    const user = await UsersDbQueries.findUserByIdLean(id, '-password');
    if (!user) throw apiErrors.notFound('User not found');
    if (String((user as any).tenantId) !== ctx.tenantId) throw apiErrors.forbidden('Unauthorized');
    if ((user as any).role === 'super_admin' && !isSuperAdmin(auth.role)) throw apiErrors.notFound('User not found');

    const location = Array.isArray((user as any).location) ? (user as any).location : (user as any).location ? [String((user as any).location)] : [];
    return {
      data: {
        user: {
          id: (user as any)._id,
          name: (user as any).name ?? '',
          email: (user as any).email ?? '',
          role: (user as any).role,
          location,
          rights: (user as any).rights ?? [],
          managedRoles: (user as any).managedRoles ?? [],
          teamIds: Array.isArray((user as any).teamIds) ? (user as any).teamIds.map((x: unknown) => String(x)) : [],
          createdAt: (user as any).createdAt,
        },
      }
    };
  }

  async updateUser(args: { ctx: any; id: string; body: any }) {
    await connectDB();
    const { ctx, id, body } = args;
    const auth = ctx.auth;
    const isSelf = auth.sub === id;
    const isAdminOrSuper = isAdminOrSuperAdmin(auth.role);
    if (!isAdminOrSuper && !isSelf) throw apiErrors.forbidden('Forbidden');

    const existing = await UsersDbQueries.findUserById(id, '+password');
    if (!existing) throw apiErrors.notFound('User not found');
    if (String((existing as any).tenantId) !== ctx.tenantId) throw apiErrors.forbidden('Unauthorized');
    if ((existing as any).role === 'super_admin' && !isSuperAdmin(auth.role)) throw apiErrors.forbidden('Forbidden');

    if (isAdminOrSuper) {
      const parsedUpdate = userAdminUpdateSchema.safeParse(body);
      if (!parsedUpdate.success) throw apiErrors.badRequest('Validation failed', parsedUpdate.error.flatten().fieldErrors);

      const { name, email, password, role, location, managedRoles, teamIds } = parsedUpdate.data as any;
      if (email !== undefined) {
        const duplicate = await UsersDbQueries.findByTenantEmailLean({ tenantId: (existing as any).tenantId, email, idNe: id });
        if (duplicate) throw apiErrors.conflict('Email already exists');
        (existing as any).email = email.toLowerCase();
      }
      if (name !== undefined) (existing as any).name = name.trim();
      if (password) (existing as any).password = password;
      if (role !== undefined) (existing as any).role = role;
      if (location !== undefined) (existing as any).location = location;
      if (managedRoles !== undefined) (existing as any).managedRoles = managedRoles;
      if (teamIds !== undefined) (existing as any).teamIds = teamIds.map((tid: string) => new mongoose.Types.ObjectId(tid));

      await (existing as any).save();
      const u = await UsersDbQueries.findUserByIdLean(id, '-password');
      const loc = (u as any)?.location;
      const locArr = Array.isArray(loc) ? loc : loc ? [String(loc)] : [];
      return {
        data: {
          user: {
            id: (u as any)?._id,
            name: (u as any)?.name ?? '',
            email: (u as any)?.email ?? '',
            role: (u as any)?.role,
            location: locArr,
            rights: (u as any)?.rights ?? [],
            managedRoles: (u as any)?.managedRoles ?? [],
            teamIds: Array.isArray((u as any)?.teamIds) ? (u as any).teamIds.map((x: unknown) => String(x)) : [],
          },
        }
      };
    }

    const parsedSelf = userSelfUpdateSchema.safeParse(body);
    if (!parsedSelf.success) throw apiErrors.badRequest('Validation failed', parsedSelf.error.flatten().fieldErrors);
    const { email: newEmail, password } = parsedSelf.data as any;
    if (newEmail) {
      const emailDuplicate = await UsersDbQueries.findByTenantEmailLean({ tenantId: (existing as any).tenantId, email: newEmail, idNe: id });
      if (emailDuplicate) throw apiErrors.conflict('Email already exists');
      (existing as any).email = newEmail.toLowerCase();
    }
    if (password) (existing as any).password = password;
    await (existing as any).save();

    const u = await UsersDbQueries.findUserByIdLean(id, '-password');
    const loc = (u as any)?.location;
    const locArr = Array.isArray(loc) ? loc : loc ? [String(loc)] : [];
    return {
      data: {
        user: {
          id: (u as any)?._id,
          name: (u as any)?.name ?? '',
          email: (u as any)?.email ?? '',
          role: (u as any)?.role,
          location: locArr,
          rights: (u as any)?.rights ?? [],
        },
      }
    };
  }

  async deleteUser(args: { ctx: any; id: string }) {
    await connectDB();
    const { ctx, id } = args;
    const auth = ctx.auth;
    if (!isAdminOrSuperAdmin(auth.role)) throw apiErrors.forbidden('Forbidden');
    if (auth.sub === id) throw apiErrors.badRequest('Cannot delete your own account');

    const target = await UsersDbQueries.findUserByIdLean(id, 'role tenantId');
    if (!target) throw apiErrors.notFound('User not found');
    if (String((target as any).tenantId) !== ctx.tenantId) throw apiErrors.forbidden('Unauthorized');
    if ((target as any).role === 'super_admin' && !isSuperAdmin(auth.role)) throw apiErrors.forbidden('Forbidden');

    await UsersDbQueries.deleteUserById(id);
    return { data: { success: true } };
  }
}

export const userService = new UserService();

