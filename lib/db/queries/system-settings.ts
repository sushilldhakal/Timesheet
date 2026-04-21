import SystemSettings, { ISystemSettings } from "../schemas/system-settings";

export class SystemSettingsRepo {
  static async findOne(): Promise<ISystemSettings | null> {
    return SystemSettings.findOne().lean() as any;
  }

  static async upsert(update: Partial<ISystemSettings>): Promise<ISystemSettings> {
    const result = await SystemSettings.findOneAndUpdate(
      {}, // No filter - singleton document
      { $set: update },
      { new: true, upsert: true, lean: true }
    );
    return result! as any;
  }

  static async create(data: Partial<ISystemSettings>): Promise<ISystemSettings> {
    const settings = new SystemSettings(data);
    return settings.save();
  }

  static async updateOne(update: Partial<ISystemSettings>): Promise<ISystemSettings | null> {
    return SystemSettings.findOneAndUpdate({}, { $set: update }, { new: true }).lean() as any;
  }
}
