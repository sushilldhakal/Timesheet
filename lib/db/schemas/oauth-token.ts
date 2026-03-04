import mongoose from "mongoose"

/**
 * OAuth Token Interface
 * Stores OAuth 2 access tokens, refresh tokens, and permanent tokens (password flow)
 * Tokens are stored as SHA-256 hashes for security
 */
export interface IOAuthToken {
  tokenHash: string // SHA-256 hash of the token
  userId: string // Reference to User._id
  tenantId: string // Reference to Tenant._id
  type: "access" | "refresh" | "permanent"
  scopes: string[]
  expiresAt?: number // Unix timestamp (seconds), undefined for permanent/refresh tokens
  isRevoked: boolean
  createdAt: number // Unix timestamp (seconds)
  updatedAt: number // Unix timestamp (seconds)
}

export interface IOAuthTokenDocument extends IOAuthToken, mongoose.Document {}

const oauthTokenSchema = new mongoose.Schema<IOAuthTokenDocument>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["access", "refresh", "permanent"],
      required: true,
      index: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    expiresAt: {
      type: Number,
      required: false,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Number,
      required: true,
    },
    updatedAt: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false, // We manage timestamps manually as Unix seconds
    collection: "oauth_tokens",
  }
)

// Compound index for efficient token lookup
oauthTokenSchema.index({ tokenHash: 1, isRevoked: 1 })
oauthTokenSchema.index({ userId: 1, type: 1 })
oauthTokenSchema.index({ tenantId: 1, userId: 1 })

// Pre-save hook to set Unix timestamps
oauthTokenSchema.pre("save", function (next) {
  const now = Math.floor(Date.now() / 1000)
  if (this.isNew) {
    this.createdAt = now
  }
  this.updatedAt = now
  next()
})

export const OAuthToken =
  (mongoose.models.OAuthToken as mongoose.Model<IOAuthTokenDocument>) ??
  mongoose.model<IOAuthTokenDocument>("OAuthToken", oauthTokenSchema)
