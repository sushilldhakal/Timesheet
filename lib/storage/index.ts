/**
 * Centralized R2 Storage Manager
 * Uses system-wide R2 configuration with per-org quotas
 */

import { connectDB } from "@/lib/db"
import { SystemSettingsService } from "@/lib/services/superadmin/system-settings-service"
import { QuotaService } from "@/lib/services/superadmin/quota-service"
import { MediaFileRepo } from "@/lib/db/queries/media-file"
import { StorageQuotaExceededError } from "@/lib/errors/storage-quota-exceeded"
import { uploadToR2, deleteFromR2 } from "./r2"
import mongoose from "mongoose"

export type UploadResult = {
  url: string
  publicId: string
  provider: "r2"
}

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl?: string
}

/**
 * Sanitize filename for R2 key
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
}

/**
 * Upload file to R2 with quota check
 */
export async function uploadFile(
  file: Buffer | string,
  options: {
    orgId: string
    uploadedBy: string
    folder?: string
    filename?: string
    mimeType?: string
  }
): Promise<UploadResult> {
  await connectDB()
  
  // Get system settings
  const settings = await SystemSettingsService.getDecrypted()
  
  if (!settings?.r2AccountId || !settings?.r2AccessKeyId || !settings?.r2SecretAccessKey || !settings?.r2BucketName) {
    throw new Error("Storage not configured. Contact your administrator.")
  }
  
  // Calculate file size
  let fileSize: number
  let buffer: Buffer
  
  if (Buffer.isBuffer(file)) {
    buffer = file
    fileSize = file.length
  } else if (typeof file === "string") {
    if (file.startsWith("data:")) {
      const base64Data = file.split(",")[1]
      buffer = Buffer.from(base64Data, "base64")
    } else {
      buffer = Buffer.from(file, "base64")
    }
    fileSize = buffer.length
  } else {
    throw new Error("Invalid file format")
  }
  
  // Check quota
  const allowed = await QuotaService.checkStorageAllowed(options.orgId, fileSize)
  
  if (!allowed) {
    const quota = await QuotaService.getStorageQuota(options.orgId)
    throw new StorageQuotaExceededError(options.orgId, quota.quotaBytes)
  }
  
  // Build R2 key
  const sanitizedFilename = sanitizeFilename(options.filename || `${Date.now()}-file`)
  const r2Key = `org_${options.orgId}/files/${Date.now()}_${sanitizedFilename}`
  
  // Upload to R2
  const r2Config: R2Config = {
    accountId: settings.r2AccountId,
    accessKeyId: settings.r2AccessKeyId,
    secretAccessKey: settings.r2SecretAccessKey,
    bucketName: settings.r2BucketName,
    publicUrl: settings.r2PublicUrl,
  }
  
  const result = await uploadToR2(buffer, r2Config, { 
    folder: '', // We're using the full key path
    filename: r2Key 
  })
  
  // Insert MediaFile record
  await MediaFileRepo.create({
    orgId: new mongoose.Types.ObjectId(options.orgId),
    r2Key,
    originalName: options.filename || 'unknown',
    mimeType: options.mimeType || 'application/octet-stream',
    sizeBytes: fileSize,
    uploadedBy: new mongoose.Types.ObjectId(options.uploadedBy),
  })
  
  // Increment storage quota
  await QuotaService.incrementStorage(options.orgId, fileSize)
  
  return {
    url: result.url,
    publicId: r2Key,
    provider: "r2",
  }
}

/**
 * Delete file from R2 and update quota
 */
export async function deleteFile(r2Key: string, orgId: string): Promise<void> {
  await connectDB()
  
  // Get system settings
  const settings = await SystemSettingsService.getDecrypted()
  
  if (!settings?.r2AccountId || !settings?.r2AccessKeyId || !settings?.r2SecretAccessKey || !settings?.r2BucketName) {
    throw new Error("Storage not configured. Contact your administrator.")
  }
  
  // Find MediaFile record
  const mediaFile = await MediaFileRepo.findByR2Key(r2Key)
  
  if (!mediaFile) {
    console.warn(`MediaFile record not found for key: ${r2Key}`)
    return
  }
  
  // Delete from R2
  const r2Config: R2Config = {
    accountId: settings.r2AccountId,
    accessKeyId: settings.r2AccessKeyId,
    secretAccessKey: settings.r2SecretAccessKey,
    bucketName: settings.r2BucketName,
    publicUrl: settings.r2PublicUrl,
  }
  
  await deleteFromR2(r2Key, r2Config)
  
  // Delete MediaFile record
  await MediaFileRepo.deleteByR2Key(r2Key)
  
  // Decrement storage quota
  await QuotaService.decrementStorage(orgId, mediaFile.sizeBytes)
}

/**
 * Delete files before a specific date
 */
export async function deleteFilesBeforeDate(
  beforeDate: Date,
  orgId: string
): Promise<{ deletedCount: number; freedBytes: number }> {
  await connectDB()
  
  // Get system settings
  const settings = await SystemSettingsService.getDecrypted()
  
  if (!settings?.r2AccountId || !settings?.r2AccessKeyId || !settings?.r2SecretAccessKey || !settings?.r2BucketName) {
    throw new Error("Storage not configured. Contact your administrator.")
  }
  
  const r2Config: R2Config = {
    accountId: settings.r2AccountId,
    accessKeyId: settings.r2AccessKeyId,
    secretAccessKey: settings.r2SecretAccessKey,
    bucketName: settings.r2BucketName,
    publicUrl: settings.r2PublicUrl,
  }
  
  // Find all files before date
  const files = await MediaFileRepo.findBeforeDate(orgId, beforeDate)
  
  let deletedCount = 0
  let freedBytes = 0
  
  for (const file of files) {
    try {
      // Delete from R2
      await deleteFromR2(file.r2Key, r2Config)
      
      // Delete DB record
      await MediaFileRepo.deleteByR2Key(file.r2Key)
      
      deletedCount++
      freedBytes += file.sizeBytes
    } catch (error) {
      console.error(`Failed to delete file ${file.r2Key}:`, error)
    }
  }
  
  // Decrement storage quota
  if (freedBytes > 0) {
    await QuotaService.decrementStorage(orgId, freedBytes)
  }
  
  return { deletedCount, freedBytes }
}
