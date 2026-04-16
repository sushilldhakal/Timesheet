import { MailSettingsDbQueries } from "@/lib/db/queries/mail-settings"

export const AdminMailSettingsRepo = {
  async get() {
    return MailSettingsDbQueries.findOne()
  },

  async upsert(update: any) {
    return MailSettingsDbQueries.upsert(update)
  },
}

