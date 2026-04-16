import { StorageSettingsDbQueries } from "@/lib/db/queries/storage-settings"

export const AdminStorageSettingsRepo = {
  async findActiveLean() {
    return StorageSettingsDbQueries.findActiveLean()
  },

  async findActive() {
    return StorageSettingsDbQueries.findActive()
  },

  async deactivateAllActive() {
    return StorageSettingsDbQueries.deactivateAllActive()
  },

  async create(data: any) {
    return StorageSettingsDbQueries.create(data)
  },

  async deleteActive() {
    return StorageSettingsDbQueries.deleteActive()
  },

  async deleteAll() {
    return StorageSettingsDbQueries.deleteAll()
  },
}

