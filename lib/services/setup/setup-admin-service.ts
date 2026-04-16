import { connectDB } from "@/lib/db";
import { setAdminExistsCache } from "@/lib/db/setup";
import { SetupAdminDbQueries } from "@/lib/db/queries/setup-admin";

export class SetupAdminService {
  async createAdmin(body: any) {
    const { username, password } = body;
    await connectDB();

    const existing = await SetupAdminDbQueries.findByUsername(username.toLowerCase());
    if (existing) return { status: 409, data: { success: false, error: "Username already exists" } };

    const now = Math.floor(Date.now() / 1000);
    await SetupAdminDbQueries.createAdmin({
      usernameLower: username.toLowerCase(),
      password,
      createdAt: now,
      updatedAt: now,
    });

    setAdminExistsCache(true);
    return { status: 200, data: { success: true } };
  }
}

export const setupAdminService = new SetupAdminService();

