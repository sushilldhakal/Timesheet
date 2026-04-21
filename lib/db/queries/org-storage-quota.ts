import OrgStorageQuota, { IOrgStorageQuota } from "../schemas/org-storage-quota";
import mongoose from "mongoose";

export class OrgStorageQuotaRepo {
  static async findByOrgId(orgId: string | mongoose.Types.ObjectId): Promise<IOrgStorageQuota | null> {
    return OrgStorageQuota.findOne({ orgId }).lean() as unknown as IOrgStorageQuota | null;
  }

  static async findMany(filter: any = {}): Promise<IOrgStorageQuota[]> {
    return OrgStorageQuota.find(filter).lean() as unknown as IOrgStorageQuota[];
  }

  static async create(data: Partial<IOrgStorageQuota>): Promise<IOrgStorageQuota> {
    const quota = new OrgStorageQuota(data);
    return quota.save();
  }

  static async upsert(
    orgId: string | mongoose.Types.ObjectId,
    update: Partial<IOrgStorageQuota>
  ): Promise<IOrgStorageQuota> {
    const result = await OrgStorageQuota.findOneAndUpdate({ orgId }, { $set: update }, { new: true, upsert: true });
    return result!;
  }

  static async updateByOrgId(
    orgId: string | mongoose.Types.ObjectId,
    update: Partial<IOrgStorageQuota>
  ): Promise<IOrgStorageQuota | null> {
    return OrgStorageQuota.findOneAndUpdate({ orgId }, { $set: update }, { new: true }).lean() as unknown as IOrgStorageQuota | null;
  }

  static async incrementUsedBytes(orgId: string | mongoose.Types.ObjectId, bytes: number): Promise<void> {
    await OrgStorageQuota.updateOne({ orgId }, { $inc: { usedBytes: bytes } });
  }

  static async decrementUsedBytes(orgId: string | mongoose.Types.ObjectId, bytes: number): Promise<void> {
    await OrgStorageQuota.updateOne({ orgId }, { $inc: { usedBytes: -bytes }, $max: { usedBytes: 0 } });
  }

  static async deleteByOrgId(orgId: string | mongoose.Types.ObjectId): Promise<void> {
    await OrgStorageQuota.deleteOne({ orgId });
  }
}
