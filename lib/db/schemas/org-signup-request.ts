import mongoose, { Schema, Document, Model } from "mongoose";
import type { EmployerPlan } from "./employer";

export type CompanySize = "1-10" | "11-50" | "51-200" | "200+";
export type OrgSignupRequestStatus = "pending" | "approved" | "rejected";

export interface IOrgSignupRequest extends Document {
  orgName: string; // required, indexed
  contactName: string; // required
  email: string; // required, indexed
  phone?: string;
  companySize?: CompanySize;
  planInterest?: EmployerPlan; // free|starter|pro|enterprise
  message?: string;
  timezone?: string; // default 'Australia/Sydney'
  status: OrgSignupRequestStatus; // default: 'pending', indexed
  reviewedBy?: mongoose.Types.ObjectId; // ref: User (superadmin)
  reviewedAt?: Date;
  reviewNote?: string;
  createdEmployerId?: mongoose.Types.ObjectId; // set on approval
  createdUserId?: mongoose.Types.ObjectId; // set on approval
  createdAt: Date;
  updatedAt: Date;
}

const OrgSignupRequestSchema = new Schema<IOrgSignupRequest>(
  {
    orgName: { type: String, required: true, trim: true, index: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    companySize: { type: String, enum: ["1-10", "11-50", "51-200", "200+"] },
    planInterest: { type: String, enum: ["free", "starter", "pro", "enterprise"] },
    message: { type: String, trim: true },
    timezone: { type: String, default: "Australia/Sydney" },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending", 
      index: true 
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
    createdEmployerId: { type: Schema.Types.ObjectId, ref: "Employer" },
    createdUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "orgsignuprequests" }
);

// Compound index for checking duplicate approved requests
OrgSignupRequestSchema.index({ email: 1, status: 1 });

const OrgSignupRequest: Model<IOrgSignupRequest> =
  mongoose.models.OrgSignupRequest || 
  mongoose.model<IOrgSignupRequest>("OrgSignupRequest", OrgSignupRequestSchema);

export default OrgSignupRequest;
