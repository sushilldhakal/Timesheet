import { ActivityLogsDbQueries } from "@/lib/db/queries/activity-logs"

export const AdminActivityLogsRepo = {
  async listLean(args: { category: string; skip: number; limit: number }) {
    return ActivityLogsDbQueries.listLean(args)
  },

  async count(category: string) {
    return ActivityLogsDbQueries.count(category)
  },

  async create(args: any) {
    return ActivityLogsDbQueries.create(args)
  },
}

