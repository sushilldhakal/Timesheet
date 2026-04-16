import Award from '@/lib/db/schemas/award';
import { AwardVersionHistory } from '@/lib/db/schemas/award-version-history';

export class AwardVersionsDbQueries {
  static async ensureAwardExists(id: string) {
    return Award.findById(id);
  }

  static async ensureAwardExistsLean(id: string) {
    return Award.findById(id).lean();
  }

  static async findAwardByIdAndUpdate(id: string, update: Record<string, unknown>) {
    return Award.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  }

  static async listHistoryLean(baseAwardId: string) {
    return AwardVersionHistory.find({ baseAwardId }).sort({ effectiveFrom: -1 }).lean();
  }

  static async findHistoryEffectiveForDate(args: { baseAwardId: string; shiftDate: Date }) {
    return AwardVersionHistory.findOne({
      baseAwardId: args.baseAwardId,
      effectiveFrom: { $lte: args.shiftDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: args.shiftDate } }],
    }).sort({ effectiveFrom: -1 });
  }

  static async createHistory(args: Record<string, unknown>) {
    return AwardVersionHistory.create(args);
  }

  static async findHistoryByIdLean(args: { id: string; baseAwardId: string }) {
    return AwardVersionHistory.findOne({ _id: args.id, baseAwardId: args.baseAwardId }).lean();
  }

  static async findHistoryByVersionLean(args: { baseAwardId: string; version: string }) {
    return AwardVersionHistory.findOne({ baseAwardId: args.baseAwardId, version: args.version }).lean();
  }
}

