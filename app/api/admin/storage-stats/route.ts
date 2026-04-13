import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { getStorageConfig } from "@/lib/storage"
import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  storageStatsResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema } from "@/lib/validations/auth"

const getStorageStats = createApiRoute({
  method: 'GET',
  path: '/api/admin/storage-stats',
  summary: 'Get storage usage statistics',
  description: 'Get storage usage statistics from the active storage provider (Cloudinary or R2)',
  tags: ['Admin'],
  security: 'adminAuth',
  responses: {
    200: storageStatsResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    await connectDB()
    const rawSettings = await StorageSettings.findOne({ isActive: true }).lean()

    if (!rawSettings) {
      return { 
        status: 200,
        data: { 
          provider: null,
          stats: null,
          error: null,
        }
      }
    }

    const config = await getStorageConfig()
    
    if (!config) {
      return { 
        status: 200,
        data: { 
          provider: rawSettings.provider,
          stats: null,
          error: "Failed to read storage credentials. Please re-save your API secret in Storage Settings.",
        }
      }
    }

    let stats = null
    let error: string | null = null

    if (config.provider === "cloudinary" && config.cloudinary) {
      if (!config.cloudinary.apiSecret) {
        return {
          status: 200,
          data: {
            provider: "cloudinary",
            stats: null,
            error: "Cloudinary API secret could not be decrypted. Please re-save your credentials.",
          }
        }
      }

      try {
        const cloudinary = await import("cloudinary")
        cloudinary.v2.config({
          cloud_name: config.cloudinary.cloudName,
          api_key: config.cloudinary.apiKey,
          api_secret: config.cloudinary.apiSecret,
        })
        
        const usage = await cloudinary.v2.api.usage()

        function bytesToMB(bytes: number | undefined | null): number {
          return bytes ? bytes / (1024 * 1024) : 0
        }
        function bytesToMBOrNull(bytes: number | undefined | null): number | null {
          return bytes ? bytes / (1024 * 1024) : null
        }

        const storageMB = bytesToMB(usage.storage?.usage)
        const storageLimitMB = bytesToMBOrNull(usage.storage?.limit)
        const bandwidthMB = bytesToMB(usage.bandwidth?.usage)
        const bandwidthLimitMB = bytesToMBOrNull(usage.bandwidth?.limit)

        stats = {
          plan: usage.plan || null,
          storageUsedMB: storageMB,
          storageLimitMB: storageLimitMB,
          storageCredits: usage.storage?.credits_usage ?? null,
          assets: usage.resources || 0,
          bandwidth: bandwidthMB,
          bandwidthLimit: bandwidthLimitMB,
          bandwidthCredits: usage.bandwidth?.credits_usage ?? null,
          transformations: usage.transformations?.usage || 0,
          transformationsLimit: usage.transformations?.limit || null,
          transformationsCredits: usage.transformations?.credits_usage ?? null,
          credits: usage.credits?.usage ?? null,
          creditsLimit: usage.credits?.limit ?? null,
          creditsUsedPercent: usage.credits?.used_percent ?? null,
          images: usage.resources_by_type?.image || 0,
          videos: usage.resources_by_type?.video || 0,
          derivedResources: usage.derived_resources || 0,
          lastSync: new Date(),
        }
      } catch (err: any) {
        console.error("Failed to fetch Cloudinary stats:", err)
        const msg = err?.error?.message || err?.message || "Unknown error"
        error = `Failed to fetch Cloudinary stats: ${msg}. Please verify your credentials.`
      }
    } else if (config.provider === "r2" && config.r2) {
      if (!config.r2.secretAccessKey) {
        return {
          status: 200,
          data: {
            provider: "r2",
            stats: null,
            error: "R2 secret access key could not be decrypted. Please re-save your credentials.",
          }
        }
      }

      try {
        const { S3Client, ListObjectsV2Command, HeadBucketCommand } = await import("@aws-sdk/client-s3")
        
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.r2.accessKeyId,
            secretAccessKey: config.r2.secretAccessKey,
          },
        })

        let totalSize = 0
        let totalObjects = 0
        let imageCount = 0
        let imageSize = 0
        let videoCount = 0
        let videoSize = 0
        let otherCount = 0
        let otherSize = 0
        let oldestDate: Date | null = null
        let newestDate: Date | null = null
        let largestFileSize = 0
        let largestFileName = ""
        let smallestFileSize = Infinity
        const folders = new Set<string>()
        const extensions = new Map<string, { count: number; size: number }>()
        let continuationToken: string | undefined

        do {
          const response = await s3Client.send(
            new ListObjectsV2Command({
              Bucket: config.r2.bucketName,
              ContinuationToken: continuationToken,
            })
          )

          response.Contents?.forEach((obj) => {
            const size = obj.Size ?? 0
            totalSize += size
            totalObjects++

            if (size > largestFileSize) {
              largestFileSize = size
              largestFileName = obj.Key || ""
            }
            if (size < smallestFileSize) {
              smallestFileSize = size
            }

            if (obj.LastModified) {
              if (!oldestDate || obj.LastModified < oldestDate) oldestDate = obj.LastModified
              if (!newestDate || obj.LastModified > newestDate) newestDate = obj.LastModified
            }

            const key = obj.Key || ""
            const folder = key.includes("/") ? key.substring(0, key.lastIndexOf("/")) : "(root)"
            folders.add(folder)

            const ext = key.includes(".") ? key.substring(key.lastIndexOf(".") + 1).toLowerCase() : "no-ext"
            const extEntry = extensions.get(ext) || { count: 0, size: 0 }
            extEntry.count++
            extEntry.size += size
            extensions.set(ext, extEntry)

            const lowerKey = key.toLowerCase()
            if (lowerKey.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif|heic)$/)) {
              imageCount++
              imageSize += size
            } else if (lowerKey.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv|m4v)$/)) {
              videoCount++
              videoSize += size
            } else {
              otherCount++
              otherSize += size
            }
          })

          continuationToken = response.NextContinuationToken
        } while (continuationToken)

        if (totalObjects === 0) smallestFileSize = 0

        const topExtensions = [...extensions.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([ext, data]) => ({ ext, count: data.count, sizeMB: data.size / (1024 * 1024) }))

        stats = {
          storageUsedMB: totalSize / (1024 * 1024),
          storageLimitMB: null,
          assets: totalObjects,
          images: imageCount,
          imageSizeMB: imageSize / (1024 * 1024),
          videos: videoCount,
          videoSizeMB: videoSize / (1024 * 1024),
          other: otherCount,
          otherSizeMB: otherSize / (1024 * 1024),
          bandwidth: null,
          bandwidthLimit: null,
          avgFileSizeKB: totalObjects > 0 ? (totalSize / totalObjects) / 1024 : 0,
          largestFileSizeKB: largestFileSize / 1024,
          largestFileName,
          smallestFileSizeKB: smallestFileSize / 1024,
          folderCount: folders.size,
          folders: [...folders].slice(0, 20),
          topExtensions,
          oldestFile: oldestDate?.toISOString() || null,
          newestFile: newestDate?.toISOString() || null,
          bucketName: config.r2.bucketName,
          lastSync: new Date(),
        }
      } catch (err: any) {
        console.error("Failed to fetch R2 stats:", err)
        error = `Failed to fetch R2 stats: ${err?.message || "Unknown error"}. Please verify your credentials.`
      }
    }

    return {
      status: 200,
      data: {
        provider: config.provider,
        stats,
        error,
      }
    }
  }
})

export const GET = getStorageStats
