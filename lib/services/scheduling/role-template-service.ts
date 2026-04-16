import { TemplateManager } from '@/lib/managers/template-manager';
import { connectDB } from '@/lib/db';

export class RoleTemplateService {
  async listRoleTemplates(ctx: any, organizationId: string) {
    await connectDB();
    const templateManager = new TemplateManager();
    const isAdmin = ctx.auth.role === 'admin' || ctx.auth.role === 'super_admin';
    const templates = await templateManager.listRoleTemplates(ctx.auth.sub, isAdmin, organizationId);
    return { templates };
  }

  async createRoleTemplate(ctx: any, body: any) {
    await connectDB();
    const { roleId, organizationId, shiftPattern } = body;
    const templateManager = new TemplateManager();
    const template = await templateManager.createRoleTemplate(
      roleId,
      organizationId,
      {
        dayOfWeek: shiftPattern.dayOfWeek,
        startTime: new Date(shiftPattern.startTime),
        endTime: new Date(shiftPattern.endTime),
        locationId: shiftPattern.locationId as string,
        roleId: (shiftPattern.roleId ?? roleId) as string,
        isRotating: shiftPattern.isRotating || false,
        rotationCycle: shiftPattern.rotationCycle,
        rotationStartDate: shiftPattern.rotationStartDate ? new Date(shiftPattern.rotationStartDate) : undefined,
      },
      ctx.auth.sub,
    );
    return { template };
  }
}

export const roleTemplateService = new RoleTemplateService();

