import mongoose, { Schema, Document, Model } from "mongoose";

export type QuotaRequestType = "storage" | "email";
export type QuotaRequestStatus = "pending" | "approved" | "denied";

export interface IQuotaRequest extends Document {
  orgId: mongoose.Types.ObjectId; // ref: Employer, required, indexed
  requestType: QuotaRequestType;
  currentQuota: number; // in bytes (storage) or count (email)
  requestedQuota: number; // what the admin is asking for
  requestNote?: string; // optional note from admin
  status: QuotaRequestStatus; // default: 'pending'
  reviewedBy?: mongoose.Types.ObjectId; // ref: User (superadmin who reviewed)
  reviewedAt?: Date;
  reviewNote?: string; // optional note from superadmin
  createdAt: Date;
  updatedAt: Date;
}

const QuotaRequestSchema = new Schema<IQuotaRequest>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    requestType: { type: String, enum: ["storage", "email"], required: true },
    currentQuota: { type: Number, required: true },
    requestedQuota: { type: Number, required: true },
    requestNote: { type: String },
    status: { type: String, enum: ["pending", "approved", "denied"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

const QuotaRequest: Model<IQuotaRequest> =
  mongoose.models.QuotaRequest || mongoose.model<IQuotaRequest>("QuotaRequest", QuotaRequestSchema);

export default QuotaRequest;
