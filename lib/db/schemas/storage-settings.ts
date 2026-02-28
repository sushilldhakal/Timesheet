import mongoose from "mongoose"

/**
 * Storage Settings Schema
 * Stores encrypted cloud storage credentials (Cloudinary or Cloudflare R2)
 */
export interface IStorageSettings {
  provider: "cloudinary" | "r2"
  isActive: boolean
  
  // Cloudinary settings
  cloudinaryCloudName?: string
  cloudinaryApiKey?: string
  cloudinaryApiSecret?: string // Encrypted
  
  // Cloudflare R2 settings
  r2AccountId?: string
  r2AccessKeyId?: string
  r2SecretAccessKey?: string // Encrypted
  r2BucketName?: string
  r2PublicUrl?: string // Optional custom domain
  
  updatedBy?: mongoose.Types.ObjectId // ref: User
  createdAt?: Date
  updatedAt?: Date
}

export interface IStorageSettingsDocument extends IStorageSettings, mongoose.Document {}

const storageSettingsSchema = new mongoose.Schema<IStorageSettingsDocument>(
  {
    provider: {
      type: String,
      enum: ["cloudinary", "r2"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // Cloudinary
    cloudinaryCloudName: String,
    cloudinaryApiKey: String,
    cloudinaryApiSecret: String, // Encrypted
    
    // Cloudflare R2
    r2AccountId: String,
    r2AccessKeyId: String,
    r2SecretAccessKey: String, // Encrypted
    r2BucketName: String,
    r2PublicUrl: String,
    
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "storage_settings",
  }
)

// Only one active storage provider at a time
storageSettingsSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } })

export const StorageSettings =
  (mongoose.models.StorageSettings as mongoose.Model<IStorageSettingsDocument>) ??
  mongoose.model<IStorageSettingsDocument>("StorageSettings", storageSettingsSchema)
