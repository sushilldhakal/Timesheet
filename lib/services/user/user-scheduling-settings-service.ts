import { apiErrors } from '@/lib/api/api-error';
import { getAuthFromCookie } from '@/lib/auth/auth-helpers';
import type { IUserSchedulingSettings } from '@/lib/db/schemas/user';
import { connectDB } from '@/lib/db';
import { UserSchedulingSettingsDbQueries } from '@/lib/db/queries/user-scheduling-settings';

export class UserSchedulingSettingsService {
  async get() {
    await connectDB();
    const auth = await getAuthFromCookie();
    if (!auth) throw apiErrors.unauthorized();
    const user = await UserSchedulingSettingsDbQueries.getSchedulingSettingsLean(auth.sub);
    return { schedulingSettings: (user as any)?.schedulingSettings ?? null };
  }

  async update(body: any) {
    await connectDB();
    const auth = await getAuthFromCookie();
    if (!auth) throw apiErrors.unauthorized();
    if (!body) throw apiErrors.badRequest('Body required');

    const workingHours: IUserSchedulingSettings['workingHours'] = {};
    if (body.workingHours) {
      for (const [k, v] of Object.entries(body.workingHours)) {
        const n = Number(k);
        if (Number.isInteger(n) && n >= 0 && n <= 6) workingHours[n] = v as any;
      }
    }

    const next: IUserSchedulingSettings = {
      visibleFrom: body.visibleFrom,
      visibleTo: body.visibleTo,
      workingHours,
    };

    await UserSchedulingSettingsDbQueries.updateSchedulingSettings(auth.sub, next);
    return { schedulingSettings: next };
  }
}

export const userSchedulingSettingsService = new UserSchedulingSettingsService();

