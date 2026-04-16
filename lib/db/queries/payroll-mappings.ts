import { PayrollMapping } from "@/lib/db/schemas/payroll-mapping";

export class PayrollMappingsDbQueries {
  static async listLean(filter: Record<string, unknown>) {
    return PayrollMapping.find(filter).sort({ isDefault: -1, updatedAt: -1 }).lean();
  }

  static async unsetDefaults(args: { tenantId: string; payrollSystemType: string; excludeId?: any }) {
    return PayrollMapping.updateMany(
      {
        tenantId: args.tenantId,
        payrollSystemType: args.payrollSystemType,
        isDefault: true,
        ...(args.excludeId && { _id: { $ne: args.excludeId } }),
      },
      { isDefault: false }
    );
  }

  static async create(args: any) {
    return PayrollMapping.create(args);
  }

  static async findOneLean(filter: Record<string, unknown>) {
    return PayrollMapping.findOne(filter).lean();
  }

  static async findOne(filter: Record<string, unknown>) {
    return PayrollMapping.findOne(filter);
  }

  static async updateByIdLean(id: any, update: any) {
    return PayrollMapping.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  }

  static async deleteById(id: any) {
    return PayrollMapping.findByIdAndDelete(id);
  }
}

