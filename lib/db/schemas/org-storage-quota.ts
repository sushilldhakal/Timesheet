import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrgStorageQuota extends Document {
  orgId: mongoose.Types.ObjectId; // ref: Employer, required, unique index
  usedBytes: number; // default: 0
  quotaBytes: number; // default: from SystemSettings.defaultStorageQuotaBytes
  createdAt: Date;
  updatedAt: Date;
}

const OrgStorageQuotaSchema = new Schema<IOrgStorageQuota>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Employer", required: true, unique: true, index: true },
    usedBytes: { type: Number, default: 0 },
    quotaBytes: { type: Number, required: true },
  },
  { timestamps: true }
);

const OrgStorageQuota: Model<IOrgStorageQuota> =
  mongoose.models.OrgStorageQuota || mongoose.model<IOrgStorageQuota>("OrgStorageQuota", OrgStorageQuotaSchema);

export default OrgStorageQuota;
