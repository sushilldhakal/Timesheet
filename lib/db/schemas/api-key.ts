import mongoose from "mongoose"

export type ApiScope =
  | "employees:read"
  | "employees:write"
  | "shifts:read"
  | "shifts:write"
  | "timesheets:read"
  | "rosters:read"
  | "payroll:read"
  | "webhooks:manage"

export interface IApiKey {
  tenantId: mongoose.Types.ObjectId
  name: string
  keyHash: string
  keyPrefix: string
  scopes: ApiScope[]
  isActive: boolean
  createdBy: mongoose.Types.ObjectId
  lastUsedAt?: Date
  expiresAt?: Date
  rateLimit: number
  createdAt?: Date
  updatedAt?: Date
}

export interface IApiKeyDocument extends IApiKey, mongoose.Document {}

const apiKeySchema = new mongoose.Schema<IApiKeyDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      enum: [
        "employees:read",
        "employees:write",
        "shifts:read",
        "shifts:write",
        "timesheets:read",
        "rosters:read",
        "payroll:read",
        "webhooks:manage",
      ],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    rateLimit: {
      type: Number,
      default: 60,
      min: 1,
    },
  },
  {
    timestamps: true,
    collection: "api_keys",
  }
)

apiKeySchema.index({ tenantId: 1, isActive: 1 })
// keyHash unique index is already defined inline above

export const ApiKey =
  (mongoose.models.ApiKey as mongoose.Model<IApiKeyDocument>) ??
  mongoose.model<IApiKeyDocument>("ApiKey", apiKeySchema)
