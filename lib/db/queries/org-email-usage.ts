import OrgEmailUsage, { IOrgEmailUsage } from "../schemas/org-email-usage";
import mongoose from "mongoose";

export class OrgEmailUsageRepo {
  static async findByOrgId(orgId: string | mongoose.Types.ObjectId): Promise<IOrgEmailUsage | null> {
    return OrgEmailUsage.findOne({ orgId }).lean() as unknown as IOrgEmailUsage | null;
  }

  static async findMany(filter: any = {}): Promise<IOrgEmailUsage[]> {
    return OrgEmailUsage.find(filter).lean() as unknown as IOrgEmailUsage[];
  }

  static async create(data: {
    orgId: string | mongoose.Types.ObjectId
    sentCount?: number
    quotaMonthly: number
    periodStart: Date
  }): Promise<IOrgEmailUsage> {
    const usage = new OrgEmailUsage(data);
    return usage.save();
  }

  static async upsert(
    orgId: string | mongoose.Types.ObjectId,
    update: Partial<IOrgEmailUsage>
  ): Promise<IOrgEmailUsage> {
    const result = await OrgEmailUsage.findOneAndUpdate({ orgId }, { $set: update }, { new: true, upsert: true });
    return result!;
  }

  static async updateByOrgId(
    orgId: string | mongoose.Types.ObjectId,
    update: Partial<IOrgEmailUsage>
  ): Promise<IOrgEmailUsage | null> {
    return OrgEmailUsage.findOneAndUpdate({ orgId }, { $set: update }, { new: true }).lean() as unknown as IOrgEmailUsage | null;
  }

  static async incrementSentCount(orgId: string | mongoose.Types.ObjectId): Promise<void> {
    await OrgEmailUsage.updateOne({ orgId }, { $inc: { sentCount: 1 } });
  }

  static async resetSentCount(orgId: string | mongoose.Types.ObjectId, periodStart: Date): Promise<void> {
    await OrgEmailUsage.updateOne({ orgId }, { $set: { sentCount: 0, periodStart } });
  }

  static async deleteByOrgId(orgId: string | mongoose.Types.ObjectId): Promise<void> {
    await OrgEmailUsage.deleteOne({ orgId });
  }
}
