import { deleteFilesOlderThanDate } from "@/lib/storage";
import { connectDB } from "@/lib/db";

export class CloudinaryCleanupService {
  async cleanup(beforeDate: string) {
    await connectDB();
    const { deleted, errors } = await deleteFilesOlderThanDate(beforeDate, "timesheet");
    return { deleted, errors };
  }
}

export const cloudinaryCleanupService = new CloudinaryCleanupService();

