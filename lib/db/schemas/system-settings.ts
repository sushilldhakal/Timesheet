import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSettings extends Document {
  // R2 Config
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string; // encrypted at rest
  r2BucketName?: string;
  r2PublicUrl?: string; // custom domain, e.g. https://files.yourdomain.com

  // Maileroo Config
  mailerooApiKey?: string; // encrypted at rest
  mailerooFromEmail?: string;
  mailerooFromName?: string;

  // Default quotas (applies to all new orgs)
  defaultStorageQuotaBytes: number; // default: 2147483648 (2GB)
  defaultEmailQuotaMonthly: number; // default: 500

  updatedBy?: mongoose.Types.ObjectId; // ref: User
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    // R2 Config
    r2AccountId: { type: String },
    r2AccessKeyId: { type: String },
    r2SecretAccessKey: { type: String }, // encrypted
    r2BucketName: { type: String },
    r2PublicUrl: { type: String },

    // Maileroo Config
    mailerooApiKey: { type: String }, // encrypted
    mailerooFromEmail: { type: String },
    mailerooFromName: { type: String },

    // Default quotas
    defaultStorageQuotaBytes: { type: Number, default: 2147483648 }, // 2GB
    defaultEmailQuotaMonthly: { type: Number, default: 500 },

    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings || mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);

export default SystemSettings;
