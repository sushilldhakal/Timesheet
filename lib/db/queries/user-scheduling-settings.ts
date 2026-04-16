import { User } from '@/lib/db/schemas/user';

export class UserSchedulingSettingsDbQueries {
  static async getSchedulingSettingsLean(userId: string) {
    return User.findById(userId).select('schedulingSettings').lean();
  }

  static async updateSchedulingSettings(userId: string, next: any) {
    return User.updateOne({ _id: userId }, { $set: { schedulingSettings: next } });
  }
}

