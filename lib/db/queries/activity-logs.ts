import { ActivityLog } from "@/lib/db/schemas/activity-log";

export class ActivityLogsDbQueries {
  static async listLean(args: { category: string; skip: number; limit: number }) {
    return ActivityLog.find({ category: args.category })
      .sort({ createdAt: -1 })
      .skip(args.skip)
      .limit(args.limit)
      .lean();
  }

  static async count(category: string) {
    return ActivityLog.countDocuments({ category });
  }

  static async create(args: any) {
    return ActivityLog.create(args);
  }
}

