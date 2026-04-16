import { PayrollMappingsDbQueries } from "@/lib/db/queries/payroll-mappings";
import { connectDB } from "@/lib/db";

export class PayrollMappingsService {
  async list(ctx: any, query: any) {
    await connectDB();
    const filter: Record<string, unknown> = { tenantId: ctx.tenantId };
    if (query?.payrollSystemType) filter.payrollSystemType = query.payrollSystemType;
    const mappings = await PayrollMappingsDbQueries.listLean(filter);
    return { mappings };
  }

  async create(ctx: any, body: any) {
    await connectDB();
    if (body?.isDefault) {
      await PayrollMappingsDbQueries.unsetDefaults({
        tenantId: ctx.tenantId,
        payrollSystemType: body.payrollSystemType,
      });
    }
    const mapping = await PayrollMappingsDbQueries.create({ ...body, tenantId: ctx.tenantId });
    return { mapping };
  }

  async get(ctx: any, id: string) {
    await connectDB();
    const mapping = await PayrollMappingsDbQueries.findOneLean({ _id: id, tenantId: ctx.tenantId });
    if (!mapping) return { status: 404, data: { error: "Payroll mapping not found" } };
    return { status: 200, data: { mapping } };
  }

  async update(ctx: any, id: string, body: any) {
    await connectDB();
    const existing = await PayrollMappingsDbQueries.findOne({ _id: id, tenantId: ctx.tenantId });
    if (!existing) return { status: 404, data: { error: "Payroll mapping not found" } };

    if (body?.isDefault) {
      await PayrollMappingsDbQueries.unsetDefaults({
        tenantId: ctx.tenantId,
        payrollSystemType: (existing as any).payrollSystemType,
        excludeId: (existing as any)._id,
      });
    }

    const mapping = await PayrollMappingsDbQueries.updateByIdLean(id, { $set: body });
    return { status: 200, data: { mapping } };
  }

  async remove(ctx: any, id: string) {
    await connectDB();
    const mapping = await PayrollMappingsDbQueries.findOne({ _id: id, tenantId: ctx.tenantId });
    if (!mapping) return { status: 404, data: { error: "Payroll mapping not found" } };
    if ((mapping as any).isDefault) {
      return { status: 400, data: { error: "Cannot delete default payroll mapping. Unset it as default first." } };
    }
    await PayrollMappingsDbQueries.deleteById(id);
    return { status: 200, data: { message: "Payroll mapping deleted" } };
  }
}

export const payrollMappingsService = new PayrollMappingsService();

