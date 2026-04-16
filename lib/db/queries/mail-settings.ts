import mongoose from "mongoose";

function getMailSettingsModel() {
  const schema = new mongoose.Schema({
    type: { type: String, default: "mail" },
    fromEmail: String,
    fromName: String,
    apiKey: String,
    updatedAt: Date,
  });
  return (mongoose.models.MailSettings as any) || mongoose.model("MailSettings", schema);
}

export class MailSettingsDbQueries {
  static model() {
    return getMailSettingsModel();
  }

  static async findOne() {
    const MailSettings = getMailSettingsModel();
    return MailSettings.findOne({ type: "mail" });
  }

  static async upsert(update: any) {
    const MailSettings = getMailSettingsModel();
    return MailSettings.updateOne({ type: "mail" }, { $set: update }, { upsert: true });
  }
}

