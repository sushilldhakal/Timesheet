import { StorageSettings } from "@/lib/db/schemas/storage-settings";

export class StorageSettingsDbQueries {
  static async findActiveLean() {
    return StorageSettings.findOne({ isActive: true }).lean();
  }

  static async findActive() {
    return StorageSettings.findOne({ isActive: true });
  }

  static async deactivateAllActive() {
    return StorageSettings.updateMany({ isActive: true }, { $set: { isActive: false } });
  }

  static async create(data: any) {
    return StorageSettings.create(data);
  }

  static async deleteActive() {
    return StorageSettings.deleteMany({ isActive: true });
  }

  static async deleteAll() {
    return StorageSettings.deleteMany({});
  }
}

