import { SchedulingTemplateManager } from '@/lib/managers/scheduling-template-manager';
import { connectDB } from '@/lib/db';

export class RosterWeekTemplateService {
  async listForUser(ctx: any) {
    await connectDB();
    const isAdmin = ctx.auth.role === 'admin' || ctx.auth.role === 'super_admin';
    const mgr = new SchedulingTemplateManager();
    const templates = await mgr.listForUser(ctx.auth.sub, isAdmin);
    return { templates };
  }

  async createFromWeek(args: {
    ctx: any;
    body: any;
    assertUserLocationAccess: (ctx: any, locationId: string) => Promise<any>;
    assertManagerSchedulingScope: (ctx: any, locationId: string, roleIds: string[]) => Promise<any>;
  }) {
    await connectDB();
    const { ctx, body } = args;
    const roleIds = body.roleIds ?? [];

    const locOk = await args.assertUserLocationAccess(ctx, body.locationId);
    if (!locOk.ok) return { status: locOk.status, data: { error: locOk.error } };

    if (roleIds.length > 0) {
      const scope = await args.assertManagerSchedulingScope(ctx, body.locationId, roleIds);
      if (!scope.ok) return { status: scope.status, data: { error: scope.error } };
    }

    const isAdmin = ctx.auth.role === 'admin' || ctx.auth.role === 'super_admin';
    if (body.isGlobal && !isAdmin) {
      return { status: 403, data: { error: 'Only admins can create global templates' } };
    }

    const mgr = new SchedulingTemplateManager();
    const template = await mgr.createFromWeek({
      name: body.name,
      weekId: body.weekId,
      locationId: body.locationId,
      roleIds,
      createdBy: ctx.auth.sub,
      isGlobal: body.isGlobal,
    });
    return { status: 201, data: { template } };
  }

  async deleteTemplate(args: { ctx: any; id: string }) {
    await connectDB();
    const isAdmin = args.ctx.auth.role === 'admin' || args.ctx.auth.role === 'super_admin';
    const mgr = new SchedulingTemplateManager();
    const { deleted } = await mgr.deleteTemplate(args.id, args.ctx.auth.sub, isAdmin);
    if (!deleted) return { status: 404, data: { error: 'Not found' } };
    return { status: 200, data: { ok: true } };
  }

  async applyTemplate(args: {
    ctx: any;
    templateId: string;
    body: any;
    assertUserLocationAccess: (ctx: any, locationId: string) => Promise<any>;
    assertManagerSchedulingScope: (ctx: any, locationId: string, roleIds: string[]) => Promise<any>;
  }) {
    await connectDB();
    const { ctx, templateId, body } = args;
    const locOk = await args.assertUserLocationAccess(ctx, body.locationId);
    if (!locOk.ok) return { status: locOk.status, data: { error: locOk.error } };

    const roleIds = body.roleIds ?? [];
    if (roleIds.length > 0) {
      const scope = await args.assertManagerSchedulingScope(ctx, body.locationId, roleIds);
      if (!scope.ok) return { status: scope.status, data: { error: scope.error } };
    }

    const mgr = new SchedulingTemplateManager();
    const result = await mgr.applyTemplate({
      templateId,
      targetWeekId: body.targetWeekId,
      mode: body.mode,
      locationId: body.locationId,
      roleIds,
    });
    return { status: 200, data: result };
  }
}

export const rosterWeekTemplateService = new RosterWeekTemplateService();

