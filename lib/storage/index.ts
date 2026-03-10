/**
 * Unified Storage Manager
 * Dynamically uses Cloudinary or Cloudflare R2 based on database settings
 */

import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"
import { decrypt } from "@/lib/utils/storage/encryption"

export type UploadResult = {
  url: string
  publicId: string
  provider: "cloudinary" | "r2"
}

export type StorageConfig = {
  provider: "cloudinary" | "r2"
  cloudinary?: {
    cloudName: string
    apiKey: string
    apiSecret: string
  }
  r2?: {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    publicUrl?: string
  }
}

/**
 * Get active storage configuration from database
 */
export async function getStorageConfig(): Promise<StorageConfig | null> {
  try {
    await connectDB()
    const settings = await StorageSettings.findOne({ isActive: true }).lean()
    
    if (!settings) {
      console.warn("No active storage settings found in database")
      return null
    }
    
    const config: StorageConfig = {
      provider: settings.provider,
    }
    
    if (settings.provider === "cloudinary") {
      if (!settings.cloudinaryCloudName || !settings.cloudinaryApiKey || !settings.cloudinaryApiSecret) {
        console.error("Cloudinary settings incomplete")
        return null
      }
      
      config.cloudinary = {
        cloudName: settings.cloudinaryCloudName,
        apiKey: settings.cloudinaryApiKey,
        apiSecret: decrypt(settings.cloudinaryApiSecret),
      }
    } else if (settings.provider === "r2") {
      if (!settings.r2AccountId || !settings.r2AccessKeyId || !settings.r2SecretAccessKey || !settings.r2BucketName) {
        console.error("R2 settings incomplete")
        return null
      }
      
      config.r2 = {
        accountId: settings.r2AccountId,
        accessKeyId: settings.r2AccessKeyId,
        secretAccessKey: decrypt(settings.r2SecretAccessKey),
        bucketName: settings.r2BucketName,
        publicUrl: settings.r2PublicUrl,
      }
    }
    
    return config
  } catch (error) {
    console.error("Failed to get storage config:", error)
    return null
  }
}

/**
 * Upload file to configured storage provider
 */
export async function uploadFile(
  file: Buffer | string,
  options?: {
    folder?: string
    filename?: string
  }
): Promise<UploadResult> {
  const config = await getStorageConfig()
  
  if (!config) {
    throw new Error("No storage configuration found. Please configure storage in Settings.")
  }
  
  if (config.provider === "cloudinary" && config.cloudinary) {
    const { uploadToCloudinary } = await import("./cloudinary")
    const result = await uploadToCloudinary(file, config.cloudinary, options)
    return {
      url: result.secure_url,
      publicId: result.public_id,
      provider: "cloudinary",
    }
  } else if (config.provider === "r2" && config.r2) {
    const { uploadToR2 } = await import("./r2")
    const result = await uploadToR2(file, config.r2, options)
    return {
      url: result.url,
      publicId: result.key,
      provider: "r2",
    }
  }
  
  throw new Error("Invalid storage configuration")
}

/**
 * Delete file from configured storage provider
 */
export async function deleteFile(publicId: string, provider?: "cloudinary" | "r2"): Promise<void> {
  const config = await getStorageConfig()
  
  if (!config) {
    throw new Error("No storage configuration found")
  }
  
  // Use provided provider or fall back to current config
  const targetProvider = provider || config.provider
  
  if (targetProvider === "cloudinary" && config.cloudinary) {
    const { deleteFromCloudinary } = await import("./cloudinary")
    await deleteFromCloudinary(publicId, config.cloudinary)
  } else if (targetProvider === "r2" && config.r2) {
    const { deleteFromR2 } = await import("./r2")
    await deleteFromR2(publicId, config.r2)
  }
}

/**
 * Delete files older than a given number of days
 */
export async function deleteFilesOlderThanDays(
  olderThanDays: number,
  folder?: string
): Promise<{ deleted: number; errors: number }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)
  const beforeDate = cutoff.toISOString().slice(0, 10)
  return deleteFilesOlderThanDate(beforeDate, folder)
}

/**
 * Delete files older than a specific date
 */
export async function deleteFilesOlderThanDate(
  beforeDate: string,
  folder?: string
): Promise<{ deleted: number; errors: number }> {
  const config = await getStorageConfig()
  
  if (!config) {
    throw new Error("No storage configuration found")
  }
  
  if (config.provider === "cloudinary" && config.cloudinary) {
    const { deleteImagesOlderThanDate } = await import("./cloudinary")
    return await deleteImagesOlderThanDate(beforeDate, config.cloudinary, folder)
  } else if (config.provider === "r2" && config.r2) {
    const { deleteFilesOlderThanDate: deleteR2Files } = await import("./r2")
    return await deleteR2Files(beforeDate, config.r2, folder)
  }
  
  return { deleted: 0, errors: 0 }
}
