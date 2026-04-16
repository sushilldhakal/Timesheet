import { AdminActivityLogsRepo } from "@/lib/db/queries/admin-activity-logs";
import { connectDB } from "@/lib/db";

export class ActivityLogsService {
  async list(query: any) {
    await connectDB();
    const { category = "storage", limit = 10, page = 1 } = query || {};
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AdminActivityLogsRepo.listLean({ category, skip, limit }),
      AdminActivityLogsRepo.count(category),
    ]);

    const hasMore = skip + (logs as any[]).length < total;
    return {
      logs: (logs as any[]).map((log) => ({
        ...log,
        _id: (log as any)._id.toString(),
        createdAt: (log as any).createdAt.toISOString(),
        updatedAt: (log as any).updatedAt.toISOString(),
      })),
      hasMore,
      total,
      page,
    };
  }

  async create(auth: any, body: any) {
    await connectDB();
    const { action, details, status, category = "storage" } = body;
    const log = await AdminActivityLogsRepo.create({
      action,
      details,
      status,
      userId: auth.sub,
      category,
    });

    return {
      log: {
        ...log.toObject(),
        _id: log._id.toString(),
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      },
    };
  }
}

export const activityLogsService = new ActivityLogsService();

