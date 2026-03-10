import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { getStorageConfig } from "@/lib/storage"
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

    const config = await getStorageConfig()
    
    if (!config) {
      return { 
        status: 200,
        data: { 
          provider: null,
          stats: null 
        }
      }
    }

    let stats = null

    if (config.provider === "cloudinary" && config.cloudinary) {
      try {
        const cloudinary = await import("cloudinary")
        cloudinary.v2.config({
          cloud_name: config.cloudinary.cloudName,
          api_key: config.cloudinary.apiKey,
          api_secret: config.cloudinary.apiSecret,
        })
        
        const usage = await cloudinary.v2.api.usage()
        
        stats = {
          storageUsedMB: usage.storage?.used_mb || 0,
          storageLimitMB: usage.storage?.limit_mb || 0,
          assets: usage.resources || 0,
          bandwidth: usage.bandwidth?.used_mb || 0,
          bandwidthLimit: usage.bandwidth?.limit_mb || 0,
          transformations: usage.transformations?.usage || 0,
          transformationsLimit: usage.transformations?.limit || 0,
          images: usage.resources_by_type?.image || 0,
          videos: usage.resources_by_type?.video || 0,
          lastSync: new Date(),
        }
      } catch (error) {
        console.error("Failed to fetch Cloudinary stats:", error)
      }
    } else if (config.provider === "r2" && config.r2) {
      try {
        const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3")
        
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
        let videoCount = 0
        let otherCount = 0
        let continuationToken: string | undefined

        do {
          const response = await s3Client.send(
            new ListObjectsV2Command({
              Bucket: config.r2.bucketName,
              ContinuationToken: continuationToken,
            })
          )

          response.Contents?.forEach((obj) => {
            totalSize += obj.Size ?? 0
            totalObjects++
            
            // Categorize by file extension
            const key = obj.Key?.toLowerCase() || ""
            if (key.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/)) {
              imageCount++
            } else if (key.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/)) {
              videoCount++
            } else {
              otherCount++
            }
          })

          continuationToken = response.NextContinuationToken
        } while (continuationToken)

        stats = {
          storageUsedMB: (totalSize / 1024 / 1024),
          storageLimitMB: null, // R2 doesn't have a fixed limit
          assets: totalObjects,
          images: imageCount,
          videos: videoCount,
          other: otherCount,
          bandwidth: null, // R2 doesn't provide bandwidth in API
          bandwidthLimit: null,
          lastSync: new Date(),
        }
      } catch (error) {
        console.error("Failed to fetch R2 stats:", error)
      }
    }

    return {
      status: 200,
      data: {
        provider: config.provider,
        stats,
      }
    }
  }
})

export const GET = getStorageStats
