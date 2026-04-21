import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrgEmailUsage extends Document {
  orgId: mongoose.Types.ObjectId; // ref: Employer, required, unique index
  sentCount: number; // default: 0
  quotaMonthly: number; // default: from SystemSettings.defaultEmailQuotaMonthly
  periodStart: Date; // start of current month window
  createdAt: Date;
  updatedAt: Date;
}

const OrgEmailUsageSchema = new Schema<IOrgEmailUsage>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Employer", required: true, unique: true, index: true },
    sentCount: { type: Number, default: 0 },
    quotaMonthly: { type: Number, required: true },
    periodStart: { type: Date, required: true },
  },
  { timestamps: true }
);

const OrgEmailUsage: Model<IOrgEmailUsage> =
  mongoose.models.OrgEmailUsage || mongoose.model<IOrgEmailUsage>("OrgEmailUsage", OrgEmailUsageSchema);

export default OrgEmailUsage;
