import mongoose from 'mongoose';
import Award from '@/lib/db/schemas/award';
import { Employee } from '@/lib/db/schemas/employee';
import { scope } from "@/lib/db/tenant-model"

export class AwardsDbQueries {
  static async count(args: { tenantId: string; query: Record<string, unknown> }) {
    const AwardRead = scope(Award as any, args.tenantId, { allowGlobalNullTenantForReads: true })
    return AwardRead.countDocuments(args.query);
  }

  static async listLean(args: {
    tenantId: string
    query: Record<string, unknown>
    page: number
    limit: number
  }) {
    const AwardRead = scope(Award as any, args.tenantId, { allowGlobalNullTenantForReads: true })
    return AwardRead.find(args.query)
      .sort({ name: 1 })
      .skip((args.page - 1) * args.limit)
      .limit(args.limit)
      .lean();
  }

  static async create(args: { tenantId: string; body: any }) {
    const AwardWrite = scope(Award as any, args.tenantId)
    return AwardWrite.create(args.body)
  }

  static async findByIdLean(args: { tenantId: string; id: string }) {
    const AwardRead = scope(Award as any, args.tenantId, { allowGlobalNullTenantForReads: true })
    return AwardRead.findById(args.id).lean();
  }

  static async findByIdAndUpdate(args: { tenantId: string; id: string; body: any }) {
    const AwardWrite = scope(Award as any, args.tenantId)
    return AwardWrite.findByIdAndUpdate(args.id, args.body, { new: true, runValidators: true });
  }

  static async countAssignedEmployees(awardId: string) {
    return Employee.countDocuments({ awardId: new mongoose.Types.ObjectId(awardId) });
  }

  static async deleteById(args: { tenantId: string; id: string }) {
    const AwardWrite = scope(Award as any, args.tenantId)
    return AwardWrite.findByIdAndDelete(args.id);
  }
}

